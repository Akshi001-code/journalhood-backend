"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.schoolsQueryValidator = exports.schoolParam = exports.updateSchoolValidator = exports.createSchoolValidator = exports.schoolAdminParam = exports.updateSchoolAdminValidator = exports.createSchoolAdminValidator = void 0;
// @ts-nocheck
const zod_1 = require("zod");
// Phone number regex that allows:
// - Optional + at start
// - 10-15 digits
// - Optional spaces, hyphens, or parentheses between numbers
const phoneRegex = /^\+?[\d\s-()]{10,15}$/;
// createSchoolAdminValidator
exports.createSchoolAdminValidator = zod_1.z.object({
    email: zod_1.z.string().email(),
    name: zod_1.z.string().min(2),
    phone: zod_1.z.string().regex(phoneRegex, "Phone number must be 10-15 digits with optional +, spaces, hyphens, or parentheses").optional(),
    districtId: zod_1.z.string(),
    schoolId: zod_1.z.string(),
});
// updateSchoolAdminValidator
exports.updateSchoolAdminValidator = zod_1.z.object({
    email: zod_1.z.string().email().optional(),
    name: zod_1.z.string().min(2).optional(),
    phone: zod_1.z.string().optional(),
    districtId: zod_1.z.string().optional(),
});
// schoolAdminParam
exports.schoolAdminParam = zod_1.z.object({
    uid: zod_1.z.string(),
});
// School Validators
exports.createSchoolValidator = zod_1.z.object({
    name: zod_1.z.string().min(2),
    districtId: zod_1.z.string(),
});
exports.updateSchoolValidator = zod_1.z.object({
    name: zod_1.z.string().min(2).optional(),
    adminId: zod_1.z.string().optional(),
    status: zod_1.z.enum(["active", "suspended"]).optional(),
});
exports.schoolParam = zod_1.z.object({
    schoolId: zod_1.z.string(),
});
// Schools query validator
exports.schoolsQueryValidator = zod_1.z.object({
    districtId: zod_1.z.string(),
});
//# sourceMappingURL=district-admin.validator.js.map