import { z } from "zod";
import { DEFAULT_PASSWORDS, ROLES } from "../config/app.config";

export const createStudentValidator = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email(),
  password: z
    .string()
    .optional()
    .transform((_) => DEFAULT_PASSWORDS.STUDENT),
  role: z
    .string()
    .optional()
    .transform((_) => ROLES.STUDENT),
});

export const updateStudentValidator = createStudentValidator.omit({
  password: true,
  role: true,
});

export const studentIdParam = z.object({
  uid: z.string().min(1, "Student id is required"),
});

// types
export type TCreateStudent = z.infer<typeof createStudentValidator>;
export type TUpdateStudent = z.infer<typeof updateStudentValidator>;
export type TStudentIdParam = z.infer<typeof studentIdParam>;
