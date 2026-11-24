import express from 'express';
import { paginationMiddleware } from "../middleware/pagination.middleware.js";
import { currencyController } from "../controllers/currency.controller.js";
import { validateParams } from "../middleware/validateParams.middleware.js";

// Formato dei parametri dell'URL (vedi schemas/params.schema.js)
const validateId = validateParams({ id: "currency" });

const router = express.Router();

// GET /currencies?page=1&limit=20
router.get("/", paginationMiddleware, currencyController.getAll);

// GET /currencies/:id
router.get("/:id", validateId, currencyController.getByCode);

export default router;