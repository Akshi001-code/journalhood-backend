"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfileSchema = exports.updateDiaryEntrySchema = exports.createDiaryEntrySchema = void 0;
const zod_1 = require("zod");
exports.createDiaryEntrySchema = zod_1.z.object({
    content: zod_1.z.string().min(1, "Content is required"),
    emotion: zod_1.z.string().min(1, "Emotion is required"),
    title: zod_1.z.string().min(1, "Title is required"),
});
exports.updateDiaryEntrySchema = zod_1.z.object({
    content: zod_1.z.string().optional(),
    emotion: zod_1.z.string().optional(),
    title: zod_1.z.string().optional(),
}).refine(data => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update"
});
exports.updateProfileSchema = zod_1.z.object({
    displayName: zod_1.z.string().min(1, "Display name is required").optional(),
    photoURL: zod_1.z.string().url("Invalid photo URL").optional(),
}).refine(data => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update"
});
//# sourceMappingURL=student.validator.js.map