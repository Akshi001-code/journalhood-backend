"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.studentIdParam = exports.updateStudentValidator = exports.createStudentValidator = void 0;
const zod_1 = require("zod");
const app_config_1 = require("../config/app.config");
exports.createStudentValidator = zod_1.z.object({
    name: zod_1.z.string().min(1, "Name is required"),
    email: zod_1.z.string().email(),
    password: zod_1.z
        .string()
        .optional()
        .transform((_) => app_config_1.DEFAULT_PASSWORDS.STUDENT),
    role: zod_1.z
        .string()
        .optional()
        .transform((_) => app_config_1.ROLES.STUDENT),
});
exports.updateStudentValidator = exports.createStudentValidator.omit({
    password: true,
    role: true,
});
exports.studentIdParam = zod_1.z.object({
    uid: zod_1.z.string().min(1, "Student id is required"),
});
//# sourceMappingURL=teacher.validator.js.map