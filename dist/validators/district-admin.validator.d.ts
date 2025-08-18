import { z } from "zod";
export declare const createSchoolAdminValidator: z.ZodObject<{
    email: z.ZodString;
    name: z.ZodString;
    phone: z.ZodOptional<z.ZodString>;
    districtId: z.ZodString;
    schoolId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    districtId?: string;
    schoolId?: string;
    email?: string;
    name?: string;
    phone?: string;
}, {
    districtId?: string;
    schoolId?: string;
    email?: string;
    name?: string;
    phone?: string;
}>;
export declare const updateSchoolAdminValidator: z.ZodObject<{
    email: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    districtId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    districtId?: string;
    email?: string;
    name?: string;
    phone?: string;
}, {
    districtId?: string;
    email?: string;
    name?: string;
    phone?: string;
}>;
export declare const schoolAdminParam: z.ZodObject<{
    uid: z.ZodString;
}, "strip", z.ZodTypeAny, {
    uid?: string;
}, {
    uid?: string;
}>;
export declare const createSchoolValidator: z.ZodObject<{
    name: z.ZodString;
    districtId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    districtId?: string;
    name?: string;
}, {
    districtId?: string;
    name?: string;
}>;
export declare const updateSchoolValidator: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    adminId: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["active", "suspended"]>>;
}, "strip", z.ZodTypeAny, {
    name?: string;
    status?: "active" | "suspended";
    adminId?: string;
}, {
    name?: string;
    status?: "active" | "suspended";
    adminId?: string;
}>;
export declare const schoolParam: z.ZodObject<{
    schoolId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    schoolId?: string;
}, {
    schoolId?: string;
}>;
export declare const schoolsQueryValidator: z.ZodObject<{
    districtId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    districtId?: string;
}, {
    districtId?: string;
}>;
export type TCreateSchoolAdmin = z.infer<typeof createSchoolAdminValidator>;
export type TSchoolAdminParam = z.infer<typeof schoolAdminParam>;
export type TUpdateSchoolAdmin = z.infer<typeof updateSchoolAdminValidator>;
export type TSchoolsQuery = z.infer<typeof schoolsQueryValidator>;
