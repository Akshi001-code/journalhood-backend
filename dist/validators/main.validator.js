"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mailValidator = void 0;
const zod_1 = require("zod");
exports.mailValidator = zod_1.z.object({
    firstname: zod_1.z.string().min(1, "First name is required"),
    lastname: zod_1.z.string().min(1, "Last name is required"),
    institutionName: zod_1.z.string().min(1, "Institution name is required"),
    workEmail: zod_1.z.string().email(),
    phone: zod_1.z.string().min(1, "Phone number is required"),
    role: zod_1.z.string().min(1, "Role is required"),
    numberOfStudents: zod_1.z.string().min(1, "Number of students is required"),
    message: zod_1.z.string().optional(),
});
//# sourceMappingURL=main.validator.js.map