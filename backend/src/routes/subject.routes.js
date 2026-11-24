import express from 'express';
import { paginationMiddleware } from "../middleware/pagination.middleware.js";
import { subjectController } from "../controllers/subject.controller.js";
import { verifyUser } from "../middleware/auth.middleware.js";
import { permit } from "../middleware/role.middleware.js";
import { validateParams } from "../middleware/validateParams.middleware.js";

// Formato dei parametri dell'URL (vedi schemas/params.schema.js)
const validateId = validateParams({ id: "int" });

const router = express.Router();

// GET /subjects?page=1&limit=20&search=urban
router.get("/", paginationMiddleware, subjectController.getAll);

// GET /subjects/search?search=urban&page=1&limit=20  -> { data, hasMore } (combobox)
router.get("/search", paginationMiddleware, subjectController.search);

// GET /subjects/:id
router.get("/:id", validateId, subjectController.getById);

// POST /subjects
router.post("/", verifyUser, permit("admin", "librarian"), subjectController.create);

// PATCH /subjects/:id
router.patch("/:id", verifyUser, permit("admin", "librarian"), validateId, subjectController.update);

// DELETE /subjects/:id
router.delete("/:id", verifyUser, permit("admin"), validateId, subjectController.delete);

export default router;
