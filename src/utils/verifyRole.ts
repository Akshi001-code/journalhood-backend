import { Request, Response, NextFunction } from "express";
import { ROLES } from "../config/app.config";

export const verifyRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        console.log("No user object in request");
        return res.status(403).json({
          error: "Unauthorized - No user found"
        });
      }

      const userRole = req.user.role?.toLowerCase();
      const normalizedAllowedRoles = allowedRoles.map(role => role.toLowerCase());

      console.log("Role Check:", {
        userRole,
        allowedRoles: normalizedAllowedRoles,
        user: {
          uid: req.user.uid,
          role: req.user.role,
          customClaims: req.user.customClaims
        }
      });

      if (!userRole || !normalizedAllowedRoles.includes(userRole)) {
        console.log(`Role verification failed - User role: ${userRole} not in allowed roles:`, normalizedAllowedRoles);
        return res.status(403).json({
          error: "Unauthorized - Invalid role"
        });
      }

      return next();
    } catch (error) {
      console.error("Verify Role Error:", error);
      res.status(403).json({
        error: "Unauthorized - Role verification failed"
      });
    }
  };
};
