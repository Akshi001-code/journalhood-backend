import { Request, Response } from "express";
import admin from "../config/firebase.config";
import { UserRecord } from "firebase-admin/auth";

interface UserData {
  id: string;
  email: string;
  displayName: string;
  phoneNumber: string | undefined;
  role: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  districtId: string | undefined;
  districtName: string | undefined;
  schoolId: string | undefined;
  schoolName: string | undefined;
  schoolAddress: string | undefined;
  schoolZipCode: string | undefined;
  gradeId: string | undefined;
  gradeName: string | undefined;
  division: string | undefined;
  customClaims: Record<string, any>;
  classId: string | undefined;
  studentCount: number | undefined;
}

// Get current user with role information
export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    const user = req.user; // This comes from verifyToken middleware
    
    if (!user?.uid) {
      return res.status(401).json({
        error: "Unauthorized - No user found",
      });
    }

    // Get user record from Firebase Admin to get custom claims and other info
    const userRecord: UserRecord = await admin.auth().getUser(user.uid);
    
    // Format user data according to your User interface
    const userData: UserData = {
      id: userRecord.uid,
      email: userRecord.email || '',
      displayName: userRecord.displayName || '',
      phoneNumber: userRecord.phoneNumber || undefined,
      role: userRecord.customClaims?.role || 'student',
      status: userRecord.disabled ? 'suspended' : 'active',
      createdAt: new Date(userRecord.metadata.creationTime),
      updatedAt: new Date(userRecord.metadata.lastSignInTime || userRecord.metadata.creationTime),
      // Role-specific fields from custom claims
      districtId: userRecord.customClaims?.districtId || undefined,
      districtName: userRecord.customClaims?.districtName || undefined,
      schoolId: userRecord.customClaims?.schoolId || undefined,
      schoolName: userRecord.customClaims?.schoolName || undefined,
      schoolAddress: userRecord.customClaims?.schoolAddress || undefined,
      schoolZipCode: userRecord.customClaims?.schoolZipCode || undefined,
      gradeId: userRecord.customClaims?.gradeId || undefined,
      gradeName: userRecord.customClaims?.gradeName || undefined,
      division: userRecord.customClaims?.division || undefined,
      // Include all custom claims for role-specific data
      customClaims: userRecord.customClaims || {},
      // Initialize teacher-specific fields
      classId: undefined,
      studentCount: undefined,
    };

    // If user is a teacher, get additional teacher-specific data
    if (userRecord.customClaims?.role === 'teacher') {
      // Get the class information for this teacher
      const classesSnapshot = await admin.firestore()
        .collection('classes')
        .where('teacherId', '==', userRecord.uid)
        .get();

      if (!classesSnapshot.empty) {
        const classDoc = classesSnapshot.docs[0];
        if (classDoc) {
          const classData = classDoc.data();
          userData.classId = classDoc.id;
          userData.studentCount = classData.studentCount || 0;
        }
      }
    }

    return res.status(200).json(userData);
  } catch (error) {
    console.error("Error getting current user:", error);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
}; 