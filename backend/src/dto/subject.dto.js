import { z } from "zod";

// DTO base
export const SubjectBaseDTO = z.object({
    id: z.number(),
    name: z.string()
});

export const SubjectBaseListDTO = z.array(SubjectBaseDTO);
