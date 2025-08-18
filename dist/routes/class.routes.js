"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const class_controller_1 = require("../controllers/class.controller");
const verifyToken_1 = require("../utils/verifyToken");
const verifyRole_1 = require("../utils/verifyRole");
const app_config_1 = require("../config/app.config");
const zValidator_1 = require("../utils/zValidator");
const school_admin_validator_1 = require("../validators/school-admin.validator");
const router = (0, express_1.Router)();
// Apply auth middleware to all routes
router.use(verifyToken_1.verifyToken);
router.use((0, verifyRole_1.verifyRole)([app_config_1.ROLES.SCHOOL_ADMIN, app_config_1.ROLES.SUPER_ADMIN, app_config_1.ROLES.DISTRICT_ADMIN]));
// Class routes
router.post("/", (0, zValidator_1.zValidator)({ schema: school_admin_validator_1.createClassSchema, type: "body" }), class_controller_1.createClass);
router.get("/", class_controller_1.getClasses);
router.put("/:classId", (0, zValidator_1.zValidator)({ schema: school_admin_validator_1.classParamSchema, type: "params" }), (0, zValidator_1.zValidator)({ schema: school_admin_validator_1.updateClassSchema, type: "body" }), class_controller_1.updateClass);
router.delete("/:classId", (0, zValidator_1.zValidator)({ schema: school_admin_validator_1.classParamSchema, type: "params" }), class_controller_1.deleteClass);
router.post("/:classId/assign-teacher", (0, zValidator_1.zValidator)({ schema: school_admin_validator_1.classParamSchema, type: "params" }), class_controller_1.assignTeacher);
exports.default = router;
//# sourceMappingURL=class.routes.js.map