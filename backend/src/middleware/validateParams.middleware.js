import { AppError } from "../utils/appError.js";
import { ParamSchemas } from "../schemas/params.schema.js";

/**
 * Valida i parametri dell'URL prima che arrivino a controller e database.
 * Uso: validateParams({ id: "int" }), validateParams({ code: "dewey" }), ...
 * I tipi disponibili sono le chiavi di ParamSchemas. I valori validati (es. id convertiti in numero)
 * sostituiscono quelli originali in req.params. Un parametro non valido risponde 400 senza toccare il DB.
 */
export const validateParams = (spec) => {
    const entries = Object.entries(spec).map(([name, type]) => {
        const schema = ParamSchemas[type];
        if (!schema) throw new Error(`validateParams: tipo sconosciuto "${type}" per il parametro "${name}"`);
        return [name, schema];
    });

    return (req, res, next) => {
        for (const [name, schema] of entries) {
            const result = schema.safeParse(req.params[name]);
            if (!result.success) {
                return next(new AppError(`Invalid ${name} parameter`, "BAD_REQUEST", 400));
            }
            req.params[name] = result.data;
        }
        next();
    };
};

