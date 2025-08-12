import { Router } from "express";
import { verifyToken } from "../utils/verifyToken";
import { verifyRole } from "../utils/verifyRole";
import {
  createDistrictAdmin,
  createMultipleDistrictAdmins,
  deleteDistrictAdmin,
  getDistrictAdmins,
  getSystemStats,
  suspendOrUnsuspendDistrictAdmin,
  updateDistrictAdmin,
  getAllDistricts,
  createDistrict,
  updateDistrict,
  deleteDistrict,
  toggleDistrictStatus,
  getAllSchools,
  toggleSchoolStatus,
  getAnalytics,
  getHistoricalAnalytics,
  analyzeDiaryEntries,
  updateAnalyticsIncremental,
  createSchoolBySuperAdmin,
  updateSchoolBySuperAdmin,
  deleteSchoolBySuperAdmin,
  assignSchoolToDistrict,
  unassignSchoolFromDistrict,
  getUnassignedSchools,
  getStudents,
  testEmail,
  testFirebaseEmail,
  createResource,
  getResources,
  updateResource,
  deleteResource,
  assignResource,
  getResourceAssignments,
  getClasses,
  getDistrictAnalytics,
  getDistrictHistoricalAnalytics,
  getSchoolAnalytics,
  getSchoolHistoricalAnalytics,
  getClassAnalytics,
  getClassHistoricalAnalytics,
} from "../controllers/super-admin.controller";
import {
  getFlaggedStudentsReport,
} from "../controllers/mental-health.controller";
import {
  analyzeAllStudentJournalsIncremental,
} from "../controllers/mental-health-incremental.controller";
import { zValidator } from "../utils/zValidator";
import {
  createDistrictAdminValidator,
  createMutlipleDistrictAdminsValidator,
  districtAdminParam,
  updateDistrictAdminValidator,
  createDistrictValidator,
  districtParam,
  updateDistrictValidator,
  createSchoolBySuperAdminValidator,
  updateSchoolBySuperAdminValidator,
  schoolParam,
  assignSchoolToDistrictValidator,
  unassignSchoolFromDistrictValidator,
  createResourceValidator,
  updateResourceValidator,
  assignResourceValidator,
} from "../validators/super-admin.validator";
import { ROLES } from "../config/app.config";

const router: Router = Router();

// School analytics routes (must come BEFORE the global super-admin lock)
router.get(
  '/schools/:schoolId/analytics',
  verifyToken,
  verifyRole([ROLES.SUPER_ADMIN, ROLES.DISTRICT_ADMIN, ROLES.SCHOOL_ADMIN]),
  getSchoolAnalytics
);
router.get(
  '/schools/:schoolId/analytics/historical',
  verifyToken,
  verifyRole([ROLES.SUPER_ADMIN, ROLES.DISTRICT_ADMIN, ROLES.SCHOOL_ADMIN]),
  getSchoolHistoricalAnalytics
);

// Only super-admin can access these routes
router.use(verifyToken, verifyRole([ROLES.SUPER_ADMIN]));

// Test email endpoint
router.post("/test-email", testEmail);

// Test Firebase email endpoint
router.post("/test-firebase-email", testFirebaseEmail);

// Routes
// Create District Admin
router.post(
  "/create-district-admin",
  zValidator({
    schema: createDistrictAdminValidator,
    type: "body",
  }),
  createDistrictAdmin
);

// Create Multiple District Admins
router.post(
  "/create-multiple-district-admins",
  zValidator({
    schema: createMutlipleDistrictAdminsValidator,
    type: "body",
  }),
  createMultipleDistrictAdmins
);

// Get District Admins
router.get("/get-district-admins", getDistrictAdmins);

// Get All Districts
router.get("/get-all-districts", getAllDistricts);

// Get Districts
router.get("/get-districts", getSystemStats);

// Get Schools
router.get("/get-schools", getAllSchools);

// Get All Schools
router.get("/get-all-schools", getAllSchools);

// Get System Stats
router.get("/get-system-stats", getSystemStats);

// Update District Admin
router.put(
  "/update-district-admin/:uid",
  zValidator({
    schema: districtAdminParam,
    type: "params",
  }),
  zValidator({
    schema: updateDistrictAdminValidator,
    type: "body",
  }),
  updateDistrictAdmin
);

