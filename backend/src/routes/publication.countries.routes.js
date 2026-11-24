import express from 'express';
import { paginationMiddleware } from "../middleware/pagination.middleware.js";
import { publicationCountriesController } from "../controllers/publication.countries.controller.js";
import { validateParams } from "../middleware/validateParams.middleware.js";

// Formato dei parametri dell'URL (vedi schemas/params.schema.js)
const validateCountryCode = validateParams({ countryCode: "country" });


const router = express.Router();


// GET /publicationCountries?page=1&limit=20
router.get('/', paginationMiddleware, publicationCountriesController.getAll);

// GET /publicationCountries/:id
router.get('/:countryCode', validateCountryCode, publicationCountriesController.getByCountryCode);

export default router;