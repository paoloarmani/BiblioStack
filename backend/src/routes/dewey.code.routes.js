import express from 'express';
import {deweyCodeController} from "../controllers/dewey.code.controller.js";
import {paginationMiddleware} from "../middleware/pagination.middleware.js";
import {verifyUser} from "../middleware/auth.middleware.js";
import {permit} from "../middleware/role.middleware.js";
import { validateParams } from "../middleware/validateParams.middleware.js";

// Formato dei parametri dell'URL (vedi schemas/params.schema.js)
const validateCode = validateParams({ code: "dewey" });

const router = express.Router();

// GET /deweyCodes?page=1&limit=20
router.get('/', paginationMiddleware, deweyCodeController.getAll);

// GET /deweyCodes/:code
router.get('/:code', validateCode, deweyCodeController.getByCode);


// POST /deweyCodes
router.post('/', verifyUser, permit("admin"), deweyCodeController.create);


// PATCH /deweyCodes/:id
router.patch('/:code', verifyUser, permit("admin"), validateCode, deweyCodeController.update);


// DELETE /deweyCodes/:code
router.delete('/:code', verifyUser, permit("admin"), validateCode, deweyCodeController.delete);

export default router;
