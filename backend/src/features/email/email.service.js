import nodemailer from "nodemailer"
import { Resend } from "resend"
import { emailTemplates } from "./email.templates.js"
import { logger } from "../../config/logger.config.js"
import { redis } from "../../redis/connection.js"
import { AppError } from "../../utils/appError.js"

/*
    ===== TRASPORTO =====
    1. SMTP (consigliato in produzione): l'account di posta tecnico fornito dall'ente
       (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM).
    2. Resend: alternativa con RESEND_API_KEY (piano gratuito: 100 email/giorno, 3000/mese).
    3. Nessuno dei due: le email non partono; in sviluppo i link (reset, attivazione) finiscono nel log.
*/
const isProduction = process.env.NODE_ENV === "production"
const env = (name) => process.env[name]?.trim() || undefined

const smtpHost = env("SMTP_HOST")
const resendApiKey = env("RESEND_API_KEY")

const buildSmtpTransport = () => {
    const port = Number(env("SMTP_PORT") ?? 587)
    // 465 = TLS implicito; 587/25 = STARTTLS, reso obbligatorio così le credenziali non viaggiano mai in chiaro
    const secure = env("SMTP_SECURE") ? env("SMTP_SECURE") === "true" : port === 465
    const user = env("SMTP_USER")
    // SMTP_REQUIRE_TLS=false solo per relay interni senza cifratura (es. server di posta nella rete della scuola)
    const requireTLS = !secure && env("SMTP_REQUIRE_TLS") !== "false"
    if (!secure && !requireTLS) logger.warn({ host: smtpHost }, "SMTP without TLS: credentials and emails travel unencrypted")
    return nodemailer.createTransport({
        host: smtpHost,
        port,
        secure,
        requireTLS,
        auth: user ? { user, pass: process.env.SMTP_PASS ?? "" } : undefined,
        connectionTimeout: 15_000,
        greetingTimeout: 15_000,
        socketTimeout: 30_000,
    })
}

const transport = smtpHost
    ? { name: "smtp", client: buildSmtpTransport() }
    : resendApiKey
        ? { name: "resend", client: new Resend(resendApiKey) }
        : null

// Mittente: con SMTP di norma deve coincidere con l'account autenticato (o un alias autorizzato)
const FROM = env("EMAIL_FROM")
    ?? (transport?.name === "smtp" && env("SMTP_USER")
        ? `BiblioStack <${env("SMTP_USER")}>`
        : "BiblioStack <onboarding@resend.dev>")

if (!transport) {
    if (isProduction) logger.error("Email transport not configured: set SMTP_HOST (or RESEND_API_KEY)")
} else if (transport.name === "smtp") {
    // Verifica non bloccante: un errore di credenziali compare subito nei log invece che al primo invio
    transport.client.verify()
        .then(() => logger.info({ host: smtpHost, from: FROM }, "SMTP transport ready"))
        .catch((err) => logger.error({ err, host: smtpHost }, "SMTP transport verification failed"))
} else if (FROM.includes("@resend.dev")) {
    logger.warn("Resend test sender in use: emails are delivered only to the Resend account owner. Set EMAIL_FROM with a verified domain")
}

/*
    ===== TETTO GLOBALE SUGLI INVII =====
    Protegge la quota del servizio di posta indipendentemente dall'IP di chi provoca l'invio
    (i limiti per IP non bastano contro richieste distribuite). 0 = nessun limite.
*/
const DEFAULT_LIMITS = transport?.name === "resend"
    ? { daily: 90, monthly: 2900 }   // un po' sotto la quota gratuita di Resend
    : { daily: 500, monthly: 0 }      // prudente per un account SMTP istituzionale
const parseLimit = (name, fallback) => {
    const value = Number(env(name) ?? fallback)
    return Number.isInteger(value) && value >= 0 ? value : fallback
}
const DAILY_LIMIT = parseLimit("EMAIL_DAILY_LIMIT", DEFAULT_LIMITS.daily)
const MONTHLY_LIMIT = parseLimit("EMAIL_MONTHLY_LIMIT", DEFAULT_LIMITS.monthly)

