import { Router } from "express";
import { zValidator } from "../utils/zValidator";
import { mailValidator } from "../validators/main.validator";
import { createDemoRequest, getDemoRequests, getInboxEmails } from "../controllers/demo.controller";
import { verifyToken } from "../utils/verifyToken";
import { verifyRole } from "../utils/verifyRole";
import { ROLES } from "../config/app.config";

const router = Router();

// Public endpoint to submit a demo request
router.post("/request", zValidator({ schema: mailValidator, type: "body" }), createDemoRequest);

// Super Admin endpoint to list demo requests
router.get("/requests", verifyToken, verifyRole([ROLES.SUPER_ADMIN]), getDemoRequests);

// Super Admin endpoint to fetch recent inbox emails
router.get("/inbox", verifyToken, verifyRole([ROLES.SUPER_ADMIN]), getInboxEmails);

export { router as demoRoutes };


