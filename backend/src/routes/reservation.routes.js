import express from "express"
import { reservationController } from "../controllers/reservation.controller.js";
import { paginationMiddleware } from "../middleware/pagination.middleware.js";
import { verifyUser } from "../middleware/auth.middleware.js";
import { permit } from "../middleware/role.middleware.js";
import { validateParams } from "../middleware/validateParams.middleware.js";

// Formato dei parametri dell'URL (vedi schemas/params.schema.js)
const validateId = validateParams({ id: "int" });

const router = express.Router();

// GET /reservations/search?search=
router.get("/search", paginationMiddleware, verifyUser, permit("librarian", "admin"), reservationController.search);

// GET /reservations/mine?search=
router.get("/mine", paginationMiddleware, verifyUser, reservationController.getMine);

// GET /reservations?page=1&limit=20
router.get("/", verifyUser, permit("librarian", "admin"), paginationMiddleware, reservationController.getAll);

// GET /reservations/:id
router.get("/:id", verifyUser, validateId, reservationController.getById);


// POST /reservations
router.post("/", verifyUser, reservationController.create);


// PATCH /reservations/:id  (body: status: "...")
router.patch("/:id", verifyUser, validateId, reservationController.update);


// DELETE /reservations/:id
router.delete("/:id", verifyUser, permit("admin"), validateId, reservationController.delete);

export default router;
