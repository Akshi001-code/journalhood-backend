"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.demoRoutes = void 0;
const express_1 = require("express");
const zValidator_1 = require("../utils/zValidator");
const main_validator_1 = require("../validators/main.validator");
const demo_controller_1 = require("../controllers/demo.controller");
const verifyToken_1 = require("../utils/verifyToken");
const verifyRole_1 = require("../utils/verifyRole");
const app_config_1 = require("../config/app.config");
const router = (0, express_1.Router)();
exports.demoRoutes = router;
// Public endpoint to submit a demo request
router.post("/request", (0, zValidator_1.zValidator)({ schema: main_validator_1.mailValidator, type: "body" }), demo_controller_1.createDemoRequest);
// Super Admin endpoint to list demo requests
router.get("/requests", verifyToken_1.verifyToken, (0, verifyRole_1.verifyRole)([app_config_1.ROLES.SUPER_ADMIN]), demo_controller_1.getDemoRequests);
// Super Admin endpoint to fetch recent inbox emails
router.get("/inbox", verifyToken_1.verifyToken, (0, verifyRole_1.verifyRole)([app_config_1.ROLES.SUPER_ADMIN]), demo_controller_1.getInboxEmails);
//# sourceMappingURL=demo.routes.js.map