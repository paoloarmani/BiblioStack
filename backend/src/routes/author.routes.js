import express from "express";
import { authorController } from "../controllers/author.controller.js";
import { verifyUser } from "../middleware/auth.middleware.js";
import { permit } from "../middleware/role.middleware.js";
import { paginationMiddleware } from "../middleware/pagination.middleware.js";
import { validateParams } from "../middleware/validateParams.middleware.js";

// Formato dei parametri dell'URL (vedi schemas/params.schema.js)
const validateId = validateParams({ id: "int" });

const router = express.Router();

// GET /authors?page=1&limit=20
router.get("/", paginationMiddleware, authorController.getAll);

// GET /authors/search?search=...?page=1&limit=20
router.get("/search", authorController.getByName);

// GET /authors/:id
router.get("/:id", validateId, authorController.getById);


// POST /authors
router.post("/", verifyUser, permit("admin"), authorController.create);


// PATCH /authors/:id
router.patch("/:id", verifyUser, permit("admin"), validateId, authorController.update);


// DELETE /authors/:id
router.delete("/:id", verifyUser, permit("admin"), validateId, authorController.delete);

export default router;