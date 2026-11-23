import express from 'express';
import { paginationMiddleware } from "../middleware/pagination.middleware.js";
import { subjectController } from "../controllers/subject.controller.js";
import { verifyUser } from "../middleware/auth.middleware.js";
import { permit } from "../middleware/role.middleware.js";

const router = express.Router();

// GET /subjects?page=1&limit=20&search=urban
router.get("/", paginationMiddleware, subjectController.getAll);

// GET /subjects/search?search=urban&page=1&limit=20  -> { data, hasMore } (combobox)
router.get("/search", paginationMiddleware, subjectController.search);

// GET /subjects/:id
router.get("/:id", subjectController.getById);

// POST /subjects
router.post("/", verifyUser, permit("admin", "librarian"), subjectController.create);

// PATCH /subjects/:id
router.patch("/:id", verifyUser, permit("admin", "librarian"), subjectController.update);

// DELETE /subjects/:id
router.delete("/:id", verifyUser, permit("admin"), subjectController.delete);

export default router;
