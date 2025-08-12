import { Router } from "express";
import { getTeacherFlaggedStudents } from '../controllers/mental-health.controller';

const router = Router();

router.get('/mental-health/flagged-students', getTeacherFlaggedStudents);

export { router as teacherRoutes }; 