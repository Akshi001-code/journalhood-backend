"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.superAdminRoutes = void 0;
const express_1 = require("express");
const verifyToken_1 = require("../utils/verifyToken");
const verifyRole_1 = require("../utils/verifyRole");
const super_admin_controller_1 = require("../controllers/super-admin.controller");
const mental_health_controller_1 = require("../controllers/mental-health.controller");
const mental_health_incremental_controller_1 = require("../controllers/mental-health-incremental.controller");
const zValidator_1 = require("../utils/zValidator");
const super_admin_validator_1 = require("../validators/super-admin.validator");
const app_config_1 = require("../config/app.config");
const router = (0, express_1.Router)();
exports.superAdminRoutes = router;
// School analytics routes (must come BEFORE the global super-admin lock)
router.get('/schools/:schoolId/analytics', verifyToken_1.verifyToken, (0, verifyRole_1.verifyRole)([app_config_1.ROLES.SUPER_ADMIN, app_config_1.ROLES.DISTRICT_ADMIN, app_config_1.ROLES.SCHOOL_ADMIN]), super_admin_controller_1.getSchoolAnalytics);
router.get('/schools/:schoolId/analytics/historical', verifyToken_1.verifyToken, (0, verifyRole_1.verifyRole)([app_config_1.ROLES.SUPER_ADMIN, app_config_1.ROLES.DISTRICT_ADMIN, app_config_1.ROLES.SCHOOL_ADMIN]), super_admin_controller_1.getSchoolHistoricalAnalytics);
// Only super-admin can access these routes
router.use(verifyToken_1.verifyToken, (0, verifyRole_1.verifyRole)([app_config_1.ROLES.SUPER_ADMIN]));
// Test email endpoint
router.post("/test-email", super_admin_controller_1.testEmail);
// Test Firebase email endpoint
router.post("/test-firebase-email", super_admin_controller_1.testFirebaseEmail);
// Routes
// Create District Admin
router.post("/create-district-admin", (0, zValidator_1.zValidator)({
    schema: super_admin_validator_1.createDistrictAdminValidator,
    type: "body",
}), super_admin_controller_1.createDistrictAdmin);
// Create Multiple District Admins
router.post("/create-multiple-district-admins", (0, zValidator_1.zValidator)({
    schema: super_admin_validator_1.createMutlipleDistrictAdminsValidator,
    type: "body",
}), super_admin_controller_1.createMultipleDistrictAdmins);
// Get District Admins
router.get("/get-district-admins", super_admin_controller_1.getDistrictAdmins);
// Get All Districts
router.get("/get-all-districts", super_admin_controller_1.getAllDistricts);
// Get Districts
router.get("/get-districts", super_admin_controller_1.getSystemStats);
// Get Schools
router.get("/get-schools", super_admin_controller_1.getAllSchools);
// Get All Schools
router.get("/get-all-schools", super_admin_controller_1.getAllSchools);
// Get System Stats
router.get("/get-system-stats", super_admin_controller_1.getSystemStats);
// Update District Admin
router.put("/update-district-admin/:uid", (0, zValidator_1.zValidator)({
    schema: super_admin_validator_1.districtAdminParam,
    type: "params",
}), (0, zValidator_1.zValidator)({
    schema: super_admin_validator_1.updateDistrictAdminValidator,
    type: "body",
}), super_admin_controller_1.updateDistrictAdmin);
// suspend or unsuspend district admin
router.put("/suspend-district-admin/:uid", (0, zValidator_1.zValidator)({
    schema: super_admin_validator_1.districtAdminParam,
    type: "params",
}), super_admin_controller_1.suspendOrUnsuspendDistrictAdmin);
// Delete District Admin
router.delete("/delete-district-admin/:uid", (0, zValidator_1.zValidator)({
    schema: super_admin_validator_1.districtAdminParam,
    type: "params",
}), super_admin_controller_1.deleteDistrictAdmin);
// Create District
router.post("/create-district", (0, zValidator_1.zValidator)({
    schema: super_admin_validator_1.createDistrictValidator,
    type: "body",
}), super_admin_controller_1.createDistrict);
// Update District
router.put("/update-district/:id", (0, zValidator_1.zValidator)({
    schema: super_admin_validator_1.districtParam,
    type: "params",
}), (0, zValidator_1.zValidator)({
    schema: super_admin_validator_1.updateDistrictValidator,
    type: "body",
}), super_admin_controller_1.updateDistrict);
// Delete District
router.delete("/delete-district/:id", (0, zValidator_1.zValidator)({
    schema: super_admin_validator_1.districtParam,
    type: "params",
}), super_admin_controller_1.deleteDistrict);
// Toggle District Status
router.put("/toggle-district-status/:id", (0, zValidator_1.zValidator)({
    schema: super_admin_validator_1.districtParam,
    type: "params",
}), super_admin_controller_1.toggleDistrictStatus);
// Toggle School Status
router.put("/toggle-school-status/:id", (0, zValidator_1.zValidator)({
    schema: super_admin_validator_1.districtParam,
    type: "params",
}), super_admin_controller_1.toggleSchoolStatus);
// Analytics routes
router.get('/analytics', super_admin_controller_1.getAnalytics);
router.get('/analytics/historical', super_admin_controller_1.getHistoricalAnalytics);
router.post('/analytics/analyze', super_admin_controller_1.analyzeDiaryEntries);
router.post('/analytics/update-incremental', super_admin_controller_1.updateAnalyticsIncremental);
router.get('/districts/:districtId/analytics', super_admin_controller_1.getDistrictAnalytics);
router.get('/districts/:districtId/analytics/historical', super_admin_controller_1.getDistrictHistoricalAnalytics);
// Class analytics routes
router.get('/classes/:classId/analytics', super_admin_controller_1.getClassAnalytics);
router.get('/classes/:classId/analytics/historical', super_admin_controller_1.getClassHistoricalAnalytics);
// Mental Health Analysis routes (INCREMENTAL)
router.post('/mental-health/analyze', mental_health_incremental_controller_1.analyzeAllStudentJournalsIncremental);
router.get('/mental-health/flagged-students', mental_health_controller_1.getFlaggedStudentsReport);
// School Management Routes
router.post("/create-school", (0, zValidator_1.zValidator)({
    schema: super_admin_validator_1.createSchoolBySuperAdminValidator,
    type: "body",
}), super_admin_controller_1.createSchoolBySuperAdmin);
router.get("/get-unassigned-schools", super_admin_controller_1.getUnassignedSchools);
router.put("/update-school/:id", (0, zValidator_1.zValidator)({
    schema: super_admin_validator_1.schoolParam,
    type: "params",
}), (0, zValidator_1.zValidator)({
    schema: super_admin_validator_1.updateSchoolBySuperAdminValidator,
    type: "body",
}), super_admin_controller_1.updateSchoolBySuperAdmin);
router.delete("/delete-school/:id", (0, zValidator_1.zValidator)({
    schema: super_admin_validator_1.schoolParam,
    type: "params",
}), super_admin_controller_1.deleteSchoolBySuperAdmin);
router.post("/assign-school-to-district", (0, zValidator_1.zValidator)({
    schema: super_admin_validator_1.assignSchoolToDistrictValidator,
    type: "body",
}), super_admin_controller_1.assignSchoolToDistrict);
router.post("/unassign-school-from-district", (0, zValidator_1.zValidator)({
    schema: super_admin_validator_1.unassignSchoolFromDistrictValidator,
    type: "body",
}), super_admin_controller_1.unassignSchoolFromDistrict);
// Get Students by Class ID
router.get("/get-students", super_admin_controller_1.getStudents);
// Classes Management Routes
router.get("/classes", super_admin_controller_1.getClasses);
// =============================================================================
// RESOURCE MANAGEMENT ROUTES
// =============================================================================
// Create Resource
router.post("/resources", (0, zValidator_1.zValidator)({
    schema: super_admin_validator_1.createResourceValidator,
    type: "body",
}), super_admin_controller_1.createResource);
// Get Resources
router.get("/resources", super_admin_controller_1.getResources);
// Update Resource
router.put("/resources/:resourceId", (0, zValidator_1.zValidator)({
    schema: super_admin_validator_1.updateResourceValidator,
    type: "body",
}), super_admin_controller_1.updateResource);
// Delete Resource (soft delete)
router.delete("/resources/:resourceId", super_admin_controller_1.deleteResource);
// Assign Resource
router.post("/resources/assign", (0, zValidator_1.zValidator)({
    schema: super_admin_validator_1.assignResourceValidator,
    type: "body",
}), super_admin_controller_1.assignResource);
// Get Resource Assignments
router.get("/resources/assignments", super_admin_controller_1.getResourceAssignments);
//# sourceMappingURL=super-admin.routes.js.map