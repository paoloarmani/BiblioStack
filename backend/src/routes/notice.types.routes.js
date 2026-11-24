import express from 'express';
import { paginationMiddleware } from "../middleware/pagination.middleware.js";
import { noticeTypesController } from "../controllers/notice.types.controller.js";
import { validateParams } from "../middleware/validateParams.middleware.js";

// Formato dei parametri dell'URL (vedi schemas/params.schema.js)
const validateId = validateParams({ id: "smallint" });

const router = express.Router();

// GET /notice-types?page=1&limi=20
router.get("/", paginationMiddleware, noticeTypesController.getAll);

// GET /notice-types/:id
router.get("/:id", validateId, noticeTypesController.getById);

export default router;