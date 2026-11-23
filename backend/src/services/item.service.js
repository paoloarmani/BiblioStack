import { itemRepository } from "../repositories/item.repository.js";
import { AppError } from "../utils/appError.js";
import { getConstraint, isForeignKeyViolation, isUniqueViolation } from "../utils/db.util.js";

// Traduce le violazioni di unicità (id copia o collocazione già usati) in errori 409 leggibili dal frontend
const rethrowUniqueViolation = (error) => {
    if (isUniqueViolation(error)) {
        const constraint = getConstraint(error);
        if (constraint === "items_pkey") {
            throw new AppError("Item id already in use", "ITEM_ID_TAKEN", 409);
        }
        if (constraint === "items_shelf_mark_key") {
            throw new AppError("Shelf mark already assigned to another item", "SHELF_MARK_TAKEN", 409);
        }
    }
    throw error;
};

const findUniqueOrThrow = async (id) => {
    const item = await itemRepository.findById(id);
    if (!item) throw new AppError("Item not found", "NOT_FOUND", 404);
    return item;
};

export const itemService = {

    getAll: async ({ page, limit }) =>
        await itemRepository.findAll({ page, limit }),

    getById: async (id) =>
        await findUniqueOrThrow(id),

    create: async (data) => {
        try {
            const [item] = await itemRepository.create(data);
            return item;
        } catch (error) {
            rethrowUniqueViolation(error);
        }
    },

    update: async (id, data) => {
        await findUniqueOrThrow(id);
        try {
            const [updatedItem] = await itemRepository.update(id, data);
            return updatedItem;
        } catch (error) {
            rethrowUniqueViolation(error);
        }
    },

    delete: async (id) => {
        await findUniqueOrThrow(id);

        try {
            await itemRepository.delete(id);
        } catch (error) {
            // Faccio il catch dell'eccezione generata dal db o da drizzle per violazione di integrità referenziale
            if (
                isForeignKeyViolation(error) &&
                getConstraint(error) === "loans_item_id_fkey"
            ) {
                throw new AppError(
                    "Cannot delete item because it has dependencies",
                    "ITEM_HAS_DIPENDENCIES",
                    409
                );
            }
            throw error;
        }
        return { message: "Item has been successfully deleted" };
    }
};