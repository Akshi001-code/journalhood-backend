import { z } from "zod";
import { ROLES } from "../config/app.config";
export declare const createDistrictAdminValidator: z.ZodObject<{
    email: z.ZodString;
    name: z.ZodString;
    phone: z.ZodEffects<z.ZodOptional<z.ZodString>, string, string>;
    districtId: z.ZodString;
    password: z.ZodEffects<z.ZodOptional<z.ZodString>, string, string>;
    role: z.ZodEffects<z.ZodOptional<z.ZodString>, ROLES, string>;
}, "strip", z.ZodTypeAny, {
    role?: ROLES;
    districtId?: string;
    email?: string;
    name?: string;
    phone?: string;
    password?: string;
}, {
    role?: string;
    districtId?: string;
    email?: string;
    name?: string;
    phone?: string;
    password?: string;
}>;
export declare const createMutlipleDistrictAdminsValidator: z.ZodArray<z.ZodObject<{
    email: z.ZodString;
    name: z.ZodString;
    phone: z.ZodEffects<z.ZodOptional<z.ZodString>, string, string>;
    districtId: z.ZodString;
    password: z.ZodEffects<z.ZodOptional<z.ZodString>, string, string>;
    role: z.ZodEffects<z.ZodOptional<z.ZodString>, ROLES, string>;
}, "strip", z.ZodTypeAny, {
    role?: ROLES;
    districtId?: string;
    email?: string;
    name?: string;
    phone?: string;
    password?: string;
}, {
    role?: string;
    districtId?: string;
    email?: string;
    name?: string;
    phone?: string;
    password?: string;
}>, "many">;
export declare const updateDistrictAdminValidator: z.ZodObject<Omit<{
    email: z.ZodString;
    name: z.ZodString;
    phone: z.ZodEffects<z.ZodOptional<z.ZodString>, string, string>;
    districtId: z.ZodString;
    password: z.ZodEffects<z.ZodOptional<z.ZodString>, string, string>;
    role: z.ZodEffects<z.ZodOptional<z.ZodString>, ROLES, string>;
}, "role" | "password">, "strip", z.ZodTypeAny, {
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
export declare const districtAdminParam: z.ZodObject<{
    uid: z.ZodString;
}, "strip", z.ZodTypeAny, {
    uid?: string;
}, {
    uid?: string;
}>;
export declare const createDistrictValidator: z.ZodObject<{
    name: z.ZodString;
    country: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name?: string;
    country?: string;
}, {
    name?: string;
    country?: string;
}>;
export declare const updateDistrictValidator: z.ZodObject<{
    name: z.ZodString;
    country: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name?: string;
    country?: string;
}, {
    name?: string;
    country?: string;
}>;
export declare const districtParam: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id?: string;
}, {
    id?: string;
}>;
export declare const createSchoolBySuperAdminValidator: z.ZodObject<{
    name: z.ZodString;
    address: z.ZodOptional<z.ZodString>;
    zipCode: z.ZodOptional<z.ZodString>;
    districtId: z.ZodOptional<z.ZodString>;
    adminName: z.ZodOptional<z.ZodString>;
    adminEmail: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    contactPhone: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    districtId?: string;
    name?: string;
    address?: string;
    zipCode?: string;
    adminName?: string;
    adminEmail?: string;
    contactPhone?: string;
}, {
    districtId?: string;
    name?: string;
    address?: string;
    zipCode?: string;
    adminName?: string;
    adminEmail?: string;
    contactPhone?: string;
}>;
export declare const createResourceValidator: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    url: z.ZodString;
    type: z.ZodLiteral<"link">;
    category: z.ZodEnum<["depression", "bullying", "introvert", "language_problem"]>;
}, "strip", z.ZodTypeAny, {
    type?: "link";
    title?: string;
    description?: string;
    url?: string;
    category?: "depression" | "bullying" | "introvert" | "language_problem";
}, {
    type?: "link";
    title?: string;
    description?: string;
    url?: string;
    category?: "depression" | "bullying" | "introvert" | "language_problem";
}>;
export declare const updateResourceValidator: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    url: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["active", "archived"]>>;
    category: z.ZodOptional<z.ZodEnum<["depression", "bullying", "introvert", "language_problem"]>>;
}, "strip", z.ZodTypeAny, {
    status?: "active" | "archived";
    title?: string;
    description?: string;
    url?: string;
    category?: "depression" | "bullying" | "introvert" | "language_problem";
}, {
    status?: "active" | "archived";
    title?: string;
    description?: string;
    url?: string;
    category?: "depression" | "bullying" | "introvert" | "language_problem";
}>;
export declare const assignResourceValidator: z.ZodObject<{
    resourceId: z.ZodString;
    assignedTo: z.ZodString;
    assignedToRole: z.ZodEnum<["district-admin", "school-admin", "teacher"]>;
    targetType: z.ZodEnum<["district", "school", "class"]>;
    targetId: z.ZodString;
    targetName: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    resourceId?: string;
    assignedTo?: string;
    assignedToRole?: "district-admin" | "school-admin" | "teacher";
    targetType?: "district" | "school" | "class";
    targetId?: string;
    targetName?: string;
}, {
    resourceId?: string;
    assignedTo?: string;
    assignedToRole?: "district-admin" | "school-admin" | "teacher";
    targetType?: "district" | "school" | "class";
    targetId?: string;
    targetName?: string;
}>;
export declare const updateSchoolBySuperAdminValidator: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    address: z.ZodOptional<z.ZodString>;
    zipCode: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name?: string;
    address?: string;
    zipCode?: string;
}, {
    name?: string;
    address?: string;
    zipCode?: string;
}>;
export declare const schoolParam: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id?: string;
}, {
    id?: string;
}>;
export declare const assignSchoolToDistrictValidator: z.ZodObject<{
    schoolId: z.ZodString;
    districtId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    districtId?: string;
    schoolId?: string;
}, {
    districtId?: string;
    schoolId?: string;
}>;
export declare const unassignSchoolFromDistrictValidator: z.ZodObject<{
    schoolId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    schoolId?: string;
}, {
    schoolId?: string;
}>;
export type TCreateDistrictAdmin = z.infer<typeof createDistrictAdminValidator>;
export type TDistrictAdminParam = z.infer<typeof districtAdminParam>;
export type TUpdateDistrictAdmin = z.infer<typeof updateDistrictAdminValidator>;
export type TMultipleDistrictAdminCreationSchema = z.infer<typeof createMutlipleDistrictAdminsValidator>;
export type TCreateDistrict = z.infer<typeof createDistrictValidator>;
export type TUpdateDistrict = z.infer<typeof updateDistrictValidator>;
export type TDistrictParam = z.infer<typeof districtParam>;
export type TCreateSchoolBySuperAdmin = z.infer<typeof createSchoolBySuperAdminValidator>;
export type TUpdateSchoolBySuperAdmin = z.infer<typeof updateSchoolBySuperAdminValidator>;
export type TSchoolParam = z.infer<typeof schoolParam>;
export type TAssignSchoolToDistrict = z.infer<typeof assignSchoolToDistrictValidator>;
export type TUnassignSchoolFromDistrict = z.infer<typeof unassignSchoolFromDistrictValidator>;
