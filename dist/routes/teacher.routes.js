"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.teacherRoutes = void 0;
const express_1 = require("express");
const mental_health_controller_1 = require("../controllers/mental-health.controller");
const router = (0, express_1.Router)();
exports.teacherRoutes = router;
router.get('/mental-health/flagged-students', mental_health_controller_1.getTeacherFlaggedStudents);
//# sourceMappingURL=teacher.routes.js.map