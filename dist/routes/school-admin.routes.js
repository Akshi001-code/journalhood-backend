"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.schoolAdminRoutes = void 0;
const express_1 = require("express");
const verifyToken_1 = require("../utils/verifyToken");
const verifyRole_1 = require("../utils/verifyRole");
const app_config_1 = require("../config/app.config");
const school_admin_controller_1 = require("../controllers/school-admin.controller");
const mental_health_controller_1 = require("../controllers/mental-health.controller");
const zValidator_1 = require("../utils/zValidator");
const school_admin_validator_1 = require("../validators/school-admin.validator");
const router = (0, express_1.Router)();
exports.schoolAdminRoutes = router;
// routes for school admin
router.use(verifyToken_1.verifyToken, (0, verifyRole_1.verifyRole)([app_config_1.ROLES.SCHOOL_ADMIN]));
// School Overview
router.get("/overview", school_admin_controller_1.getSchoolOverview);
// create grades and divisions
router.post("/add-grades-and-divisions", (0, zValidator_1.zValidator)({
    schema: school_admin_validator_1.addGradesAndDivisionsValidator,
    type: "body",
}), school_admin_controller_1.addGradesAndDivisions);
// get grades and divisions
router.get("/get-grades-and-divisions", school_admin_controller_1.getGradesAndDivisions);
// update grades and divisions
router.put("/update-grades-and-divisions/:gradeId", (0, zValidator_1.zValidator)({
    schema: school_admin_validator_1.gradeIdParam,
    type: "params",
}), (0, zValidator_1.zValidator)({
    schema: school_admin_validator_1.updateGradesAndDivisionsValidator,
    type: "body",
}), school_admin_controller_1.updateGradesAndDivisions);
// delete grades and divisions
router.delete("/delete-grades-and-divisions/:gradeId", (0, zValidator_1.zValidator)({
    schema: school_admin_validator_1.gradeIdParam,
    type: "params",
}), school_admin_controller_1.deleteGradesAndDivisions);
// Analytics
router.get("/analytics", school_admin_controller_1.getSchoolAnalytics);
router.get("/analytics/historical", school_admin_controller_1.getSchoolHistoricalAnalytics);
// Class analytics routes for school admin
router.get('/classes/:classId/analytics', school_admin_controller_1.getClassAnalytics);
router.get('/classes/:classId/analytics/historical', school_admin_controller_1.getClassHistoricalAnalytics);
// Resource Management Routes
router.get("/resources/assigned", school_admin_controller_1.getAssignedResources);
router.get("/resources/assignments", school_admin_controller_1.getResourceAssignments);
router.get("/resources/teachers", school_admin_controller_1.getAvailableTeachers);
// Mental Health Routes
router.get('/mental-health/flagged-students', mental_health_controller_1.getSchoolFlaggedStudents);
// get students
router.get("/get-students", school_admin_controller_1.getStudents);
//# sourceMappingURL=school-admin.routes.js.map