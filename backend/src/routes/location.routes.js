import express from "express";
import {paginationMiddleware} from "../middleware/pagination.middleware.js";
import {locationController} from "../controllers/location.controller.js";
import {verifyUser} from "../middleware/auth.middleware.js";
import {permit} from "../middleware/role.middleware.js";
import { validateParams } from "../middleware/validateParams.middleware.js";

// Formato dei parametri dell'URL (vedi schemas/params.schema.js)
const validateId = validateParams({ id: "int" });

const router = express.Router();

// GET /locations?page=1&limit=20
router.get("/", paginationMiddleware, locationController.getAll);

// GET /locations/:id
router.get("/:id", validateId, locationController.getById);


// POST /locations
router.post("/", verifyUser, permit("admin"), locationController.create);


// PATCH /locations/:id
router.patch("/:id", verifyUser, permit("admin"), validateId, locationController.update);


// DELETE /locations/:id
router.delete("/:id", verifyUser, permit("admin"), validateId, locationController.delete);

export default router;