import { subjectService } from "../services/subject.service.js";
import { SubjectBaseDTO, SubjectBaseListDTO } from "../dto/subject.dto.js";
import { CreateSubjectSchema, SubjectSearchSchema, UpdateSubjectSchema } from "../schemas/subject.schema.js";

export const subjectController = {
    getAll: async (req, res, next) => {
        try {
            const { search } = SubjectSearchSchema.parse(req.query);
            const subjects = await subjectService.getAll({ ...req.pagination, search });
            res.json(SubjectBaseListDTO.parse(subjects));
        } catch (error) {
            next(error);
        }
    },

    getById: async (req, res, next) => {
        try {
            const subject = await subjectService.getById(req.params.id);
            res.json(SubjectBaseDTO.parse(subject));
        } catch (error) {
            next(error);
        }
    },

    create: async (req, res, next) => {
        try {
            const validatedData = CreateSubjectSchema.parse(req.body);
            const newSubject = await subjectService.create(validatedData);
            res.status(201).json(SubjectBaseDTO.parse(newSubject));
        } catch (error) {
            next(error);
        }
    },

    update: async (req, res, next) => {
        try {
            const validatedData = UpdateSubjectSchema.parse(req.body);
            const updatedSubject = await subjectService.update(req.params.id, validatedData);
            res.json(SubjectBaseDTO.parse(updatedSubject));
        } catch (error) {
            next(error);
        }
    },

    delete: async (req, res, next) => {
        try {
            const result = await subjectService.delete(req.params.id);
            res.json(result);
        } catch (error) {
            next(error);
        }
    }
};
