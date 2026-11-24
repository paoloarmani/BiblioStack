import express from "express";
import { itemController } from "../controllers/item.controller.js";
import { verifyUser } from "../middleware/auth.middleware.js";
import { permit } from "../middleware/role.middleware.js";
import { paginationMiddleware } from "../middleware/pagination.middleware.js";
import { validateParams } from "../middleware/validateParams.middleware.js";

// Formato dei parametri dell'URL (vedi schemas/params.schema.js)
const validateId = validateParams({ id: "code" });

const router = express.Router();

// GET /items?page=1&limit=20
router.get("/", paginationMiddleware, itemController.getAll);

// GET /items/details/:id
router.get("/:id", validateId, itemController.getById);


// POST /items
router.post("/", verifyUser, permit("admin", "librarian"), itemController.create);


// PATCH /items/:id
router.patch("/:id", verifyUser, permit("admin", "librarian"), validateId, itemController.update);


// DELETE /items/:id
router.delete("/:id", verifyUser, permit("admin"), validateId, itemController.delete);

export default router;