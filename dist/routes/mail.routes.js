"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mailRoutes = void 0;
const express_1 = require("express");
const zValidator_1 = require("../utils/zValidator");
const main_validator_1 = require("../validators/main.validator");
const mail_controller_1 = require("../controllers/mail.controller");
const router = (0, express_1.Router)();
exports.mailRoutes = router;
router.post("/", (0, zValidator_1.zValidator)({
    schema: main_validator_1.mailValidator,
    type: "body",
}), mail_controller_1.mailController);
//# sourceMappingURL=mail.routes.js.map