import express from "express";
import { verifyToken } from "../utils/verifyToken";
import {
  createDiaryEntry,
  updateDiaryEntry,
  deleteDiaryEntry,
  getStudentProfile,
  updateStudentProfile,
  getDiaryBackupEntries,
  getDiaryEntries
} from "../controllers/student.controller";

const router = express.Router();

// Diary entry routes
router.get("/diary-entries", verifyToken, getDiaryEntries);
router.post("/diary-entries", verifyToken, createDiaryEntry);
router.put("/diary-entries/:entryId", verifyToken, updateDiaryEntry);
router.delete("/diary-entries/:entryId", verifyToken, deleteDiaryEntry);
router.get("/diary-backup-entries", getDiaryBackupEntries);

// Profile routes
router.get("/profile", verifyToken, getStudentProfile);
router.put("/profile", verifyToken, updateStudentProfile);

export default router; 