// suspend or unsuspend district admin
router.put(
  "/suspend-district-admin/:uid",
  zValidator({
    schema: districtAdminParam,
    type: "params",
  }),
  suspendOrUnsuspendDistrictAdmin
);

// Delete District Admin
router.delete(
  "/delete-district-admin/:uid",
  zValidator({
    schema: districtAdminParam,
    type: "params",
  }),
  deleteDistrictAdmin
);

// Create District
router.post(
  "/create-district",
  zValidator({
    schema: createDistrictValidator,
    type: "body",
  }),
  createDistrict
);

// Update District
router.put(
  "/update-district/:id",
  zValidator({
    schema: districtParam,
    type: "params",
  }),
  zValidator({
    schema: updateDistrictValidator,
    type: "body",
  }),
  updateDistrict
);

// Delete District
router.delete(
  "/delete-district/:id",
  zValidator({
    schema: districtParam,
    type: "params",
  }),
  deleteDistrict
);

// Toggle District Status
router.put(
  "/toggle-district-status/:id",
  zValidator({
    schema: districtParam,
    type: "params",
  }),
  toggleDistrictStatus
);

// Toggle School Status
router.put(
  "/toggle-school-status/:id",
  zValidator({
    schema: districtParam,
    type: "params",
  }),
  toggleSchoolStatus
);

// Analytics routes
router.get('/analytics', getAnalytics);
router.get('/analytics/historical', getHistoricalAnalytics);
router.post('/analytics/analyze', analyzeDiaryEntries);
router.post('/analytics/update-incremental', updateAnalyticsIncremental);
router.get('/districts/:districtId/analytics', getDistrictAnalytics);
router.get('/districts/:districtId/analytics/historical', getDistrictHistoricalAnalytics);

// Class analytics routes
router.get('/classes/:classId/analytics', getClassAnalytics);
router.get('/classes/:classId/analytics/historical', getClassHistoricalAnalytics);

// Mental Health Analysis routes (INCREMENTAL)
router.post('/mental-health/analyze', analyzeAllStudentJournalsIncremental);
router.get('/mental-health/flagged-students', getFlaggedStudentsReport);

// School Management Routes
router.post(
  "/create-school",
  zValidator({
    schema: createSchoolBySuperAdminValidator,
    type: "body",
  }),
  createSchoolBySuperAdmin
);

router.get("/get-unassigned-schools", getUnassignedSchools);

router.put(
  "/update-school/:id",
  zValidator({
    schema: schoolParam,
    type: "params",
  }),
  zValidator({
    schema: updateSchoolBySuperAdminValidator,
    type: "body",
  }),
  updateSchoolBySuperAdmin
);

router.delete(
  "/delete-school/:id",
  zValidator({
    schema: schoolParam,
    type: "params",
  }),
  deleteSchoolBySuperAdmin
);

router.post(
  "/assign-school-to-district",
  zValidator({
    schema: assignSchoolToDistrictValidator,
    type: "body",
  }),
  assignSchoolToDistrict
);

router.post(
  "/unassign-school-from-district",
  zValidator({
    schema: unassignSchoolFromDistrictValidator,
    type: "body",
  }),
  unassignSchoolFromDistrict
);

// Get Students by Class ID
router.get("/get-students", getStudents);

// Classes Management Routes
router.get("/classes", getClasses);

// =============================================================================
// RESOURCE MANAGEMENT ROUTES
// =============================================================================

// Create Resource
router.post(
  "/resources",
  zValidator({
    schema: createResourceValidator,
    type: "body",
  }),
  createResource
);

// Get Resources
router.get("/resources", getResources);

// Update Resource
router.put(
  "/resources/:resourceId",
  zValidator({
    schema: updateResourceValidator,
    type: "body",
  }),
  updateResource
);

// Delete Resource (soft delete)
router.delete("/resources/:resourceId", deleteResource);

// Assign Resource
router.post(
  "/resources/assign",
  zValidator({
    schema: assignResourceValidator,
    type: "body",
  }),
  assignResource
);

// Get Resource Assignments
router.get("/resources/assignments", getResourceAssignments);

export { router as superAdminRoutes };
