import { z } from "zod";
export declare const mailValidator: z.ZodObject<{
    firstname: z.ZodString;
    lastname: z.ZodString;
    institutionName: z.ZodString;
    workEmail: z.ZodString;
    phone: z.ZodString;
    role: z.ZodString;
    numberOfStudents: z.ZodString;
    message: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    role?: string;
    message?: string;
    phone?: string;
    firstname?: string;
    lastname?: string;
    institutionName?: string;
    workEmail?: string;
    numberOfStudents?: string;
}, {
    role?: string;
    message?: string;
    phone?: string;
    firstname?: string;
    lastname?: string;
    institutionName?: string;
    workEmail?: string;
    numberOfStudents?: string;
}>;
export type TMailValidator = z.infer<typeof mailValidator>;
