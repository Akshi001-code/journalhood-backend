import { z } from "zod";
export declare const addGradesAndDivisionsValidator: z.ZodObject<{
    gradeId: z.ZodString;
    divisionCount: z.ZodNumber;
    divisionNames: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    gradeId?: string;
    divisionCount?: number;
    divisionNames?: string[];
}, {
    gradeId?: string;
    divisionCount?: number;
    divisionNames?: string[];
}>;
export declare const updateGradesAndDivisionsValidator: z.ZodObject<Omit<{
    gradeId: z.ZodString;
    divisionCount: z.ZodNumber;
    divisionNames: z.ZodArray<z.ZodString, "many">;
}, "gradeId">, "strip", z.ZodTypeAny, {
    divisionCount?: number;
    divisionNames?: string[];
}, {
    divisionCount?: number;
    divisionNames?: string[];
}>;
export declare const gradeIdParam: z.ZodObject<{
    gradeId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    gradeId?: string;
}, {
    gradeId?: string;
}>;
export declare const createTeacherValidator: z.ZodObject<{
    name: z.ZodString;
    email: z.ZodString;
    phone: z.ZodOptional<z.ZodString>;
    gradeId: z.ZodOptional<z.ZodString>;
    gradeName: z.ZodOptional<z.ZodString>;
    division: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    gradeId?: string;
    email?: string;
    name?: string;
    phone?: string;
    gradeName?: string;
    division?: string;
}, {
    gradeId?: string;
    email?: string;
    name?: string;
    phone?: string;
    gradeName?: string;
    division?: string;
}>;
export declare const updateTeacherValidator: z.ZodObject<Omit<{
    name: z.ZodString;
    email: z.ZodString;
    phone: z.ZodOptional<z.ZodString>;
    gradeId: z.ZodOptional<z.ZodString>;
    gradeName: z.ZodOptional<z.ZodString>;
    division: z.ZodOptional<z.ZodString>;
}, "role" | "gradeId" | "email" | "name" | "phone" | "password" | "gradeName" | "division">, "strip", z.ZodTypeAny, {}, {}>;
export declare const teacherIdParam: z.ZodObject<{
    uid: z.ZodString;
}, "strip", z.ZodTypeAny, {
    uid?: string;
}, {
    uid?: string;
}>;
export type TAddGradesAndDivisions = z.infer<typeof addGradesAndDivisionsValidator>;
export type TGradeIdParam = z.infer<typeof gradeIdParam>;
export type TUpdateGradesAndDivisions = z.infer<typeof updateGradesAndDivisionsValidator>;
export type TCreateTeacher = z.infer<typeof createTeacherValidator>;
export type TUpdateTeacher = z.infer<typeof updateTeacherValidator>;
export type TTeacherIdParam = z.infer<typeof teacherIdParam>;
export declare const createClassSchema: z.ZodObject<{
    gradeName: z.ZodString;
    division: z.ZodString;
    maxStudents: z.ZodNumber;
    schoolId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    schoolId?: string;
    gradeName?: string;
    division?: string;
    maxStudents?: number;
}, {
    schoolId?: string;
    gradeName?: string;
    division?: string;
    maxStudents?: number;
}>;
export declare const updateClassSchema: z.ZodObject<z.objectUtil.extendShape<{
    gradeName: z.ZodOptional<z.ZodString>;
    division: z.ZodOptional<z.ZodString>;
    maxStudents: z.ZodOptional<z.ZodNumber>;
    schoolId: z.ZodOptional<z.ZodString>;
}, {
    teacherId: z.ZodOptional<z.ZodString>;
    teacherName: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["active", "inactive"]>>;
}>, "strip", z.ZodTypeAny, {
    schoolId?: string;
    teacherId?: string;
    teacherName?: string;
    status?: "active" | "inactive";
    gradeName?: string;
    division?: string;
    maxStudents?: number;
}, {
    schoolId?: string;
    teacherId?: string;
    teacherName?: string;
    status?: "active" | "inactive";
    gradeName?: string;
    division?: string;
    maxStudents?: number;
}>;
export declare const classParamSchema: z.ZodObject<{
    classId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    classId?: string;
}, {
    classId?: string;
}>;
export type TCreateClass = z.infer<typeof createClassSchema>;
export type TUpdateClass = z.infer<typeof updateClassSchema>;
export type TClassParam = z.infer<typeof classParamSchema>;
