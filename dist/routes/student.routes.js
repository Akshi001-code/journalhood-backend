"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const verifyToken_1 = require("../utils/verifyToken");
const student_controller_1 = require("../controllers/student.controller");
const router = express_1.default.Router();
// Diary entry routes
router.get("/diary-entries", verifyToken_1.verifyToken, student_controller_1.getDiaryEntries);
router.post("/diary-entries", verifyToken_1.verifyToken, student_controller_1.createDiaryEntry);
router.put("/diary-entries/:entryId", verifyToken_1.verifyToken, student_controller_1.updateDiaryEntry);
router.delete("/diary-entries/:entryId", verifyToken_1.verifyToken, student_controller_1.deleteDiaryEntry);
router.get("/diary-backup-entries", student_controller_1.getDiaryBackupEntries);
// Profile routes
router.get("/profile", verifyToken_1.verifyToken, student_controller_1.getStudentProfile);
router.put("/profile", verifyToken_1.verifyToken, student_controller_1.updateStudentProfile);
exports.default = router;
//# sourceMappingURL=student.routes.js.map