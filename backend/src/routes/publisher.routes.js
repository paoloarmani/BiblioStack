import express from "express";
import { paginationMiddleware } from "../middleware/pagination.middleware.js";
import { publisherController } from "../controllers/publisher.controller.js";
import {verifyUser} from "../middleware/auth.middleware.js";
import {permit} from "../middleware/role.middleware.js";
import { validateParams } from "../middleware/validateParams.middleware.js";

// Formato dei parametri dell'URL (vedi schemas/params.schema.js)
const validateId = validateParams({ id: "smallint" });


const router = express.Router();

// GET /publishers/search?search=mondadori&page=1&limit=20
router.get("/search", paginationMiddleware, publisherController.search);

// GET /publishers?page=1&limit=20
router.get("/", paginationMiddleware, publisherController.getAll);

// GET /publishers/:id
router.get("/:id", validateId, publisherController.getById);


// POST /publishers
router.post("/", verifyUser, permit("admin"), publisherController.create);


// PATCH /publishers/:id
router.patch("/:id", verifyUser, permit("admin"), validateId, publisherController.update);


// DELETE /publishers/:id
router.delete("/:id", verifyUser, permit("admin"), validateId, publisherController.delete);

export default router;