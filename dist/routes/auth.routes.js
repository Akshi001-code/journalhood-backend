"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = void 0;
const express_1 = require("express");
const verifyToken_1 = require("../utils/verifyToken");
const auth_controller_1 = require("../controllers/auth.controller");
const router = (0, express_1.Router)();
exports.authRoutes = router;
// Get current user with role information
// This endpoint requires authentication but no specific role
router.get("/me", verifyToken_1.verifyToken, auth_controller_1.getCurrentUser);
//# sourceMappingURL=auth.routes.js.map