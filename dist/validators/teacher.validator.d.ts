import { z } from "zod";
import { ROLES } from "../config/app.config";
export declare const createStudentValidator: z.ZodObject<{
    name: z.ZodString;
    email: z.ZodString;
    password: z.ZodEffects<z.ZodOptional<z.ZodString>, string, string>;
    role: z.ZodEffects<z.ZodOptional<z.ZodString>, ROLES, string>;
}, "strip", z.ZodTypeAny, {
    role?: ROLES;
    email?: string;
    name?: string;
    password?: string;
}, {
    role?: string;
    email?: string;
    name?: string;
    password?: string;
}>;
export declare const updateStudentValidator: z.ZodObject<Omit<{
    name: z.ZodString;
    email: z.ZodString;
    password: z.ZodEffects<z.ZodOptional<z.ZodString>, string, string>;
    role: z.ZodEffects<z.ZodOptional<z.ZodString>, ROLES, string>;
}, "role" | "password">, "strip", z.ZodTypeAny, {
    email?: string;
    name?: string;
}, {
    email?: string;
    name?: string;
}>;
export declare const studentIdParam: z.ZodObject<{
    uid: z.ZodString;
}, "strip", z.ZodTypeAny, {
    uid?: string;
}, {
    uid?: string;
}>;
export type TCreateStudent = z.infer<typeof createStudentValidator>;
export type TUpdateStudent = z.infer<typeof updateStudentValidator>;
export type TStudentIdParam = z.infer<typeof studentIdParam>;
