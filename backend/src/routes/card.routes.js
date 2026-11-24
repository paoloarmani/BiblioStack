import express from "express";
import { cardController } from "../controllers/card.controller.js";
import { verifyUser } from "../middleware/auth.middleware.js";
import { permit } from "../middleware/role.middleware.js";
import { validateParams } from "../middleware/validateParams.middleware.js";

// Formato dei parametri dell'URL (vedi schemas/params.schema.js)
const validateId = validateParams({ id: "int" });

const router = express.Router();

// GET /cards/me
router.get("/me", verifyUser, cardController.getMyCard);

// POST /cards/me/renew
router.post("/me/renew", verifyUser, cardController.renewPersonalCard)

// POST /cards/verify
router.post("/verify", verifyUser, permit("librarian", "admin"), cardController.verify);

// POST /cards/:id/renew
router.post("/:id/renew", verifyUser, permit("admin"), validateId, cardController.renew);

export default router;