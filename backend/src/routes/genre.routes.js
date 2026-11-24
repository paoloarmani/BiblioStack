import express from 'express';
import { paginationMiddleware } from "../middleware/pagination.middleware.js";
import { genreController } from "../controllers/genre.controller.js";
import {verifyUser} from "../middleware/auth.middleware.js";
import {permit} from "../middleware/role.middleware.js";
import { validateParams } from "../middleware/validateParams.middleware.js";

// Formato dei parametri dell'URL (vedi schemas/params.schema.js)
const validateId = validateParams({ id: "smallint" });

const router = express.Router();

// GET /genres?page=1&limit=20
router.get("/", paginationMiddleware, genreController.getAll);

// GET /genres/:id
router.get("/:id", validateId, genreController.getById);


// POST /genres
router.post("/", verifyUser, permit("admin"), genreController.create);


// PATCH /genres/:id
router.patch("/:id", verifyUser, permit("admin"), validateId, genreController.update);


// DELETE /genres/:id
router.delete("/:id", verifyUser, permit("admin"), validateId, genreController.delete);

export default router;