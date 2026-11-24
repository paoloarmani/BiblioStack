import express from "express";
import { logger } from "../../config/logger.config.js";

/*
    Informazioni pubbliche della biblioteca (footer del sito), lette dalle variabili LIBRARY_*.
    Lette a runtime: per cambiare orari o contatti basta modificare docker/.env.prod e riavviare il backend.
*/
const env = (name) => process.env[name]?.trim() || null;

// Solo link http(s): un valore sbagliato in configurazione non deve diventare un link javascript:
const safeUrl = (name) => {
    const value = env(name);
    if (!value) return null;
    try {
        const url = new URL(value);
        if (url.protocol === "http:" || url.protocol === "https:") return url.href;
    } catch { /* gestito sotto */ }
    logger.warn({ name }, "Ignored invalid URL in configuration (only http/https)");
    return null;
};

const buildPublicConfig = () => ({
    library: {
        name:        env("LIBRARY_NAME") ?? "Biblioteca",
        institution: env("LIBRARY_INSTITUTION"),
        address:     env("LIBRARY_ADDRESS"),
        email:       env("LIBRARY_EMAIL"),
        phone:       env("LIBRARY_PHONE"),
        // Più righe separate da "|" (es. "Lun-Ven 8:00-13:00|Mar e Gio anche 14:00-16:00")
        hours:       (env("LIBRARY_HOURS") ?? "").split("|").map(s => s.trim()).filter(Boolean),
        websiteUrl:  safeUrl("LIBRARY_WEBSITE_URL"),
        privacyUrl:  safeUrl("LIBRARY_PRIVACY_URL"),
        rulesUrl:    safeUrl("LIBRARY_RULES_URL"),
    },
});

const publicConfig = buildPublicConfig();

const router = express.Router();

// GET /config/public
router.get("/public", (req, res) => {
    res.set("Cache-Control", "public, max-age=300");
    res.json(publicConfig);
});

export default router;
