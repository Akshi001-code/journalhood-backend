import { Router } from "express";
import { verifyToken } from "../utils/verifyToken";
import { getCurrentUser } from "../controllers/auth.controller";

const router: Router = Router();

// Get current user with role information
// This endpoint requires authentication but no specific role
router.get("/me", verifyToken, getCurrentUser);

export { router as authRoutes }; 