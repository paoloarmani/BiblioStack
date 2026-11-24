import express from 'express';
import { workController } from "../controllers/work.controller.js";
import { paginationMiddleware } from "../middleware/pagination.middleware.js";
import {tryAuthenticate, verifyUser} from "../middleware/auth.middleware.js";
import { permit } from "../middleware/role.middleware.js";
import { validateParams } from "../middleware/validateParams.middleware.js";

// Formato dei parametri dell'URL (vedi schemas/params.schema.js)
const validateIsbn = validateParams({ isbn: "isbn" });
const validateId = validateParams({ id: "code" });

const router = express.Router();

// GET /works/search?search=...?page=1&limit=20
router.get('/search', workController.search);

// GET /works/newest?limit=8
router.get('/newest', workController.getNewest);

// GET /works/mostLoaned?limit=8
router.get('/mostLoaned', workController.getMostLoaned);

// GET /works?page=1&limit=20
router.get('/', paginationMiddleware, workController.getAll);

// GET /works/:isbn
router.get("/lookup/:isbn", verifyUser, permit("admin"), validateIsbn, workController.lookup);

// GET /works/:id
router.get('/:id', tryAuthenticate, validateId, workController.getById);


// POST /works/from-external/:isbn
router.post("/from-external", verifyUser, permit( "admin"), workController.createFromExternal);

// POST /works/:isbn
router.post('/',verifyUser, permit( "admin"), workController.create);


// PATCH /works/:id
router.patch('/:id',verifyUser, permit( "admin"), validateId, workController.update);


// DELETE /works/:id
router.delete('/:id',verifyUser, permit( "admin"), validateId, workController.delete);

export default router;