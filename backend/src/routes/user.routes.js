import express from "express";
import { userController } from "../controllers/user.controller.js";
import { verifyUser } from "../middleware/auth.middleware.js";
import { permit } from "../middleware/role.middleware.js";
import { paginationMiddleware } from "../middleware/pagination.middleware.js";
import { validateParams } from "../middleware/validateParams.middleware.js";

// Formato dei parametri dell'URL (vedi schemas/params.schema.js)
const validateId = validateParams({ id: "int" });

const router = express.Router();


// GET /users/search?name=marco?page=1&limit=20
// Lo staff cerca gli utenti a cui prestare un libro
router.get("/search", paginationMiddleware, verifyUser, permit("admin", "librarian"), userController.search);

// GET /users/me/dashboard -> Serve per visualizzare la dashboard personale
router.get("/me/dashboard", verifyUser, userController.getMyDashboard);

// GET /users/:id/dashboard -> Serve per visualizzare la dashboard di un utente da admin @todo Da fixare
router.get("/:id/dashboard", verifyUser, permit("admin"), validateId, userController.getUserProfileData);

// GET /users?page=1&limit=20
router.get("/", paginationMiddleware,verifyUser, permit( "admin"), userController.getAll);

// GET /users/:id
// Lettura del singolo utente anche per il bibliotecario (verifica della tessera nel dialog prestiti)
router.get("/:id", verifyUser, permit("admin", "librarian"), validateId, userController.getById);


//POST /users
router.post("/", verifyUser, permit("admin"), userController.create);


// PATCH /users/:id
router.patch("/:id", verifyUser, permit("admin"), validateId, userController.update);

// PATCH /users/:id/role
router.patch("/:id/role", verifyUser, permit( "admin"), validateId, userController.setUserRole);

// PATCH /users/:id/soft-delete
router.patch("/:id/soft-delete", verifyUser, permit("admin"), validateId, userController.softDelete);

// DELETE /users/:id
router.delete("/:id", verifyUser, permit("admin"), validateId, userController.delete);

export default router;