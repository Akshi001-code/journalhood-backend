"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.classParamSchema = exports.updateClassSchema = exports.createClassSchema = exports.teacherIdParam = exports.updateTeacherValidator = exports.createTeacherValidator = exports.gradeIdParam = exports.updateGradesAndDivisionsValidator = exports.addGradesAndDivisionsValidator = void 0;
// @ts-nocheck
const zod_1 = require("zod");
// phoneRegex
const phoneRegex = new RegExp(/^([+]?[\s0-9]+)?(\d{3}|[(]?[0-9]+[)])?([-]?[\s]?[0-9])+$/);
// addGradesAndDivisionsValidator
exports.addGradesAndDivisionsValidator = zod_1.z.object({
    gradeId: zod_1.z.string().min(1, "Grade is required"),
    divisionCount: zod_1.z.number().min(1, "At least one division is required"),
    divisionNames: zod_1.z
        .array(zod_1.z.string())
        .min(1, "At least one division is required"),
});
// updateGradesAndDivisionsValidator
exports.updateGradesAndDivisionsValidator = exports.addGradesAndDivisionsValidator.omit({
    gradeId: true,
});
// gradeIdParam
exports.gradeIdParam = zod_1.z.object({
    gradeId: zod_1.z.string().min(1, "Grade is required"),
});
exports.createTeacherValidator = zod_1.z.object({
    name: zod_1.z.string().min(1, "Name is required"),
    email: zod_1.z.string().email(),
    phone: zod_1.z.string().regex(phoneRegex, {
        message: "Invalid phone number",
    }).optional(),
    gradeId: zod_1.z.string().optional(),
    gradeName: zod_1.z.string().optional(),
    division: zod_1.z.string().optional(),
});
exports.updateTeacherValidator = exports.createTeacherValidator.omit({
    password: true,
    role: true,
});
exports.teacherIdParam = zod_1.z.object({
    uid: zod_1.z.string().min(1, "Teacher id is required"),
});
// Class Management
exports.createClassSchema = zod_1.z.object({
    gradeName: zod_1.z.string().min(1, "Grade name is required"),
    division: zod_1.z.string().min(1, "Division is required").max(1, "Division must be a single letter"),
    maxStudents: zod_1.z.number().min(1, "Maximum students must be at least 1").max(50, "Maximum students cannot exceed 50"),
    schoolId: zod_1.z.string().min(1, "School ID is required"),
});
exports.updateClassSchema = exports.createClassSchema.partial().extend({
    teacherId: zod_1.z.string().optional(),
    teacherName: zod_1.z.string().optional(),
    status: zod_1.z.enum(["active", "inactive"]).optional(),
});
exports.classParamSchema = zod_1.z.object({
    classId: zod_1.z.string().min(1, "Class ID is required"),
});
//# sourceMappingURL=school-admin.validator.js.map