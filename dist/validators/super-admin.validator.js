"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unassignSchoolFromDistrictValidator = exports.assignSchoolToDistrictValidator = exports.schoolParam = exports.updateSchoolBySuperAdminValidator = exports.assignResourceValidator = exports.updateResourceValidator = exports.createResourceValidator = exports.createSchoolBySuperAdminValidator = exports.districtParam = exports.updateDistrictValidator = exports.createDistrictValidator = exports.districtAdminParam = exports.updateDistrictAdminValidator = exports.createMutlipleDistrictAdminsValidator = exports.createDistrictAdminValidator = void 0;
const zod_1 = require("zod");
const app_config_1 = require("../config/app.config");
// phoneRegex
const phoneRegex = new RegExp(/^([+]?[\s0-9]+)?(\d{3}|[(]?[0-9]+[)])?([-]?[\s]?[0-9])+$/);
// createDistrictAdminValidator
exports.createDistrictAdminValidator = zod_1.z.object({
    email: zod_1.z.string().email(),
    name: zod_1.z.string().min(1, "Name is required"),
    phone: zod_1.z.string()
        .optional()
        .refine((val) => {
        if (!val || val === "")
            return true; // Allow empty or undefined
        return phoneRegex.test(val);
    }, {
        message: "Invalid phone number",
    }),
    districtId: zod_1.z.string().min(1, "District ID is required"),
    password: zod_1.z
        .string()
        .optional()
        .transform((_) => app_config_1.DEFAULT_PASSWORDS.DISTRICT_ADMIN),
    role: zod_1.z
        .string()
        .optional()
        .transform((_) => app_config_1.ROLES.DISTRICT_ADMIN),
});
// createMutlipleDistrictAdminsValidator
exports.createMutlipleDistrictAdminsValidator = zod_1.z
    .array(exports.createDistrictAdminValidator)
    .min(1, "At least one district admin is required");
// updateDistrictAdminValidator
exports.updateDistrictAdminValidator = exports.createDistrictAdminValidator.omit({
    password: true,
    role: true,
});
// districtAdminParam
exports.districtAdminParam = zod_1.z.object({
    uid: zod_1.z.string().min(1, "District admin id is required"),
});
// createDistrictValidator
exports.createDistrictValidator = zod_1.z.object({
    name: zod_1.z.string().min(1, "District name is required"),
    country: zod_1.z.string().min(1, "Country is required"),
});
// updateDistrictValidator
exports.updateDistrictValidator = exports.createDistrictValidator;
// districtParam
exports.districtParam = zod_1.z.object({
    id: zod_1.z.string().min(1, "District id is required"),
});
// School Management Validators
// createSchoolValidator for super admin
exports.createSchoolBySuperAdminValidator = zod_1.z.object({
    name: zod_1.z.string().min(1, "School name is required"),
    address: zod_1.z.string().optional(),
    zipCode: zod_1.z.string().optional(),
    districtId: zod_1.z.string().optional(),
    adminName: zod_1.z.string().optional(),
    adminEmail: zod_1.z.string().email().optional().or(zod_1.z.literal("")),
    contactPhone: zod_1.z.string().optional(),
});
// Resource Management Validators
exports.createResourceValidator = zod_1.z.object({
    title: zod_1.z.string().min(1, "Resource title is required"),
    description: zod_1.z.string().optional(),
    url: zod_1.z.string().url("Please provide a valid URL"),
    type: zod_1.z.literal("link"), // Future: z.enum(["link", "file", "video"])
    category: zod_1.z.enum(["depression", "bullying", "introvert", "language_problem"], {
        required_error: "Category is required",
        invalid_type_error: "Invalid category selected"
    }),
});
exports.updateResourceValidator = zod_1.z.object({
    title: zod_1.z.string().min(1, "Resource title is required").optional(),
    description: zod_1.z.string().optional(),
    url: zod_1.z.string().url("Please provide a valid URL").optional(),
    status: zod_1.z.enum(["active", "archived"]).optional(),
    category: zod_1.z.enum(["depression", "bullying", "introvert", "language_problem"]).optional(),
});
exports.assignResourceValidator = zod_1.z.object({
    resourceId: zod_1.z.string().min(1, "Resource ID is required"),
    assignedTo: zod_1.z.string().min(1, "Assigned to user ID is required"),
    assignedToRole: zod_1.z.enum(["district-admin", "school-admin", "teacher"]),
    targetType: zod_1.z.enum(["district", "school", "class"]),
    targetId: zod_1.z.string().min(1, "Target ID is required"),
    targetName: zod_1.z.string().optional(),
});
// updateSchoolValidator for super admin
exports.updateSchoolBySuperAdminValidator = zod_1.z.object({
    name: zod_1.z.string().min(1, "School name is required").optional(),
    address: zod_1.z.string().optional(),
    zipCode: zod_1.z.string().optional(),
});
// schoolParam
exports.schoolParam = zod_1.z.object({
    id: zod_1.z.string().min(1, "School id is required"),
});
// assignSchoolToDistrictValidator
exports.assignSchoolToDistrictValidator = zod_1.z.object({
    schoolId: zod_1.z.string().min(1, "School ID is required"),
    districtId: zod_1.z.string().min(1, "District ID is required"),
});
// unassignSchoolFromDistrictValidator
exports.unassignSchoolFromDistrictValidator = zod_1.z.object({
    schoolId: zod_1.z.string().min(1, "School ID is required"),
});
//# sourceMappingURL=super-admin.validator.js.map