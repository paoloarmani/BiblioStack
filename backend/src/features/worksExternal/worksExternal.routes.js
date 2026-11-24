import express from "express";
import { worksExternalController } from "./worksExternal.controller.js";
import {verifyUser} from "../../middleware/auth.middleware.js";
import {permit} from "../../middleware/role.middleware.js";
import { validateParams } from "../../middleware/validateParams.middleware.js";

// Formato dei parametri dell'URL (vedi schemas/params.schema.js)
const validateIsbn = validateParams({ isbn: "isbn" });

const router = express.Router();

// Recupero dati esterni di un'opera tramite ISBN
router.get("/isbn/:isbn", verifyUser, permit( "admin"), validateIsbn, worksExternalController.getByISBN);

export default router;