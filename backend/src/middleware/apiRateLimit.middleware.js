import jwt from "jsonwebtoken";
import { redis } from "../redis/connection.js";
import { logger } from "../config/logger.config.js";

/*
    ===== LIMITE GENERALE SULLE API =====
    Finestra fissa di 60 secondi su Redis, condivisa da tutte le istanze del backend.
    - utente con sessione valida: contato per utente (API_RATE_LIMIT_USER, default 300/min)
    - anonimo: contato per IP (API_RATE_LIMIT_ANON, default 600/min). Soglia più alta perché a
      scuola molti studenti escono su Internet con lo stesso IP pubblico (NAT)
    I limiti specifici (tentativi di login, reset password, quota email) restano in vigore.
    Se Redis non risponde la richiesta passa (fail open, come il limite del login). 0 = disattivato.
*/
const WINDOW_SECONDS = 60;

const parseLimit = (name, fallback) => {
    const value = Number(process.env[name]?.trim() || fallback);
    return Number.isInteger(value) && value >= 0 ? value : fallback;
};
const USER_LIMIT = parseLimit("API_RATE_LIMIT_USER", 300);
const ANON_LIMIT = parseLimit("API_RATE_LIMIT_ANON", 600);

const INCREMENT_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
    redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return {count, redis.call('TTL', KEYS[1])}
`;

// Utente dal cookie di sessione, senza bloccare: un token scaduto o assente conta come anonimo
const userIdFromCookie = (req) => {
    const token = req.cookies?.accessToken;
    if (!token) return null;
    try {
        return jwt.verify(token, process.env.JWT_SECRET).userId ?? null;
    } catch {
        return null;
    }
};

export const apiRateLimit = async (req, res, next) => {
    const userId = userIdFromCookie(req);
    const limit = userId ? USER_LIMIT : ANON_LIMIT;
    if (!limit) return next();

    const key = userId ? `rl:api:user:${userId}` : `rl:api:ip:${req.ip}`;
    let count, ttl;
    try {
        [count, ttl] = (await redis.eval(INCREMENT_SCRIPT, {
            keys: [key],
            arguments: [String(WINDOW_SECONDS)],
        })).map(Number);
    } catch (err) {
        logger.warn({ err }, "API rate limit unavailable (Redis): request allowed");
        return next();
    }

    const reset = ttl > 0 ? ttl : WINDOW_SECONDS;
    res.set("RateLimit-Policy", `${limit};w=${WINDOW_SECONDS}`);
    res.set("RateLimit", `limit=${limit}, remaining=${Math.max(0, limit - count)}, reset=${reset}`);

    if (count > limit) {
        // Registro solo la prima richiesta oltre il limite, per non riempire i log
        if (count === limit + 1) {
            logger.warn({ userId, ip: userId ? undefined : req.ip, limit }, "API rate limit exceeded");
        }
        res.set("Retry-After", String(reset));
        return res.status(429).json({
            success: false,
            code: "RATE_LIMITED",
            message: "Too many requests, try again later",
            details: { retryAfter: reset },
        });
    }
    next();
};
