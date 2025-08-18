"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.districtAdminRoutes = void 0;
const express_1 = require("express");
const verifyToken_1 = require("../utils/verifyToken");
const verifyRole_1 = require("../utils/verifyRole");
const app_config_1 = require("../config/app.config");
const district_admin_controller_1 = require("../controllers/district-admin.controller");
const zValidator_1 = require("../utils/zValidator");
const district_admin_validator_1 = require("../validators/district-admin.validator");
const mental_health_controller_1 = require("../controllers/mental-health.controller");
const router = (0, express_1.Router)();
exports.districtAdminRoutes = router;
// Only district-admin can access these routes
router.use(verifyToken_1.verifyToken, (0, verifyRole_1.verifyRole)([app_config_1.ROLES.DISTRICT_ADMIN]));
// District Overview
router.get("/overview", district_admin_controller_1.getDistrictOverview);
// School Routes
router.post("/schools", (0, zValidator_1.zValidator)({
    schema: district_admin_validator_1.createSchoolValidator,
    type: "body",
}), district_admin_controller_1.createSchool);
router.get("/schools", (0, zValidator_1.zValidator)({
    schema: district_admin_validator_1.schoolsQueryValidator,
    type: "query",
}), district_admin_controller_1.getSchools);
router.put("/schools/:schoolId", (0, zValidator_1.zValidator)({
    schema: district_admin_validator_1.schoolParam,
    type: "params",
}), (0, zValidator_1.zValidator)({
    schema: district_admin_validator_1.updateSchoolValidator,
    type: "body",
}), district_admin_controller_1.updateSchool);
router.delete("/schools/:schoolId", (0, zValidator_1.zValidator)({
    schema: district_admin_validator_1.schoolParam,
    type: "params",
}), district_admin_controller_1.deleteSchool);
// School analytics routes for district admin
router.get('/schools/:schoolId/analytics', district_admin_controller_1.getSchoolAnalytics);
router.get('/schools/:schoolId/analytics/historical', district_admin_controller_1.getSchoolHistoricalAnalytics);
// Class analytics routes for district admin
router.get('/classes/:classId/analytics', district_admin_controller_1.getClassAnalytics);
router.get('/classes/:classId/analytics/historical', district_admin_controller_1.getClassHistoricalAnalytics);
// School Admin Routes
router.post("/create-school-admin", (0, zValidator_1.zValidator)({
    schema: district_admin_validator_1.createSchoolAdminValidator,
    type: "body",
}), district_admin_controller_1.createSchoolAdmin);
router.get("/get-school-admins", district_admin_controller_1.getSchoolAdmins);
router.put("/update-school-admin/:uid", (0, zValidator_1.zValidator)({
    schema: district_admin_validator_1.schoolAdminParam,
    type: "params",
}), (0, zValidator_1.zValidator)({
    schema: district_admin_validator_1.updateSchoolAdminValidator,
    type: "body",
}), district_admin_controller_1.updateSchoolAdmin);
router.put("/suspend-school-admin/:uid", (0, zValidator_1.zValidator)({
    schema: district_admin_validator_1.schoolAdminParam,
    type: "params",
}), district_admin_controller_1.suspendOrUnsuspendSchoolAdmin);
router.delete("/delete-school-admin/:uid", (0, zValidator_1.zValidator)({
    schema: district_admin_validator_1.schoolAdminParam,
    type: "params",
}), district_admin_controller_1.deleteSchoolAdmin);
// Analytics
router.get("/analytics", district_admin_controller_1.getDistrictAnalytics);
router.get("/analytics/historical", district_admin_controller_1.getDistrictHistoricalAnalytics);
// Resource Management Routes
router.get("/resources", district_admin_controller_1.getAssignedResources);
router.post("/resources/assign", district_admin_controller_1.assignResourceToSchoolAdmin);
router.get("/resource-assignments", district_admin_controller_1.getResourceAssignments);
router.get("/school-admins", district_admin_controller_1.getAvailableSchoolAdmins);
router.get('/mental-health/flagged-students', mental_health_controller_1.getDistrictFlaggedStudents);
//# sourceMappingURL=district-admin.routes.js.map