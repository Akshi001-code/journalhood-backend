import { Router } from "express";
import { verifyToken } from "../utils/verifyToken";
import { verifyRole } from "../utils/verifyRole";
import { ROLES } from "../config/app.config";
import {
  createSchoolAdmin,
  deleteSchoolAdmin,
  getSchoolAdmins,
  suspendOrUnsuspendSchoolAdmin,
  updateSchoolAdmin,
  createSchool,
  getSchools,
  updateSchool,
  deleteSchool,
  getDistrictOverview,
  getDistrictAnalytics,
  getAssignedResources,
  assignResourceToSchoolAdmin,
  getResourceAssignments,
  getAvailableSchoolAdmins,
  getDistrictHistoricalAnalytics,
  getSchoolAnalytics,
  getSchoolHistoricalAnalytics,
  getClassAnalytics,
  getClassHistoricalAnalytics,
} from "../controllers/district-admin.controller";
import { zValidator } from "../utils/zValidator";
import {
  createSchoolAdminValidator,
  schoolAdminParam,
  updateSchoolAdminValidator,
  createSchoolValidator,
  updateSchoolValidator,
  schoolParam,
  schoolsQueryValidator,
} from "../validators/district-admin.validator";
import { getDistrictFlaggedStudents } from "../controllers/mental-health.controller";

const router: Router = Router();

// Only district-admin can access these routes
router.use(verifyToken, verifyRole([ROLES.DISTRICT_ADMIN]));

// District Overview
router.get("/overview", getDistrictOverview);

// School Routes
router.post(
  "/schools",
  zValidator({
    schema: createSchoolValidator,
    type: "body",
  }),
  createSchool
);

router.get(
  "/schools",
  zValidator({
    schema: schoolsQueryValidator,
    type: "query",
  }),
  getSchools
);

router.put(
  "/schools/:schoolId",
  zValidator({
    schema: schoolParam,
    type: "params",
  }),
  zValidator({
    schema: updateSchoolValidator,
    type: "body",
  }),
  updateSchool
);

router.delete(
  "/schools/:schoolId",
  zValidator({
    schema: schoolParam,
    type: "params",
  }),
  deleteSchool
);

// School analytics routes for district admin
router.get('/schools/:schoolId/analytics', getSchoolAnalytics);
router.get('/schools/:schoolId/analytics/historical', getSchoolHistoricalAnalytics);
// Class analytics routes for district admin
router.get('/classes/:classId/analytics', getClassAnalytics);
router.get('/classes/:classId/analytics/historical', getClassHistoricalAnalytics);

// School Admin Routes
router.post(
  "/create-school-admin",
  zValidator({
    schema: createSchoolAdminValidator,
    type: "body",
  }),
  createSchoolAdmin
);

router.get("/get-school-admins", getSchoolAdmins);

router.put(
  "/update-school-admin/:uid",
  zValidator({
    schema: schoolAdminParam,
    type: "params",
  }),
  zValidator({
    schema: updateSchoolAdminValidator,
    type: "body",
  }),
  updateSchoolAdmin
);

router.put(
  "/suspend-school-admin/:uid",
  zValidator({
    schema: schoolAdminParam,
    type: "params",
  }),
  suspendOrUnsuspendSchoolAdmin
);

router.delete(
  "/delete-school-admin/:uid",
  zValidator({
    schema: schoolAdminParam,
    type: "params",
  }),
  deleteSchoolAdmin
);

// Analytics
router.get("/analytics", getDistrictAnalytics);
router.get("/analytics/historical", getDistrictHistoricalAnalytics);

// Resource Management Routes
router.get("/resources", getAssignedResources);
router.post("/resources/assign", assignResourceToSchoolAdmin);
router.get("/resource-assignments", getResourceAssignments);
router.get("/school-admins", getAvailableSchoolAdmins);
router.get('/mental-health/flagged-students', getDistrictFlaggedStudents);

export { router as districtAdminRoutes };
