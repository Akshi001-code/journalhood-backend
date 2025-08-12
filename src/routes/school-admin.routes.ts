import { Router } from "express";
import { verifyToken } from "../utils/verifyToken";
import { verifyRole } from "../utils/verifyRole";
import { ROLES } from "../config/app.config";
import {
  addGradesAndDivisions,
  deleteGradesAndDivisions,
  getGradesAndDivisions,
  updateGradesAndDivisions,
  getSchoolOverview,
  getSchoolAnalytics,
  getAssignedResources,
  getResourceAssignments,
  getAvailableTeachers,
  getSchoolHistoricalAnalytics,
  getStudents,
  getClassAnalytics,
  getClassHistoricalAnalytics,
} from "../controllers/school-admin.controller";
import { getSchoolFlaggedStudents } from "../controllers/mental-health.controller";
import { zValidator } from "../utils/zValidator";
import {
  addGradesAndDivisionsValidator,
  gradeIdParam,
  updateGradesAndDivisionsValidator,
} from "../validators/school-admin.validator";

const router: Router = Router();

// routes for school admin
router.use(verifyToken, verifyRole([ROLES.SCHOOL_ADMIN]));

// School Overview
router.get("/overview", getSchoolOverview);

// create grades and divisions
router.post(
  "/add-grades-and-divisions",
  zValidator({
    schema: addGradesAndDivisionsValidator,
    type: "body",
  }),
  addGradesAndDivisions
);

// get grades and divisions
router.get("/get-grades-and-divisions", getGradesAndDivisions);

// update grades and divisions
router.put(
  "/update-grades-and-divisions/:gradeId",
  zValidator({
    schema: gradeIdParam,
    type: "params",
  }),
  zValidator({
    schema: updateGradesAndDivisionsValidator,
    type: "body",
  }),
  updateGradesAndDivisions
);

// delete grades and divisions
router.delete(
  "/delete-grades-and-divisions/:gradeId",
  zValidator({
    schema: gradeIdParam,
    type: "params",
  }),
  deleteGradesAndDivisions
);

// Analytics
router.get("/analytics", getSchoolAnalytics);
router.get("/analytics/historical", getSchoolHistoricalAnalytics);

// Class analytics routes for school admin
router.get('/classes/:classId/analytics', getClassAnalytics);
router.get('/classes/:classId/analytics/historical', getClassHistoricalAnalytics);

// Resource Management Routes
router.get("/resources/assigned", getAssignedResources);
router.get("/resources/assignments", getResourceAssignments);
router.get("/resources/teachers", getAvailableTeachers);

// Mental Health Routes
router.get('/mental-health/flagged-students', getSchoolFlaggedStudents);

// get students
router.get("/get-students", getStudents);

export { router as schoolAdminRoutes };
