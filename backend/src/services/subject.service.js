import { AppError } from "../utils/appError.js";
import { subjectRepository } from "../repositories/subject.repository.js";
import { isUniqueViolation } from "../utils/db.util.js";

// Funzione per verificare l'esistenza di un soggetto, usata in getById, update e delete
const findUniqueOrThrow = async (id) => {
    const subject = await subjectRepository.findById(id);
    if (!subject) {
        throw new AppError("Subject not found", "NOT_FOUND", 404);
    }
    return subject;
};

// Nome già presente -> 409 invece di 500
const rethrowDuplicate = (error) => {
    if (isUniqueViolation(error)) {
        throw new AppError("Subject already exists", "SUBJECT_ALREADY_EXISTS", 409);
    }
    throw error;
};

export const subjectService = {
    getAll: async ({ page, limit, search }) =>
        await subjectRepository.findAll({ page, limit, search }),

    search: async (params) =>
        await subjectRepository.search(params),

    getById: async (id) =>
        await findUniqueOrThrow(id),

    create: async (data) => {
        try {
            const [newSubject] = await subjectRepository.create(data);
            return newSubject;
        } catch (error) {
            rethrowDuplicate(error);
        }
    },

    update: async (id, data) => {
        await findUniqueOrThrow(id);
        try {
            const [updatedSubject] = await subjectRepository.update(id, data);
            return updatedSubject;
        } catch (error) {
            rethrowDuplicate(error);
        }
    },

    delete: async (id) => {
        await findUniqueOrThrow(id);
        await subjectRepository.delete(id);
        return { message: "Subject has been successfully deleted" };
    }
};