// Incrementa entrambi i contatori in modo atomico e restituisce [giornaliero, mensile]
const INCREMENT_QUOTA_SCRIPT = `
local d = redis.call('INCR', KEYS[1])
if d == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
local m = redis.call('INCR', KEYS[2])
if m == 1 then redis.call('EXPIRE', KEYS[2], ARGV[2]) end
return {d, m}
`

const reserveQuota = async (type) => {
    if (!DAILY_LIMIT && !MONTHLY_LIMIT) return
    const now = new Date().toISOString() // giorno e mese in UTC, come le quote dei provider
    let daily, monthly
    try {
        [daily, monthly] = (await redis.eval(INCREMENT_QUOTA_SCRIPT, {
            keys: [`email:quota:day:${now.slice(0, 10)}`, `email:quota:month:${now.slice(0, 7)}`],
            arguments: [String(2 * 24 * 3600), String(32 * 24 * 3600)],
        })).map(Number)
    } catch (err) {
        // Fail open come il rate limiter del login: Redis giù non deve bloccare le email
        logger.warn({ err, type }, "Email quota check unavailable (Redis): sending anyway")
        return
    }

    const exceeded = (DAILY_LIMIT && daily > DAILY_LIMIT) || (MONTHLY_LIMIT && monthly > MONTHLY_LIMIT)
    if (exceeded) {
        logger.error({ type, daily, monthly, DAILY_LIMIT, MONTHLY_LIMIT }, "Email quota reached: email not sent")
        throw new AppError("Email sending limit reached, try again later", "EMAIL_QUOTA_EXCEEDED", 503)
    }
    if (DAILY_LIMIT && daily === Math.ceil(DAILY_LIMIT * 0.8)) {
        logger.warn({ daily, DAILY_LIMIT }, "Email daily quota at 80%")
    }
}

export const BASE_URL =
    process.env.FRONTEND_URL?.split(",")[0].trim() ?? "http://localhost:5173"

const send = async ({ to, subject, html, type, link }) => {
    if (!transport) {
        // In sviluppo (es. stack Docker locale) mostro il link nei log, così reset password e attivazione account restano testabili senza posta
        if (!isProduction && link) {
            logger.info({ type, to, link }, "Email skipped (no email transport configured): use this link")
            return
        }
        logger.debug({ type }, "Email skipped: no email transport configured")
        return
    }

    await reserveQuota(type)

    try {
        if (transport.name === "smtp") {
            await transport.client.sendMail({ from: FROM, to, subject, html })
        } else {
            const { error } = await transport.client.emails.send({ from: FROM, to, subject, html })
            if (error) throw Object.assign(new Error(error.message), { name: error.name })
        }
    } catch (error) {
        logger.error({ err: error, type, transport: transport.name }, "Failed to send email")
        throw error
    }
}

export const emailService = {

    sendPasswordReset: async ({ to, firstName, token }) => {
        const link = `${BASE_URL}/reset-password?token=${token}`

        const { subject, html } =
            emailTemplates.passwordReset({
                firstName,
                link
            })

        await send({
            to,
            subject,
            html,
            type: "password_reset",
            link
        })
    },

    sendAccountSetup: async ({ to, firstName, token }) => {
        const link = `${BASE_URL}/setup-account?token=${token}`

        const { subject, html } =
            emailTemplates.accountSetup({
                firstName,
                link
            })

        await send({
            to,
            subject,
            html,
            type: "account_setup",
            link
        })
    },

    // Usata dal notifier per gli eventi generici (prenotazioni, prestiti...)
    sendGeneric: async ({ to, subject, html }) => {
        await send({
            to,
            subject,
            html,
            type: "generic"
        })
    },
}
