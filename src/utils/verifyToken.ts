import { Request, Response, NextFunction } from "express";
import admin from "../config/firebase.config";
import { DecodedIdToken } from "firebase-admin/auth";
import { ROLES } from "../config/app.config";

export const verifyToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Log request details
    console.log("🔒 Token verification request:", {
      path: req.path,
      method: req.method,
      hasAuthHeader: !!req.headers.authorization,
      authHeader: req.headers.authorization?.substring(0, 20) + '...'
    });

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.log("❌ No Authorization header found");
      return res.status(401).json({
        error: "Unauthorized - No Authorization header"
      });
    }

    if (!authHeader.startsWith('Bearer ')) {
      console.log("❌ Invalid Authorization header format");
      return res.status(401).json({
        error: "Unauthorized - Invalid Authorization header format"
      });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      console.log("❌ No token found in Authorization header");
      return res.status(401).json({
        error: "Unauthorized - No token provided"
      });
    }

    // Verify token
    console.log("🔍 Verifying token...");
    const decodedToken: DecodedIdToken = await admin
      .auth()
      .verifyIdToken(token);

    if (!decodedToken) {
      console.log("❌ Token verification failed");
      return res.status(401).json({
        error: "Unauthorized - Invalid token"
      });
    }

    // Get user's custom claims
    console.log("👤 Getting user claims for:", decodedToken.uid);
    const { customClaims } = await admin.auth().getUser(decodedToken.uid);
    
    if (!customClaims?.role) {
      console.log("❌ No role found in custom claims for user:", decodedToken.uid);
      return res.status(403).json({
        error: "Unauthorized - No role assigned"
      });
    }

    // Normalize the role to match ROLES enum
    const normalizedRole = customClaims.role.toLowerCase();
    const validRoles = Object.values(ROLES).map(role => role.toLowerCase());
    
    if (!validRoles.includes(normalizedRole)) {
      console.log(`❌ Invalid role found: ${normalizedRole}. Valid roles are:`, validRoles);
      return res.status(403).json({
        error: "Unauthorized - Invalid role format"
      });
    }

    // Set user with normalized role and claims
    req.user = {
      ...decodedToken,
      role: normalizedRole as ROLES,
      customClaims: {
        role: normalizedRole as ROLES,
        districtId: customClaims.districtId,
        districtName: customClaims.districtName,
        schoolId: customClaims.schoolId,
        schoolName: customClaims.schoolName,
        classId: customClaims.classId,
        className: customClaims.className,
        gradeId: customClaims.gradeId,
        teacherId: customClaims.teacherId,
        teacherName: customClaims.teacherName
      }
    };

    console.log("✅ Token verification successful:", {
      uid: req.user.uid,
      role: req.user.role,
      claims: {
        schoolId: req.user.customClaims.schoolId,
        districtId: req.user.customClaims.districtId,
        role: req.user.customClaims.role
      }
    });

    return next();
  } catch (error) {
    console.error("❌ Token verification error:", error);
    return res.status(401).json({
      error: "Unauthorized - Token verification failed",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
};
