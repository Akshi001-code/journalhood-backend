"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.teacherRoutes = void 0;
const express_1 = require("express");
const verifyToken_1 = require("../utils/verifyToken");
const verifyRole_1 = require("../utils/verifyRole");
const app_config_1 = require("../config/app.config");
const zValidator_1 = require("../utils/zValidator");
const school_admin_validator_1 = require("../validators/school-admin.validator");
const school_admin_controller_1 = require("../controllers/school-admin.controller");
const teachers_controller_1 = require("../controllers/teachers.controller");
const router = (0, express_1.Router)();
exports.teacherRoutes = router;
// Apply auth middleware to all routes
router.use(verifyToken_1.verifyToken);
// Teacher management routes (school admin only)
router.post("/", (0, verifyRole_1.verifyRole)([app_config_1.ROLES.SCHOOL_ADMIN]), (0, zValidator_1.zValidator)({ schema: school_admin_validator_1.createTeacherValidator, type: "body" }), school_admin_controller_1.createTeacher);
router.get("/", (0, verifyRole_1.verifyRole)([app_config_1.ROLES.SCHOOL_ADMIN, app_config_1.ROLES.DISTRICT_ADMIN]), school_admin_controller_1.getTeachers);
// NOTE: Parameterized routes moved to the bottom to avoid intercepting specific paths
// Teacher dashboard routes (teacher only)
router.get("/dashboard", (0, verifyRole_1.verifyRole)([app_config_1.ROLES.TEACHER]), teachers_controller_1.getDashboard);
router.get("/info", (0, verifyRole_1.verifyRole)([app_config_1.ROLES.SCHOOL_ADMIN, app_config_1.ROLES.DISTRICT_ADMIN, app_config_1.ROLES.TEACHER]), teachers_controller_1.getTeacherInfo);
router.get("/analytics/me", (0, verifyRole_1.verifyRole)([app_config_1.ROLES.TEACHER]), teachers_controller_1.getTeacherAnalytics);
// Students in teacher's class
router.get("/students", (0, verifyRole_1.verifyRole)([app_config_1.ROLES.TEACHER]), teachers_controller_1.getStudents);
router.post("/students", (0, verifyRole_1.verifyRole)([app_config_1.ROLES.TEACHER]), teachers_controller_1.createStudent);
// Resource routes (teacher only)
router.get("/resources/assigned", (0, verifyRole_1.verifyRole)([app_config_1.ROLES.TEACHER]), teachers_controller_1.getAssignedResources);
router.get("/resources/details/:resourceId", (0, verifyRole_1.verifyRole)([app_config_1.ROLES.TEACHER]), teachers_controller_1.getResourceDetails);
router.post("/resources/share", (0, verifyRole_1.verifyRole)([app_config_1.ROLES.TEACHER]), teachers_controller_1.shareResourceWithStudents);
router.get("/resources/shared", (0, verifyRole_1.verifyRole)([app_config_1.ROLES.TEACHER]), teachers_controller_1.getSharedResources);
router.get("/resources/delivered", (0, verifyRole_1.verifyRole)([app_config_1.ROLES.TEACHER]), teachers_controller_1.getDeliveredResources);
// Admin actions on specific teacher (keep last)
router.get("/:uid", (0, verifyRole_1.verifyRole)([app_config_1.ROLES.SCHOOL_ADMIN, app_config_1.ROLES.DISTRICT_ADMIN]), (0, zValidator_1.zValidator)({ schema: school_admin_validator_1.teacherIdParam, type: "params" }), school_admin_controller_1.getTeacher);
router.put("/:uid", (0, verifyRole_1.verifyRole)([app_config_1.ROLES.SCHOOL_ADMIN]), (0, zValidator_1.zValidator)({ schema: school_admin_validator_1.teacherIdParam, type: "params" }), (0, zValidator_1.zValidator)({ schema: school_admin_validator_1.updateTeacherValidator, type: "body" }), school_admin_controller_1.updateTeacher);
router.delete("/:uid", (0, verifyRole_1.verifyRole)([app_config_1.ROLES.SCHOOL_ADMIN]), (0, zValidator_1.zValidator)({ schema: school_admin_validator_1.teacherIdParam, type: "params" }), school_admin_controller_1.deleteTeacher);
router.put("/:uid/status", (0, verifyRole_1.verifyRole)([app_config_1.ROLES.SCHOOL_ADMIN]), (0, zValidator_1.zValidator)({ schema: school_admin_validator_1.teacherIdParam, type: "params" }), school_admin_controller_1.suspendOrUnsuspendTeacher);
//# sourceMappingURL=teachers.routes.js.map