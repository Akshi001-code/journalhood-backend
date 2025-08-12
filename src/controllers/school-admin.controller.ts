import { Request, Response } from "express";
import {
  TAddGradesAndDivisions,
  TCreateTeacher,
  TGradeIdParam,
  TTeacherIdParam,
  TUpdateGradesAndDivisions,
} from "../validators/school-admin.validator";
import { firestore } from "firebase-admin";
import admin from "../config/firebase.config";
import { DEFAULT_PASSWORDS, ROLES } from "../config/app.config";
import { FirebaseAuthError } from "firebase-admin/auth";
import { transporter } from "../config/nodemailer.config";
import { createHierarchicalClaims } from "../utils/roleHierarchy";

// addGradesAndDivisions
export const addGradesAndDivisions = async (req: Request, res: Response) => {
  try {
    const { uid } = req.user!;
    const { gradeId, divisionCount, divisionNames }: TAddGradesAndDivisions =
      req.body;

    const gradeRef = firestore()
      .collection("schools")
      .doc(uid)
      .collection("grades")
      .doc(gradeId);

    const batch = firestore().batch();

    batch.set(gradeRef, { gradeId });

    for (let i = 1; i <= divisionCount; i++) {
      const divisionRef = gradeRef.collection("divisions").doc(i.toString());
      batch.set(divisionRef, {
        divisionId: i,
        divisionName: divisionNames[i - 1],
      });
    }

    await batch.commit();

    return res.status(200).json({
      message: `Grade ${gradeId} with ${divisionCount} divisions created successfully.`,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

// updateGradesAndDivisions
export const updateGradesAndDivisions = async (req: Request, res: Response) => {
  try {
    const { uid } = req.user!;
    const { gradeId }: TGradeIdParam = req.params as TGradeIdParam;
    const { divisionCount, divisionNames }: TUpdateGradesAndDivisions =
      req.body;

    const gradeRef = firestore()
      .collection("schools")
      .doc(uid)
      .collection("grades")
      .doc(gradeId);

    const batch = firestore().batch();

    for (let i = 1; i <= divisionCount; i++) {
      const divisionRef = gradeRef.collection("divisions").doc(i.toString());
      batch.set(divisionRef, {
        divisionId: i,
        divisionName: divisionNames[i - 1],
      });
    }

    await batch.commit();

    return res.status(200).json({
      message: `Grade ${gradeId} updated with ${divisionCount} divisions successfully.`,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

// deleteGradesAndDivisions
export const deleteGradesAndDivisions = async (req: Request, res: Response) => {
  try {
    const { uid } = req.user!;
    const { gradeId }: TGradeIdParam = req.params as TGradeIdParam;

    const gradeRef = firestore()
      .collection("schools")
      .doc(uid)
      .collection("grades")
      .doc(gradeId);

    const batch = firestore().batch();

    const divisions = await gradeRef.collection("divisions").listDocuments();

    divisions.forEach((division) => batch.delete(division));

    batch.delete(gradeRef);

    await batch.commit();

    return res.status(200).json({
      message: `Grade ${gradeId} deleted successfully.`,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

// getGradesAndDivisions
export const getGradesAndDivisions = async (req: Request, res: Response) => {
  try {
    const { uid } = req.user!;

    const grades = await firestore()
      .collection("schools")
      .doc(uid)
      .collection("grades")
      .get();

    const gradesAndDivisions = await Promise.all(
      grades.docs.map(async (grade) => {
        const divisionsSnapshot = await grade.ref.collection("divisions").get();
        const divisions = divisionsSnapshot.docs.map((division) =>
          division.data()
        );
        return {
          gradeId: grade.id,
          divisions,
        };
      })
    );

    return res.status(200).json({
      gradesAndDivisions,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

// getSchoolOverview
export const getSchoolOverview = async (req: Request, res: Response) => {
  try {
    const { uid } = req.user!;
    
    // Get school admin's custom claims to get the school ID
    const schoolAdmin = await admin.auth().getUser(uid);
    const schoolId = schoolAdmin.customClaims?.schoolId;
    
    if (!schoolId) {
      return res.status(400).json({ message: "School admin's school ID not found" });
    }

    // Get all classes for the school
    const classesSnapshot = await admin.firestore()
      .collection("classes")
      .where("schoolId", "==", schoolId)
      .get();

    interface ClassData {
      id: string;
      gradeName: string;
      division: string;
      teacherName?: string;
      studentCount: number;
      maxStudents: number;
      status: "active" | "inactive";
    }

    const classes = classesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ClassData[];

    // Get all teachers for the school
    const teachersSnapshot = await admin.auth()
      .listUsers()
      .then(result => result.users.filter(user => 
        user.customClaims?.schoolId === schoolId && 
        user.customClaims?.role === 'teacher'
      ));

    // Get all students for the school
    const studentsSnapshot = await admin.auth()
      .listUsers()
      .then(result => result.users.filter(user => 
        user.customClaims?.schoolId === schoolId && 
        user.customClaims?.role === 'student'
      ));

    // Calculate real studentCount for each class
    const classesWithRealCounts = classes.map(cls => {
      const count = studentsSnapshot.filter(student => student.customClaims?.classId === cls.id).length;
      return { ...cls, studentCount: count };
    });

    return res.status(200).json({
      classes: classesWithRealCounts,
      teachers: teachersSnapshot.length,
      students: studentsSnapshot.length
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

// createTeacher
export const createTeacher = async (req: Request, res: Response) => {
  try {
    const { uid: schoolAdminId } = req.user!;
    const {
      name,
      email,
      phone,
      gradeId,
      gradeName,
      division,
    }: TCreateTeacher = req.body;

    try {
      // Get school admin's custom claims to get the school ID
      const schoolAdmin = await admin.auth().getUser(schoolAdminId);
      const schoolId = schoolAdmin.customClaims?.schoolId;
      
      if (!schoolId) {
        return res.status(400).json({ message: "School admin's school ID not found" });
      }

      // Get school info to get districtId and name
      const schoolDoc = await admin.firestore()
        .collection("schools")
        .doc(schoolId)
        .get();
      
      if (!schoolDoc.exists) {
        return res.status(400).json({ message: "School information not found" });
      }
      
      const schoolData = schoolDoc.data();
      if (!schoolData || !schoolData.districtId || !schoolData.name) {
        return res.status(400).json({ message: "School information is incomplete" });
      }

      // Get district info to get name
      const districtDoc = await admin.firestore()
        .collection("districts")
        .doc(schoolData.districtId)
        .get();

      const districtData = districtDoc.data();
      const districtName = districtData?.name || 'Unknown District';

      // Update school document with district name if missing
      if (!schoolData.districtName) {
        await admin.firestore()
          .collection("schools")
          .doc(schoolId)
          .update({
            districtName,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
      }

      // Create user in Firebase Auth
      const userRecord = await admin.auth().createUser({
        displayName: name,
        email,
        password: DEFAULT_PASSWORDS.TEACHER || 'Teacher@123',
        phoneNumber: phone || null,
        emailVerified: false,
      });

      // Prepare claims object without undefined values
      const claimsData: Record<string, any> = {
        districtId: schoolData.districtId,
        districtName: districtData?.name,
        schoolId: schoolId,
        schoolName: schoolData.name,
      };

      // Only add optional fields if they exist
      if (gradeName) {
        // Extract grade number from gradeName (e.g., "Grade 6" -> "6")
        const gradeNumber = gradeName.match(/\d+/)?.[0];
        if (gradeNumber) {
          claimsData.gradeId = gradeNumber;
          claimsData.gradeName = gradeName;
        }
      }
      if (division) claimsData.division = division;
      if (claimsData.gradeId && gradeName && division) {
        claimsData.className = `${gradeName} ${division}`;
      }

      // Create hierarchical claims
      const claims = createHierarchicalClaims(
        ROLES.TEACHER,
        schoolAdminId,
        claimsData
      );

      // Set custom claims
      await admin.auth().setCustomUserClaims(userRecord.uid, claims);

      // Prepare user document data without undefined values
      const userData: Record<string, any> = {
        name,
        email,
        role: ROLES.TEACHER,
        parentId: schoolAdminId,
        districtId: schoolData.districtId,
        districtName: districtData?.name,
        schoolId: schoolId,
        schoolName: schoolData.name,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        status: "active"
      };

      // Only add optional fields if they exist
      if (gradeId) userData.gradeId = gradeId;
      if (gradeName) userData.gradeName = gradeName;
      if (division) userData.division = division;

      // Create a document in the users collection
      await admin.firestore().collection("users").doc(userRecord.uid).set(userData);

      // If class-related fields are provided, update the user document with assignment info
      if (gradeId && gradeName && division) {
        await admin.firestore().collection("users").doc(userRecord.uid).update({
          gradeId,
          gradeName,
          division,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      // Only create class document if all class-related fields are provided
      if (gradeId && gradeName && division) {
      const classRef = admin.firestore().collection("classes").doc();
      await classRef.set({
          schoolId: schoolId,
        gradeId,
        gradeName,
        division,
        teacherId: userRecord.uid,
        teacherName: name,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          status: "active",
          studentCount: 0,
          maxStudents: 25
      });
      }

      // Always generate and send password reset link
      if (email) {
        const [resetLink, verifyEmailLink] = await Promise.all([
          admin.auth().generatePasswordResetLink(email),
          admin.auth().generateEmailVerificationLink(email)
        ]);

        // Try to send welcome email (prefer Titan env, fallback to generic EMAIL)
        const fromAddress =
          process.env.TITAN_EMAIL ||
          (process.env as any).titanemail ||
          process.env.EMAIL ||
          "noreply@journalhood.com";

        if (transporter && fromAddress) {
          try {
            await transporter.sendMail({
              from: fromAddress,
              to: email,
              subject: "Welcome to JournalHood - Set Up Your Account",
              html: `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>Welcome to JournalHood</title>
                  <style>
                    body {
                      font-family: Arial, sans-serif;
                      background-color: #f4f4f4;
                      margin: 0;
                      padding: 0;
                    }
                    .container {
                      max-width: 600px;
                      margin: 40px auto;
                      background: #fff;
                      border-radius: 8px;
                      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
                      padding: 32px;
                    }
                    .header {
                      text-align: center;
                      margin-bottom: 32px;
                    }
                    .header img {
                      width: 120px;
                    }
                    .info-box {
                      background: #f0f4ff;
                      border-left: 4px solid #6366f1;
                      padding: 16px 24px;
                      margin-bottom: 32px;
                      border-radius: 4px;
                    }
                    .button {
                      display: inline-block;
                      background: #6366f1;
                      color: #fff;
                      padding: 12px 32px;
                      border-radius: 4px;
                      text-decoration: none;
                      font-weight: bold;
                      margin: 16px 0;
                    }
                    .footer {
                      text-align: center;
                      color: #888;
                      font-size: 13px;
                      margin-top: 32px;
                    }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">
                      <img src="https://journalhood.com/logo.png" alt="JournalHood Logo" />
                      <h2>Welcome to JournalHood!</h2>
                    </div>
                    <div class="info-box">
                      <p>Hi ${name},</p>
                      <p>Your Teacher account has been created. Please set your password to activate your account and start using JournalHood.</p>
                    </div>
                    <a href="${resetLink}" class="button">Set Your Password</a>
                    <div style="margin: 24px 0;">
                      <p>Once your password is set, you can log in and start teaching and managing your classes.</p>
                    </div>
                    <div class="footer">
                      &copy; ${new Date().getFullYear()} JournalHood. All rights reserved.
                    </div>
                  </div>
                </body>
                </html>
              `,
            });
          } catch (emailError) {
            console.error("Error sending welcome email:", emailError);
            // Don't throw error, just log it
          }
        } else {
          console.warn("Email transporter not configured or from address missing, skipping welcome email");
        }
      }

      return res.status(200).json({
        message: "Teacher created successfully",
        uid: userRecord.uid,
      });
    } catch (firebaseError) {
      console.error("Firebase error creating teacher:", firebaseError);
      if (firebaseError instanceof FirebaseAuthError) {
        return res.status(400).json({
          message: "Failed to create teacher",
          error: firebaseError.message 
        });
      }
      throw firebaseError;
    }
  } catch (error) {
    console.error("Error creating teacher:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

// updateTeacher
export const updateTeacher = async (req: Request, res: Response) => {
  try {
    const { uid }: TTeacherIdParam = req.params as TTeacherIdParam;
    const { name, email, phone, gradeId, gradeName, division }: TCreateTeacher = req.body;

    const teacher = await admin.auth().getUser(uid);

    // Update user profile
    if (teacher.email !== email) {
      await admin.auth().updateUser(uid, {
        displayName: name,
        email,
        password: DEFAULT_PASSWORDS.TEACHER,
        phoneNumber: phone || null,
        emailVerified: false,
      });
    } else {
      await admin.auth().updateUser(uid, {
        displayName: name,
        password: DEFAULT_PASSWORDS.TEACHER,
        email,
        phoneNumber: phone || null,
      });
    }

    // Update custom claims with class information
    await admin.auth().setCustomUserClaims(uid, {
      ...teacher.customClaims,
      role: ROLES.TEACHER,
      gradeId: gradeId || '',
      gradeName: gradeName || '',
      division: division || '',
    });

    // Update Firestore user document with assignment info
    await admin.firestore().collection("users").doc(uid).update({
      gradeId: gradeId || '',
      gradeName: gradeName || '',
      division: division || '',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Get the school ID from the teacher's custom claims
    const schoolId = teacher.customClaims?.schoolId;

    // If class information is provided, update the class assignment
    if (schoolId && gradeId && gradeName && division) {
      // Find the class document
      const classesSnapshot = await admin.firestore()
        .collection('classes')
        .where('schoolId', '==', schoolId)
        .where('gradeName', '==', gradeName)
        .where('division', '==', division)
        .get();

      if (!classesSnapshot.empty) {
        const classDoc = classesSnapshot.docs[0];
        if (classDoc) {  // Add explicit check
        // Update the class with teacher information
        await admin.firestore()
          .collection('classes')
          .doc(classDoc.id)
          .update({
            teacherId: uid,
            teacherName: name,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
        }
      }
    }

    return res.status(200).json({
      message: "Teacher updated successfully",
    });
  } catch (error) {
    if (error instanceof FirebaseAuthError) {
      console.log(error.message);
      return res.status(400).json({
        error: error.message,
      });
    }
    console.log(error);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

// deleteTeacher
export const deleteTeacher = async (req: Request, res: Response) => {
  try {
    const { uid }: TTeacherIdParam = req.params as TTeacherIdParam;

    // Try to get teacher info from Firebase Auth
    let teacher;
    let schoolId;
    try {
      teacher = await admin.auth().getUser(uid);
      schoolId = teacher.customClaims?.schoolId;
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        // User already deleted from Auth, try to get schoolId from Firestore
        const teacherDoc = await admin.firestore().collection('users').doc(uid).get();
        if (teacherDoc && teacherDoc.exists) {
          schoolId = teacherDoc.data()?.schoolId;
        }
      } else {
        throw error;
      }
    }

    // If teacher has a school, find and update any classes they're assigned to
    if (schoolId) {
      const classesSnapshot = await admin.firestore()
        .collection('classes')
        .where('schoolId', '==', schoolId)
        .where('teacherId', '==', uid)
        .get();

      // Update all classes to remove teacher assignment
      const batch = admin.firestore().batch();
      classesSnapshot.forEach((doc) => {
        batch.update(doc.ref, { teacherId: null });
      });
      await batch.commit();
    }

    // Delete teacher from Firestore
    await admin.firestore().collection('users').doc(uid).delete();

    // Try to delete from Auth (in case not already deleted)
    try {
      await admin.auth().deleteUser(uid);
    } catch (error: any) {
      if (error.code !== 'auth/user-not-found') {
        throw error;
      }
      // If already deleted, ignore
    }

    return res.status(200).json({ message: 'Teacher deleted successfully.' });
  } catch (error) {
    console.error('Error deleting teacher:', error);
    return res.status(500).json({ error: 'Failed to delete teacher.' });
  }
};

// getTeachers
export const getTeachers = async (req: Request, res: Response) => {
  try {
    const { uid } = req.user!;

    // Get school admin's custom claims to get the school ID
    const schoolAdmin = await admin.auth().getUser(uid);
    const schoolId = schoolAdmin.customClaims?.schoolId;
    
    if (!schoolId) {
      return res.status(400).json({ message: "School admin's school ID not found" });
    }

    // Get teachers directly from users collection
    const teachersSnapshot = await admin.firestore()
      .collection('users')
      .where('schoolId', '==', schoolId)
      .where('role', '==', ROLES.TEACHER)
      .get();

    const teachers = await Promise.all(teachersSnapshot.docs.map(async doc => {
      const userData = doc.data();
      try {
        // Get auth user data for additional fields like disabled status
        const authUser = await admin.auth().getUser(doc.id);
        return {
          id: doc.id,
          name: userData.name,
          email: userData.email,
          phone: authUser.phoneNumber,
          status: authUser.disabled ? 'suspended' : 'active',
          gradeId: userData.gradeId,
          gradeName: userData.gradeName,
          division: userData.division,
          createdAt: userData.createdAt,
          updatedAt: userData.updatedAt
        };
      } catch (error) {
        console.error(`Error getting auth data for teacher ${doc.id}:`, error);
        // Return basic user data if auth lookup fails
        return {
          id: doc.id,
          name: userData.name,
          email: userData.email,
          status: 'unknown',
          gradeId: userData.gradeId,
          gradeName: userData.gradeName,
          division: userData.division,
          createdAt: userData.createdAt,
          updatedAt: userData.updatedAt
        };
      }
    }));

    // Set cache headers for 1 minute
    res.set('Cache-Control', 'public, max-age=60');

    return res.status(200).json({
      teachers
    });
  } catch (error) {
    console.error("Error getting teachers:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

// suspendOrUnsuspendTeacher
export const suspendOrUnsuspendTeacher = async (
  req: Request,
  res: Response
) => {
  try {
    const { uid }: TTeacherIdParam = req.params as TTeacherIdParam;

    // Get the teacher's current data
    const teacher = await admin.auth().getUser(uid);

    // Verify this is a teacher account
    if (!teacher.customClaims?.role || teacher.customClaims.role !== ROLES.TEACHER) {
      return res.status(400).json({
        error: "Invalid operation",
        message: "This user is not a teacher"
      });
    }

    // Verify the teacher belongs to the school admin's school
    const schoolAdmin = req.user!;
    if (teacher.customClaims.schoolId !== schoolAdmin.uid) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You do not have permission to manage this teacher"
      });
    }

    // Update the teacher's disabled status
    await admin.auth().updateUser(uid, {
      disabled: !teacher.disabled,
    });

    // If we're disabling the teacher, also update any assigned classes
    if (!teacher.disabled) { // If currently active, we're suspending them
      try {
        const classesSnapshot = await admin.firestore()
          .collection('classes')
          .where('schoolId', '==', schoolAdmin.uid)
          .where('teacherId', '==', uid)
          .get();

        if (!classesSnapshot.empty) {
          const batch = admin.firestore().batch();
          classesSnapshot.docs.forEach(doc => {
            batch.update(doc.ref, {
              teacherId: '',
              teacherName: '',
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          });
          await batch.commit();
        }
      } catch (error) {
        console.error("Error updating teacher's classes:", error);
        // Continue with the response as the main operation succeeded
      }
    }

    return res.status(200).json({
      message: `Teacher ${!teacher.disabled ? "suspended" : "unsuspended"} successfully`,
      status: !teacher.disabled ? "suspended" : "active"
    });
  } catch (error) {
    console.error("Error in suspendOrUnsuspendTeacher:", error);
    
    if (error instanceof FirebaseAuthError) {
      return res.status(400).json({
        error: "Authentication Error",
        message: error.message
      });
    }

    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to update teacher status. Please try again."
    });
  }
};

// getTeacher
export const getTeacher = async (req: Request, res: Response) => {
  try {
    const { uid }: TTeacherIdParam = req.params as TTeacherIdParam;
    const schoolAdmin = req.user!;

    // Get the teacher from Firebase Auth
    const teacher = await admin.auth().getUser(uid);

    // Verify this is a teacher account and belongs to this school
    if (!teacher.customClaims?.role || 
        teacher.customClaims.role !== ROLES.TEACHER ||
        teacher.customClaims.schoolId !== schoolAdmin.uid) {
      return res.status(404).json({
        error: "Not Found",
        message: "Teacher not found"
      });
    }

    return res.status(200).json({
      teacher,
    });
  } catch (error) {
    console.error("Error getting teacher:", error);
    if (error instanceof FirebaseAuthError) {
      return res.status(400).json({
        error: "Authentication Error",
        message: error.message
      });
    }
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to get teacher. Please try again."
    });
  }
};

// getSchoolAnalytics - Get analytics data filtered for school admin's school
export const getSchoolAnalytics = async (req: Request, res: Response) => {
  try {
    const { uid } = req.user!;

    // Get school admin's custom claims
    const adminData = await admin.auth().getUser(uid);
    if (!adminData.customClaims) {
      return res.status(400).json({
        error: "School admin data not found",
        details: "No custom claims found for school admin"
      });
    }

    const adminClaims = adminData.customClaims;
    const schoolId = adminClaims.schoolId;
    const districtId = adminClaims.districtId;

    console.log('🏫 School Admin Analytics Debug:', {
      schoolId,
      districtId,
      uid
    });

    if (!schoolId || !districtId) {
      return res.status(400).json({
        error: "Invalid school admin data",
        details: "Missing required information (schoolId, districtId)"
      });
    }

    // Get latest analytics data from Firebase
    const analyticsSnapshot = await admin.firestore()
      .collection('analyzedData')
      .orderBy('timestamp', 'desc')
      .limit(1)
      .get();

    if (analyticsSnapshot.empty) {
      return res.status(404).json({
        error: "No analytics data found",
        message: "Analytics data has not been generated yet. Please run analysis first."
      });
    }

    const latestAnalytics = analyticsSnapshot.docs[0].data();

    if (!latestAnalytics) {
      return res.status(404).json({
        error: "No analytics data found",
        message: "Analytics data could not be retrieved."
      });
    }

    // Filter data for school admin's school
    const schoolData = latestAnalytics.schoolStats?.[schoolId];
    console.log('🏫 Found schoolData:', schoolData);

    if (!schoolData) {
      return res.status(200).json({
        data: {
          id: latestAnalytics.id,
          timestamp: latestAnalytics.timestamp,
          totalWords: 0,
          totalEntries: 0,
          schoolStats: {},
          classStats: {},
          studentStats: {},
          districtStats: {}
        }
      });
    }

    // Get classes in this school
    const classStats = Object.entries(latestAnalytics.classStats || {})
      .filter(([_, classData]: [string, any]) => classData.schoolId === schoolId)
      .reduce((acc, [classId, classData]) => {
        acc[classId] = classData;
        return acc;
      }, {} as any);

    // Get students in this school
    const studentStats = Object.entries(latestAnalytics.studentStats || {})
      .filter(([_, studentData]: [string, any]) => studentData.schoolId === schoolId)
      .reduce((acc, [studentId, studentData]) => {
        acc[studentId] = studentData;
        return acc;
      }, {} as any);

    // Get district stats for context
    const districtStats = (latestAnalytics.districtStats && districtId && latestAnalytics.districtStats[districtId])
      ? { [districtId]: latestAnalytics.districtStats[districtId] }
      : {};

    console.log('🏫 Filtered analytics:', {
      schoolStatsKeys: Object.keys({ [schoolId]: schoolData }),
      classStatsKeys: Object.keys(classStats),
      studentStatsKeys: Object.keys(studentStats)
    });

    const filteredAnalytics = {
      id: latestAnalytics.id,
      timestamp: latestAnalytics.timestamp,
      totalWords: schoolData.totalWords || 0,
      totalEntries: schoolData.totalEntries || 0,
      schoolStats: {
        [schoolId]: schoolData
      },
      classStats,
      studentStats,
      districtStats
    };

    return res.status(200).json({
      data: filteredAnalytics
    });

  } catch (error) {
    console.error('Error getting school analytics:', error);
    return res.status(500).json({
      error: "Failed to get analytics data",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

// getSchoolHistoricalAnalytics - Get historical analytics for the current school admin's school
export const getSchoolHistoricalAnalytics = async (req, res) => {
  try {
    const { uid } = req.user!;
    const adminData = await admin.auth().getUser(uid);
    const schoolId = adminData.customClaims?.schoolId;
    if (!schoolId) {
      return res.status(400).json({ error: "School admin data not found" });
    }
    const db = admin.firestore();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const historicalSnapshot = await db.collection('analyzedData')
      .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
      .orderBy('timestamp', 'asc')
      .get();
    const historicalData = historicalSnapshot.docs.map(doc => {
      const data = doc.data();
      const schoolStats = data.schoolStats?.[schoolId];
      return schoolStats
        ? {
            timestamp: data.timestamp.toDate().toISOString(),
            date: data.timestamp.toDate().toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
            fullDate: data.timestamp.toDate().toISOString().split('T')[0],
            totalWords: schoolStats.totalWords,
            totalEntries: schoolStats.totalEntries,
            activeStudents: schoolStats.activeStudents,
            avgWordsPerStudent: schoolStats.avgWordsPerStudent,
          }
        : null;
    }).filter(Boolean);
    return res.status(200).json({ data: historicalData });
  } catch (error) {
    console.error('Error getting school historical analytics:', error);
    return res.status(500).json({ error: "Failed to get historical analytics data" });
  }
};

// Resource Management
export const getAssignedResources = async (req: Request, res: Response) => {
  try {
    const { uid } = req.user!;
    const { page = 1, limit = 10, status, type } = req.query;

    // Get school admin's custom claims to find their school
    const adminData = await admin.auth().getUser(uid);
    if (!adminData.customClaims?.schoolId) {
      return res.status(400).json({ message: "School admin data not found" });
    }

    const schoolId = adminData.customClaims.schoolId;
    console.log('🔍 Getting assigned resources for school admin:', { uid, schoolId });

    // Build query for resource assignments
    let assignmentsQuery = admin.firestore()
      .collection('resource_assignments')
      .where('assignedTo', '==', uid)
      .where('targetType', '==', 'school')
      .where('status', '==', 'active');

    const assignmentsSnapshot = await assignmentsQuery.get();
    console.log('📊 Found assignments:', assignmentsSnapshot.size);

    if (assignmentsSnapshot.empty) {
      return res.status(200).json({
        resources: [],
        count: 0,
        totalPages: 0,
        currentPage: Number(page)
      });
    }

    // Get resource IDs from assignments
    const resourceIds = assignmentsSnapshot.docs.map(doc => doc.data().resourceId);
    console.log('📋 Resource IDs:', resourceIds);

    // Query resources with filters
    let resourcesQuery = admin.firestore().collection('resources');
    
    // Filter by resource IDs (using 'in' operator, limited to 10 items)
    const resourceQueries = [];
    for (let i = 0; i < resourceIds.length; i += 10) {
      const batch = resourceIds.slice(i, i + 10);
      let batchQuery = resourcesQuery.where(admin.firestore.FieldPath.documentId(), 'in', batch);
      
      if (status && status !== 'all') {
        batchQuery = batchQuery.where('status', '==', status);
      }
      if (type && type !== 'all') {
        batchQuery = batchQuery.where('type', '==', type);
      }
      
      resourceQueries.push(batchQuery);
    }

    // Execute all queries and combine results
    const allResourceSnapshots = await Promise.all(resourceQueries.map(q => q.get()));
    const allResourceDocs = allResourceSnapshots.flatMap(snapshot => snapshot.docs);

    console.log('📊 Found resources:', allResourceDocs.length);

    // Apply pagination
    const startIndex = (Number(page) - 1) * Number(limit);
    const endIndex = startIndex + Number(limit);
    const paginatedDocs = allResourceDocs.slice(startIndex, endIndex);

    // Format resources with assignment info
    const resources = await Promise.all(paginatedDocs.map(async (doc) => {
      const resourceData: any = { id: doc.id, ...doc.data() };
      
      // Find the assignment for this resource
      const assignment = assignmentsSnapshot.docs.find(
        assignmentDoc => assignmentDoc.data().resourceId === doc.id
      );
      
      if (assignment) {
        const assignmentData = assignment.data();
        resourceData.assignmentInfo = {
          assignedAt: assignmentData.assignedAt,
          assignedBy: assignmentData.assignedBy,
          assignmentId: assignment.id
        };
      }

      return resourceData;
    }));

    const totalPages = Math.ceil(allResourceDocs.length / Number(limit));

    console.log('✅ Returning resources:', { count: resources.length, totalPages, currentPage: Number(page) });

    res.status(200).json({
      resources,
      count: allResourceDocs.length,
      totalPages,
      currentPage: Number(page)
    });

  } catch (error) {
    console.error('❌ Error getting assigned resources:', error);
    res.status(500).json({ message: 'Failed to get assigned resources' });
  }
};

export const assignResourceToTeacher = async (req: Request, res: Response) => {
  try {
    const { uid } = req.user!;
    const { resourceId, teacherId, targetClassId } = req.body;

    console.log('🎯 Assigning resource to teacher:', { resourceId, teacherId, targetClassId });

    if (!resourceId || !teacherId) {
      return res.status(400).json({ 
        message: 'Resource ID and teacher ID are required' 
      });
    }

    // Get school admin's custom claims
    const adminData = await admin.auth().getUser(uid);
    if (!adminData.customClaims?.schoolId) {
      return res.status(400).json({ message: 'School admin data not found' });
    }

    const schoolId = adminData.customClaims.schoolId;

    // Verify the resource exists and is assigned to this school admin
    const resourceDoc = await admin.firestore()
      .collection('resources')
      .doc(resourceId)
      .get();

    if (!resourceDoc.exists) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    // Check if this school admin has this resource assigned
    const existingAssignment = await admin.firestore()
      .collection('resource_assignments')
      .where('resourceId', '==', resourceId)
      .where('assignedTo', '==', uid)
      .where('targetType', '==', 'school')
      .where('status', '==', 'active')
      .get();

    if (existingAssignment.empty) {
      return res.status(403).json({ message: 'You do not have access to assign this resource' });
    }

    // Verify the teacher exists and belongs to this school
    const teacherData = await admin.auth().getUser(teacherId);
    if (!teacherData.customClaims?.schoolId || teacherData.customClaims?.schoolId !== schoolId) {
      return res.status(403).json({ message: 'Invalid teacher or not in your school' });
    }

    // If targetClassId is provided, verify it belongs to this school
    if (targetClassId) {
      const classDoc = await admin.firestore()
        .collection('classes')
        .doc(targetClassId)
        .get();

      if (!classDoc.exists || classDoc.data()?.schoolId !== schoolId) {
        return res.status(403).json({ message: 'Invalid class or not in your school' });
      }
    }

    // Check if already assigned to this teacher
    const existingTeacherAssignment = await admin.firestore()
      .collection('resource_assignments')
      .where('resourceId', '==', resourceId)
      .where('assignedTo', '==', teacherId)
      .where('targetType', '==', targetClassId ? 'class' : 'teacher')
      .where('status', '==', 'active')
      .get();

    if (!existingTeacherAssignment.empty) {
      return res.status(400).json({ message: 'Resource already assigned to this teacher' });
    }

    // Create the assignment
    const assignmentData: any = {
      resourceId,
      assignedBy: uid,
      assignedTo: teacherId,
      targetType: targetClassId ? 'class' : 'teacher',
      status: 'active',
      assignedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    if (targetClassId) {
      assignmentData.targetId = targetClassId;
    }

    const assignmentRef = await admin.firestore()
      .collection('resource_assignments')
      .add(assignmentData);

    console.log('✅ Resource assigned successfully:', assignmentRef.id);

    res.status(201).json({
      message: 'Resource assigned to teacher successfully',
      assignmentId: assignmentRef.id
    });

  } catch (error) {
    console.error('❌ Error assigning resource to teacher:', error);
    res.status(500).json({ message: 'Failed to assign resource to teacher' });
  }
};

export const getResourceAssignments = async (req: Request, res: Response) => {
  try {
    const { uid } = req.user!;
    const { page = 1, limit = 10, resourceId } = req.query;

    console.log('📊 Getting resource assignments made by school admin:', { uid, resourceId });

    // Get school admin's custom claims
    const adminData = await admin.auth().getUser(uid);
    if (!adminData.customClaims?.schoolId) {
      return res.status(400).json({ message: 'School admin data not found' });
    }

    // Build query for assignments made by this school admin
    let assignmentsQuery = admin.firestore()
      .collection('resource_assignments')
      .where('assignedBy', '==', uid)
      .where('status', '==', 'active');

    if (resourceId && resourceId !== 'all') {
      assignmentsQuery = assignmentsQuery.where('resourceId', '==', resourceId);
    }

    const assignmentsSnapshot = await assignmentsQuery.get();
    console.log('📋 Found assignments:', assignmentsSnapshot.size);

    // Apply pagination
    const startIndex = (Number(page) - 1) * Number(limit);
    const endIndex = startIndex + Number(limit);
    const paginatedDocs = assignmentsSnapshot.docs.slice(startIndex, endIndex);

    // Enrich assignments with resource and teacher details
    const assignments = await Promise.all(paginatedDocs.map(async (doc) => {
      const assignmentData: any = { id: doc.id, ...doc.data() };
      
      // Get resource details
      if (assignmentData.resourceId) {
        const resourceDoc = await admin.firestore()
          .collection('resources')
          .doc(assignmentData.resourceId)
          .get();
        
        if (resourceDoc.exists) {
          assignmentData.resource = { id: resourceDoc.id, ...resourceDoc.data() };
        }
      }

      // Get class details if applicable
      if (assignmentData.targetId && assignmentData.targetType === 'class') {
        const classDoc = await admin.firestore()
          .collection('classes')
          .doc(assignmentData.targetId)
          .get();
        
        if (classDoc.exists) {
          assignmentData.class = { id: classDoc.id, ...classDoc.data() };
        }
      }

      // Get teacher details
      if (assignmentData.assignedTo) {
        try {
          const teacherData = await admin.auth().getUser(assignmentData.assignedTo);
          assignmentData.teacher = {
            uid: teacherData.uid,
            email: teacherData.email,
            displayName: teacherData.displayName || 'Unknown',
            customClaims: teacherData.customClaims
          };
        } catch (error) {
          console.error('Error getting teacher data:', error);
          assignmentData.teacher = { uid: assignmentData.assignedTo, email: 'Unknown' };
        }
      }

      return assignmentData;
    }));

    const totalPages = Math.ceil(assignmentsSnapshot.size / Number(limit));

    console.log('✅ Returning assignments:', { count: assignments.length, totalPages, currentPage: Number(page) });

    res.status(200).json({
      assignments,
      count: assignmentsSnapshot.size,
      totalPages,
      currentPage: Number(page)
    });

  } catch (error) {
    console.error('❌ Error getting resource assignments:', error);
    res.status(500).json({ message: 'Failed to get resource assignments' });
  }
};

export const getAvailableTeachers = async (req: Request, res: Response) => {
  try {
    const { uid } = req.user!;

    // Get school admin's custom claims
    const adminData = await admin.auth().getUser(uid);
    if (!adminData.customClaims?.schoolId) {
      return res.status(400).json({ message: 'School admin data not found' });
    }

    const schoolId = adminData.customClaims.schoolId;
    console.log('🏫 Getting teachers for school:', schoolId);

    // Get all classes in the school
    const classesSnapshot = await admin.firestore()
      .collection('classes')
      .where('schoolId', '==', schoolId)
      .where('status', '==', 'active')
      .get();

    const classes = classesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
    console.log('🏫 Found classes:', classes.length);

    // Get all users with teacher role in this school
    const listUsersResult = await admin.auth().listUsers();
    const teachers = listUsersResult.users.filter(user => {
      const claims = user.customClaims;
      return claims?.role === 'teacher' && claims?.schoolId === schoolId;
    });

    console.log('👨‍💼 Found teachers:', teachers.length);

    // Combine teacher data with their classes
    const teachersWithClasses = teachers.map(teacher => {
      const teacherClasses = classes.filter(c => c.teacherId === teacher.uid);
      
      return {
        uid: teacher.uid,
        email: teacher.email,
        displayName: teacher.displayName || 'Unknown',
        classes: teacherClasses
      };
    });

    res.status(200).json({
      teachers: teachersWithClasses,
      classes
    });

  } catch (error) {
    console.error('❌ Error getting available teachers:', error);
    res.status(500).json({ message: 'Failed to get available teachers' });
  }
};

// Get all students in the school
export const getStudents = async (req, res) => {
  try {
    const { uid } = req.user!;
    // Get school admin's custom claims to get the school ID
    const schoolAdmin = await admin.auth().getUser(uid);
    const schoolId = schoolAdmin.customClaims?.schoolId;
    if (!schoolId) {
      return res.status(400).json({ message: "School admin's school ID not found" });
    }
    // Get all students for the school
    const students = await admin.auth()
      .listUsers()
      .then(result => result.users.filter(user => 
        user.customClaims?.schoolId === schoolId && 
        user.customClaims?.role === 'student'
      ));
    // Map to minimal student info
    const studentList = students.map(user => ({
      uid: user.uid,
      displayName: user.displayName || '',
      email: user.email || '',
      status: user.disabled ? 'inactive' : 'active',
      customClaims: user.customClaims || {},
    }));
    return res.status(200).json({ students: studentList });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// Get class analytics for school admin
export const getClassAnalytics = async (req, res) => {
  try {
    const { uid } = req.user!;
    const classId = req.params.classId;
    const adminData = await admin.auth().getUser(uid);
    const schoolId = adminData.customClaims?.schoolId;
    if (!schoolId) return res.status(400).json({ error: "School admin data not found" });
    const classDoc = await admin.firestore().collection('classes').doc(classId).get();
    if (!classDoc.exists) return res.status(404).json({ error: "Class not found" });
    const classData = classDoc.data();
    if (classData?.schoolId !== schoolId) {
      return res.status(403).json({ error: "Unauthorized: Class not in your school" });
    }
    const analyticsSnapshot = await admin.firestore().collection('analyzedData').orderBy('timestamp', 'desc').limit(1).get();
    if (analyticsSnapshot.empty) return res.status(404).json({ error: "No analytics data found" });
    const latestAnalytics = analyticsSnapshot.docs[0].data();
    const classStats = latestAnalytics.classStats?.[classId];
    if (!classStats) return res.status(200).json({ data: {} });
    // Get student stats for this class
    const studentStats = Object.entries(latestAnalytics.studentStats || {})
      .filter(([_, s]: any) => s.classId === classId)
      .reduce((acc, [studentId, s]) => { acc[studentId] = s; return acc; }, {});
    return res.status(200).json({
      data: {
        ...latestAnalytics,
        classStats: { [classId]: classStats },
        studentStats,
      }
    });
  } catch (error) {
    console.error("Error getting class analytics:", error);
    res.status(500).json({ error: "Failed to get class analytics" });
  }
};

// Get class historical analytics for school admin
export const getClassHistoricalAnalytics = async (req, res) => {
  try {
    const { uid } = req.user!;
    const classId = req.params.classId;
    const adminData = await admin.auth().getUser(uid);
    const schoolId = adminData.customClaims?.schoolId;
    if (!schoolId) return res.status(400).json({ error: "School admin data not found" });
    const classDoc = await admin.firestore().collection('classes').doc(classId).get();
    if (!classDoc.exists) return res.status(404).json({ error: "Class not found" });
    const classData = classDoc.data();
    if (classData?.schoolId !== schoolId) {
      return res.status(403).json({ error: "Unauthorized: Class not in your school" });
    }
    const db = admin.firestore();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const historicalSnapshot = await db.collection('analyzedData')
      .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
      .orderBy('timestamp', 'asc')
      .get();
    const historicalData = historicalSnapshot.docs.map(doc => {
      const data = doc.data();
      const classStats = data.classStats?.[classId];
      return classStats
        ? {
            timestamp: data.timestamp.toDate().toISOString(),
            date: data.timestamp.toDate().toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
            fullDate: data.timestamp.toDate().toISOString().split('T')[0],
            totalWords: classStats.totalWords,
            totalEntries: classStats.totalEntries,
            activeStudents: classStats.activeStudents,
            avgWordsPerStudent: classStats.avgWordsPerStudent,
          }
        : null;
    }).filter(Boolean);
    return res.status(200).json({ data: historicalData });
  } catch (error) {
    console.error("Error getting class historical analytics:", error);
    res.status(500).json({ error: "Failed to get class historical analytics" });
  }
};
