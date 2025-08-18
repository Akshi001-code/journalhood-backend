// @ts-nocheck
import { Request, Response } from "express";
import {
  TCreateSchoolAdmin,
  TSchoolAdminParam,
  TUpdateSchoolAdmin,
  TSchoolsQuery,
} from "../validators/district-admin.validator";
import {
  FirebaseAuthError,
  ListUsersResult,
  UserRecord,
} from "firebase-admin/auth";
import admin from "../config/firebase.config";
import { DEFAULT_PASSWORDS, ROLES } from "../config/app.config";
import { transporter } from "../config/nodemailer.config";
import { createHierarchicalClaims } from "../utils/roleHierarchy";

// School Management
export const createSchool = async (req: Request, res: Response) => {
  try {
    const { name, districtId } = req.body;

    if (!name || !districtId) {
      return res.status(400).json({ message: "Name and district ID are required" });
    }

    // Get district info to get name
    const districtDoc = await admin.firestore()
      .collection("districts")
      .doc(districtId)
      .get();

    if (!districtDoc.exists) {
      return res.status(404).json({ message: "District not found" });
    }

    const districtData = districtDoc.data();
    if (!districtData?.name) {
      return res.status(400).json({ message: "District name not found" });
    }

    // Create school in Firestore
    const docRef = await admin.firestore().collection("schools").add({
      name,
      districtId,
      districtName: districtData.name,
      status: "active",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(201).json({
      message: "School created successfully",
      schoolId: docRef.id,
    });
  } catch (error) {
    console.error("Error creating school:", error);
    res.status(500).json({ message: "Failed to create school" });
  }
};

// Type guard for string
function isString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

export const getSchools = async (req: Request, res: Response) => {
  try {
    const districtIdParam = req.query.districtId;
    
    console.log('Getting schools for district:', districtIdParam);
    
    if (!districtIdParam || typeof districtIdParam !== 'string') {
      console.log('Invalid district ID:', districtIdParam);
      return res.status(400).json({ message: "District ID is required" });
    }

    const districtId: string = districtIdParam;

    // Get schools from Firestore
    const schoolsRef = admin.firestore().collection("schools");
    console.log('Querying Firestore schools collection with districtId:', districtId);
    
    const querySnapshot = await schoolsRef.where("districtId", "==", districtId).get();

    console.log('Found schools count:', querySnapshot.size);

    const schools = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      console.log('School data:', { id: doc.id, ...data });
      return {
        id: doc.id,
        ...data,
      };
    });

    console.log('Returning schools:', schools);

    res.status(200).json({ schools });
  } catch (error) {
    console.error("Error getting schools:", error);
    res.status(500).json({ message: "Failed to get schools" });
  }
};

export const updateSchool = async (req: Request, res: Response) => {
  try {
    const schoolId = req.params.schoolId;
    if (!schoolId) {
      return res.status(400).json({ message: "School ID is required" });
    }

    const updateData = req.body;

    // Update school in Firestore
    await admin.firestore().collection("schools").doc(schoolId).update({
      ...updateData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(200).json({ message: "School updated successfully" });
  } catch (error) {
    console.error("Error updating school:", error);
    res.status(500).json({ message: "Failed to update school" });
  }
};

export const deleteSchool = async (req: Request, res: Response) => {
  try {
    const schoolId = req.params.schoolId;
    if (!schoolId) {
      return res.status(400).json({ message: "School ID is required" });
    }

    // Delete school from Firestore
    await admin.firestore().collection("schools").doc(schoolId).delete();

    res.status(200).json({ message: "School deleted successfully" });
  } catch (error) {
    console.error("Error deleting school:", error);
    res.status(500).json({ message: "Failed to delete school" });
  }
};

// School Admin Management
// Helper function to generate a temporary password
const generateTempPassword = () => {
  const length = 12;
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
};

export const createSchoolAdmin = async (req: Request, res: Response) => {
  try {
    const { email, name, phone, districtId, schoolId } = req.body;

    if (!email || !name || !districtId || !schoolId) {
      return res.status(400).json({ 
        message: "Missing required fields",
        details: {
          email: !email ? "Email is required" : null,
          name: !name ? "Name is required" : null,
          districtId: !districtId ? "District ID is required" : null,
          schoolId: !schoolId ? "School ID is required" : null
        }
      });
    }

    // Verify the district exists and has a name
    const districtRef = admin.firestore().collection("districts").doc(districtId);
    const districtSnapshot = await districtRef.get();
    
    if (!districtSnapshot.exists) {
      return res.status(404).json({ message: "District not found" });
    }

    const districtData = districtSnapshot.data();
    if (!districtData?.name) {
      return res.status(400).json({ message: "District name not found" });
    }

    // Verify the school exists and belongs to the district
    const schoolRef = admin.firestore().collection("schools").doc(schoolId);
    const schoolSnapshot = await schoolRef.get();
    
    if (!schoolSnapshot.exists) {
      // Create the school document if it doesn't exist
      await schoolRef.set({
        name: `School ${schoolId}`, // Default name
        districtId,
        districtName: districtData.name,
        status: "active",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        // Add empty arrays for grades and divisions
        grades: [],
        divisions: [],
      });
    } else {
      const schoolData = schoolSnapshot.data();
      if (!schoolData) {
        return res.status(500).json({ message: "School data is corrupted" });
      }
      if (schoolData.districtId !== districtId) {
        return res.status(403).json({ message: "School does not belong to this district" });
      }
      // Update district name if it's missing or different
      if (schoolData.districtName !== districtData.name) {
        await schoolRef.update({
          districtName: districtData.name,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }

    // Get the requesting district admin's ID
    const districtAdminId = req.user?.uid;
    if (!districtAdminId) {
      return res.status(401).json({
        error: "Unauthorized",
        details: "District admin ID not found"
      });
    }

    // Use default password temporarily
    const tempPassword = DEFAULT_PASSWORDS.SCHOOL_ADMIN;

    // Create user in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email: email || '',
      displayName: name,
      phoneNumber: phone ? (phone.startsWith('+') ? phone : `+${phone}`) : undefined,
      password: tempPassword,
      emailVerified: false,
    });

    // Get school data for claims
    const schoolData = schoolSnapshot.data();
    const schoolName = schoolData?.name || `School ${schoolId}`;
    const districtName = districtData?.name || `District ${districtId}`;
    
    // Create hierarchical claims
    const claims = createHierarchicalClaims(
      ROLES.SCHOOL_ADMIN,
      districtAdminId,
      {
        districtId: districtId || '',
        schoolId: schoolId || '',
        districtName: districtName || '',
        schoolName: schoolName || '',
      }
    );

    // Set custom claims
    await admin.auth().setCustomUserClaims(userRecord.uid, claims);

    // Create a document in the users collection to store the hierarchy
    await admin.firestore().collection("users").doc(userRecord.uid).set({
      name,
      email,
      role: ROLES.SCHOOL_ADMIN,
      parentId: districtAdminId,
      districtId,
      schoolId,
      districtName,
      schoolName,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: "active",
      passwordSet: false, // Track if user has set their password
    });

    // Update school document with admin info
    await schoolRef.update({
      adminId: userRecord.uid,
      adminName: name,
      adminEmail: email,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Generate password reset link for initial password setup
    const passwordResetLink = await admin.auth().generatePasswordResetLink(email);

    // Send comprehensive welcome email with password setup instructions
    const fromAddress =
      process.env.TITAN_EMAIL ||
      (process.env as any).titanemail ||
      process.env.EMAIL ||
      "noreply@journalhood.com";

    if (transporter && fromAddress) {
      try {
        const districtName = districtData.name;
        const schoolName = schoolSnapshot.data()?.name || `School ${schoolId}`;
        
    await transporter.sendMail({
          from: fromAddress,
      to: email,
          subject: "Welcome to JournalHood - Complete Your School Admin Setup",
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
                  line-height: 1.6;
                  color: #333;
                  max-width: 600px;
                  margin: 0 auto;
                  padding: 20px;
                }
                .header {
                  background-color: #059669;
                  color: white;
                  padding: 20px;
                  border-radius: 8px 8px 0 0;
                  text-align: center;
                }
                .content {
                  background-color: #f8fafc;
                  padding: 30px;
                  border-radius: 0 0 8px 8px;
                  border: 1px solid #e5e7eb;
                }
                .button {
                  display: inline-block;
                  background-color: #dc2626;
                  color: white;
                  padding: 12px 24px;
                  text-decoration: none;
                  border-radius: 6px;
                  margin: 20px 0;
                  font-weight: bold;
                }
                .info-box {
                  background-color: #ecfdf5;
                  padding: 15px;
                  border-radius: 6px;
                  margin: 20px 0;
                  border-left: 4px solid #059669;
                }
                .footer {
                  text-align: center;
                  margin-top: 30px;
                  padding-top: 20px;
                  border-top: 1px solid #e5e7eb;
                  color: #6b7280;
                  font-size: 14px;
                }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>Welcome to JournalHood!</h1>
              </div>
              <div class="content">
                <p>Hello <strong>${name}</strong>,</p>
                
                <p>Congratulations! Your School Administrator account has been created. You're now ready to lead your school's digital journaling journey and support student growth.</p>
                
                <div class="info-box">
                  <h3>🏫 Your Account Details:</h3>
                  <p><strong>Email:</strong> ${email}</p>
                  <p><strong>Role:</strong> School Administrator</p>
                  <p><strong>School:</strong> ${schoolName}</p>
                  <p><strong>District:</strong> ${districtName}</p>
                </div>
                
                <h3>🔐 Complete Your Account Setup:</h3>
                <p>To get started, you need to set up your password. Click the button below to create a secure password for your account:</p>
                
                <div style="text-align: center;">
                  <a href="${passwordResetLink}" class="button">Set Up Your Password</a>
                </div>
                
                <p><strong>Important:</strong> This link will expire in 1 hour for security purposes. If you don't complete the setup within this time, please contact your district administrator.</p>
                
                <h3>🚀 What You Can Do:</h3>
                <p>Once you've set up your password, you'll be able to:</p>
                <ul>
                  <li>Access your School Administrator dashboard</li>
                  <li>Create and manage teacher accounts</li>
                  <li>Monitor student journaling activities</li>
                  <li>View school-wide analytics and reports</li>
                  <li>Manage school settings and configurations</li>
                </ul>
                
                <h3>📞 Need Help?</h3>
                <p>If you have any questions or need assistance, please contact your district administrator or our support team.</p>
                
                <p>Welcome to the JournalHood family!</p>
                <p><strong>The JournalHood Team</strong></p>
              </div>
              <div class="footer">
                <p>This email was sent to ${email} as part of your JournalHood account setup.</p>
                <p>If you did not expect this email, please contact your district administrator.</p>
              </div>
            </body>
            </html>
          `,
        });
        
        console.log(`Welcome email sent successfully to ${email}`);
      } catch (emailError) {
        console.error("Error sending welcome email:", emailError);
        // Don't throw error, just log it - user creation should still succeed
      }
    } else {
      console.warn("Email transporter not configured or from address missing; skipping welcome email");
    }

    res.status(201).json({
      message: "School admin created successfully",
      user: userRecord,
      emailSent: !!(transporter && fromAddress),
    });
  } catch (error) {
    console.error("Error creating school admin:", error);
    
    // Handle Firebase Auth errors
    if (error instanceof FirebaseAuthError) {
      let errorMessage = error.message;
      let errorCode = 'unknown';
      
      // Try to access error code safely
      try {
        errorCode = (error as any).errorInfo?.code || 'unknown';
      } catch (e) {
        console.error('Error accessing errorInfo:', e);
      }
      
      // Provide more user-friendly messages for common errors
      switch (errorCode) {
        case 'auth/email-already-exists':
          errorMessage = 'This email address is already registered. Please use a different email.';
          break;
        case 'auth/phone-number-already-exists':
          errorMessage = 'This phone number is already registered. Please use a different phone number.';
          break;
        case 'auth/invalid-phone-number':
          errorMessage = 'Please enter a valid phone number in international format (e.g., +94771234567).';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Please enter a valid email address.';
          break;
      }
      
      return res.status(400).json({ 
        message: errorMessage,
        code: errorCode
      });
    }
    
    // Handle email sending errors
    if (error instanceof Error && error.message.includes('authentication failed')) {
      return res.status(500).json({ 
        message: "School admin account was created, but we couldn't send the welcome email. Please contact support.",
        code: 'email-send-failed'
      });
    }
    
    // Handle other errors
    res.status(500).json({ 
      message: "Failed to create school admin. Please try again.",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

// update school admin
export const getSchoolAdmins = async (req: Request, res: Response) => {
  try {
    const districtId = req.query.districtId as string;
    
    if (!districtId) {
      return res.status(400).json({ message: "District ID is required" });
    }

    // Get all schools in the district first
    const schoolsSnapshot = await admin
      .firestore()
      .collection("schools")
      .where("districtId", "==", districtId)
      .get();

    // Create a map of school data by adminId
    const schoolsByAdminId = new Map();
    schoolsSnapshot.docs.forEach(doc => {
      const schoolData = doc.data();
      if (schoolData.adminId) {
        schoolsByAdminId.set(schoolData.adminId, {
          id: doc.id,
          name: schoolData.name,
          ...schoolData
        });
      }
    });

    // List all users with school-admin role in the district
    const listUsersResult = await admin.auth().listUsers();
    const schoolAdmins = listUsersResult.users
      .filter(user => {
      const claims = user.customClaims || {};
      return claims.role === ROLES.SCHOOL_ADMIN && claims.districtId === districtId;
      })
      .map(user => {
        const school = schoolsByAdminId.get(user.uid);
        return {
          id: user.uid,
          name: user.displayName || '',
          email: user.email || '',
          phone: user.phoneNumber,
          status: user.disabled ? 'suspended' : 'active',
          schoolId: user.customClaims?.schoolId || '',
          schoolName: school ? school.name : 'Unknown School'
        };
      });

    console.log('Returning school admins:', schoolAdmins);
    res.status(200).json({ schoolAdmins });
  } catch (error) {
    console.error("Error getting school admins:", error);
    res.status(500).json({ message: "Failed to get school admins" });
  }
};

// update school admin
export const updateSchoolAdmin = async (req: Request, res: Response) => {
  try {
    const { uid } = req.params;
    const { name, email, phone, districtId, schoolId } = req.body;

    // Verify that the requesting user's district matches the provided district
    const requestingUser = req.user;
    if (districtId && requestingUser?.customClaims?.districtId !== districtId) {
      return res.status(403).json({
        message: "District mismatch",
        error: "You can only update school admins in your own district"
      });
    }

    // Get the existing user to verify their district
    const existingUser = await admin.auth().getUser(uid);
    if (existingUser.customClaims?.districtId !== requestingUser?.customClaims?.districtId) {
      return res.status(403).json({
        message: "District mismatch",
        error: "You can only update school admins in your own district"
      });
    }

    // Update user in Firebase Auth
    const updateData: any = {};
    if (name) updateData.displayName = name;
    if (email) updateData.email = email;
    if (phone !== undefined) updateData.phoneNumber = phone || null;

    await admin.auth().updateUser(uid, updateData);

    // Update custom claims if district or school changed
    if (districtId || schoolId) {
      const currentDistrictId = districtId || existingUser.customClaims?.districtId;
      if (!currentDistrictId) {
        return res.status(400).json({
          message: "District ID is required",
          error: "No district ID found in current or new data"
        });
      }

      const districtDoc = await admin.firestore()
        .collection("districts")
        .doc(currentDistrictId)
        .get();

      if (!districtDoc.exists) {
        return res.status(400).json({
          message: "District not found",
          error: "The specified district does not exist"
        });
      }

      const districtData = districtDoc.data();
      const currentSchoolId = schoolId || existingUser.customClaims?.schoolId || null;

      await admin.auth().setCustomUserClaims(uid, {
        ...existingUser.customClaims,
        districtId: currentDistrictId,
        districtName: districtData?.name || '',
        schoolId: currentSchoolId
      });

      // Update school document if schoolId is provided
      if (schoolId) {
        const schoolDoc = await admin.firestore()
          .collection("schools")
          .doc(schoolId)
          .get();

        if (!schoolDoc.exists) {
          return res.status(400).json({
            message: "School not found",
            error: "The specified school does not exist"
          });
        }

        const schoolData = schoolDoc.data();
        if (!schoolData || schoolData.districtId !== currentDistrictId) {
          return res.status(403).json({
            message: "School district mismatch",
            error: "The specified school does not belong to your district"
          });
        }

        const displayName = name || existingUser.displayName || '';
        const emailAddress = email || existingUser.email || '';

        await admin.firestore().collection("schools").doc(schoolId).update({
          adminId: uid,
          adminName: displayName,
          adminEmail: emailAddress,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }

    res.status(200).json({
      message: "School admin updated successfully"
    });
  } catch (error) {
    console.error("Error updating school admin:", error);
    if (error instanceof FirebaseAuthError) {
      return res.status(400).json({
        message: "Failed to update school admin",
        error: error.message
      });
    }
    res.status(500).json({
      message: "Failed to update school admin",
      error: "Internal server error"
    });
  }
};

// suspend or unsuspend school admin
export const suspendOrUnsuspendSchoolAdmin = async (
  req: Request,
  res: Response
) => {
  try {
    const { uid }: TSchoolAdminParam = req.params as TSchoolAdminParam;

    const user: UserRecord = await admin.auth().getUser(uid);

    await admin.auth().updateUser(uid, {
      disabled: !user.disabled,
    });

    return res.status(200).json({
      message: `School Admin ${
        user.disabled ? "Unsuspended" : "Suspended"
      } Successfully`,
    });
  } catch (error) {
    console.log("Error while suspending or unsuspending school admin", error);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

// delete school admin
export const deleteSchoolAdmin = async (req: Request, res: Response) => {
  try {
    const { uid }: TSchoolAdminParam = req.params as TSchoolAdminParam;

    await admin.auth().deleteUser(uid);

    return res.status(200).json({
      message: "School Admin Deleted Successfully",
    });
  } catch (error) {
    console.log("Error while deleting school admin", error);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

// District Overview
export const getDistrictOverview = async (req: Request, res: Response) => {
  try {
    const districtId = req.query.districtId as string;
    
    if (!districtId) {
      return res.status(400).json({ message: "District ID is required" });
    }

    // Get all schools in the district
    const schoolsSnapshot = await admin
      .firestore()
      .collection("schools")
      .where("districtId", "==", districtId)
      .get();

    const schools = schoolsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Calculate overview statistics
    const totalSchools = schools.length;
    const totalStudents = schools.reduce((sum, school: any) => sum + (school.studentCount || 0), 0);
    const totalTeachers = schools.reduce((sum, school: any) => sum + (school.teacherCount || 0), 0);
    const averageEngagement = schools.reduce((sum, school: any) => sum + (school.engagement || 0), 0) / totalSchools || 0;

    // Get monthly changes (for now returning static data)
    const monthlyChanges = {
      schools: 0,
      students: 0,
      teachers: 0,
      engagement: 0
    };

    // Transform schools data
    const schoolsOverview = schools.map((school: any) => ({
      id: school.id,
      name: school.name,
      address: school.address || '',
      students: school.studentCount || 0,
      teachers: school.teacherCount || 0,
      classes: school.classCount || 0,
      engagement: school.engagement || 0,
      sentiment: school.sentiment || 'Neutral',
      admin: school.adminId ? {
        id: school.adminId,
        name: school.adminName || 'Unknown'
      } : null
    }));

    res.status(200).json({
      totalSchools,
      totalStudents,
      totalTeachers,
      averageEngagement,
      schools: schoolsOverview,
      monthlyChanges
    });
  } catch (error) {
    console.error("Error getting district overview:", error);
    res.status(500).json({ message: "Failed to get district overview" });
  }
};

// getDistrictAnalytics - Get analytics data filtered for district admin's district
export const getDistrictAnalytics = async (req: Request, res: Response) => {
  try {
    const { uid } = req.user!;

    // Get district admin's custom claims
    const adminData = await admin.auth().getUser(uid);
    if (!adminData.customClaims) {
      return res.status(400).json({
        error: "District admin data not found",
        details: "No custom claims found for district admin"
      });
    }

    const adminClaims = adminData.customClaims;
    const districtId = adminClaims.districtId;

    console.log('🏛️ District Admin Analytics Debug:', {
      districtId,
      uid
    });

    if (!districtId) {
      return res.status(400).json({
        error: "Invalid district admin data",
        details: "Missing required information (districtId)"
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

    // Filter data for district admin's district
    const districtData = latestAnalytics.districtStats?.[districtId];
    console.log('🏛️ Found districtData:', districtData);

    if (!districtData) {
      return res.status(200).json({
        data: {
          id: latestAnalytics.id,
          timestamp: latestAnalytics.timestamp,
          totalWords: 0,
          totalEntries: 0,
          districtStats: {},
          schoolStats: {},
          classStats: {},
          studentStats: {}
        }
      });
    }

    // Get schools in this district
    const schoolStats = Object.entries(latestAnalytics.schoolStats || {})
      .filter(([_, schoolData]: [string, any]) => schoolData.districtId === districtId)
      .reduce((acc, [schoolId, schoolData]) => {
        acc[schoolId] = schoolData;
        return acc;
      }, {} as any);

    // Get classes in this district (through school filtering)
    const classStats = Object.entries(latestAnalytics.classStats || {})
      .filter(([_, classData]: [string, any]) => {
        const schoolId = classData.schoolId;
        return latestAnalytics.schoolStats?.[schoolId]?.districtId === districtId;
      })
      .reduce((acc, [classId, classData]) => {
        acc[classId] = classData;
        return acc;
      }, {} as any);

    // Get students in this district (through school filtering)
    const studentStats = Object.entries(latestAnalytics.studentStats || {})
      .filter(([_, studentData]: [string, any]) => studentData.districtId === districtId)
      .reduce((acc, [studentId, studentData]) => {
        acc[studentId] = studentData;
        return acc;
      }, {} as any);

    console.log('🏛️ Filtered analytics:', {
      districtStatsKeys: Object.keys({ [districtId]: districtData }),
      schoolStatsKeys: Object.keys(schoolStats),
      classStatsKeys: Object.keys(classStats),
      studentStatsKeys: Object.keys(studentStats)
    });

    const filteredAnalytics = {
      id: latestAnalytics.id,
      timestamp: latestAnalytics.timestamp,
      totalWords: districtData.totalWords || 0,
      totalEntries: districtData.totalEntries || 0,
      districtStats: {
        [districtId]: districtData
      },
      schoolStats,
      classStats,
      studentStats
    };

    return res.status(200).json({
      data: filteredAnalytics
    });

  } catch (error) {
    console.error('Error getting district analytics:', error);
    return res.status(500).json({
      error: "Failed to get analytics data",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

export const getDistrictHistoricalAnalytics = async (req, res) => {
  try {
    const { uid } = req.user!;
    const adminData = await admin.auth().getUser(uid);
    const districtId = adminData.customClaims?.districtId;
    if (!districtId) {
      return res.status(400).json({ error: "District admin data not found" });
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
      const districtStats = data.districtStats?.[districtId];
      return districtStats
        ? {
            timestamp: data.timestamp.toDate().toISOString(),
            date: data.timestamp.toDate().toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
            fullDate: data.timestamp.toDate().toISOString().split('T')[0],
            totalWords: districtStats.totalWords,
            totalEntries: districtStats.totalEntries,
            activeStudents: districtStats.activeStudents,
            avgWordsPerStudent: districtStats.avgWordsPerStudent,
          }
        : null;
    }).filter(Boolean);
    return res.status(200).json({ data: historicalData });
  } catch (error) {
    console.error('Error getting district historical analytics:', error);
    return res.status(500).json({ error: "Failed to get historical analytics data" });
  }
};

// Get school analytics for district admin
export const getSchoolAnalytics = async (req, res) => {
  try {
    const { uid } = req.user!;
    const schoolId = req.params.schoolId;
    const adminData = await admin.auth().getUser(uid);
    const districtId = adminData.customClaims?.districtId;
    if (!districtId) return res.status(400).json({ error: "District admin data not found" });
    const schoolDoc = await admin.firestore().collection('schools').doc(schoolId).get();
    if (!schoolDoc.exists || schoolDoc.data()?.districtId !== districtId) {
      return res.status(403).json({ error: "Unauthorized: School not in your district" });
    }
    const analyticsSnapshot = await admin.firestore().collection('analyzedData').orderBy('timestamp', 'desc').limit(1).get();
    if (analyticsSnapshot.empty) return res.status(404).json({ error: "No analytics data found" });
    const latestAnalytics = analyticsSnapshot.docs[0].data();
    const schoolData = latestAnalytics.schoolStats?.[schoolId];
    if (!schoolData) return res.status(200).json({ data: {} });
    const classStats = Object.entries(latestAnalytics.classStats || {})
      .filter(([_, c]: [string, any]) => c.schoolId === schoolId)
      .reduce((acc, [classId, c]) => { acc[classId] = c; return acc; }, {});
    return res.status(200).json({
      data: {
        ...latestAnalytics,
        schoolStats: { [schoolId]: schoolData },
        classStats,
      }
    });
  } catch (error) {
    console.error("Error getting school analytics:", error);
    res.status(500).json({ error: "Failed to get school analytics" });
  }
};

// Get school historical analytics for district admin
export const getSchoolHistoricalAnalytics = async (req, res) => {
  try {
    const { uid } = req.user!;
    const schoolId = req.params.schoolId;
    const adminData = await admin.auth().getUser(uid);
    const districtId = adminData.customClaims?.districtId;
    if (!districtId) return res.status(400).json({ error: "District admin data not found" });
    const schoolDoc = await admin.firestore().collection('schools').doc(schoolId).get();
    if (!schoolDoc.exists || schoolDoc.data()?.districtId !== districtId) {
      return res.status(403).json({ error: "Unauthorized: School not in your district" });
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
    console.error("Error getting school historical analytics:", error);
    res.status(500).json({ error: "Failed to get school historical analytics" });
  }
};

// Get class analytics for district admin
export const getClassAnalytics = async (req, res) => {
  try {
    const { uid } = req.user!;
    const classId = req.params.classId;
    const adminData = await admin.auth().getUser(uid);
    const districtId = adminData.customClaims?.districtId;
    if (!districtId) return res.status(400).json({ error: "District admin data not found" });
    const classDoc = await admin.firestore().collection('classes').doc(classId).get();
    if (!classDoc.exists) return res.status(404).json({ error: "Class not found" });
    const classData = classDoc.data();
    // Check that the class's school belongs to this district
    const schoolId = classData?.schoolId;
    const schoolDoc = await admin.firestore().collection('schools').doc(schoolId).get();
    if (!schoolDoc.exists || schoolDoc.data()?.districtId !== districtId) {
      return res.status(403).json({ error: "Unauthorized: Class not in your district" });
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

// Get class historical analytics for district admin
export const getClassHistoricalAnalytics = async (req, res) => {
  try {
    const { uid } = req.user!;
    const classId = req.params.classId;
    const adminData = await admin.auth().getUser(uid);
    const districtId = adminData.customClaims?.districtId;
    if (!districtId) return res.status(400).json({ error: "District admin data not found" });
    const classDoc = await admin.firestore().collection('classes').doc(classId).get();
    if (!classDoc.exists) return res.status(404).json({ error: "Class not found" });
    const classData = classDoc.data();
    // Check that the class's school belongs to this district
    const schoolId = classData?.schoolId;
    const schoolDoc = await admin.firestore().collection('schools').doc(schoolId).get();
    if (!schoolDoc.exists || schoolDoc.data()?.districtId !== districtId) {
      return res.status(403).json({ error: "Unauthorized: Class not in your district" });
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

// Resource Management
export const getAssignedResources = async (req: Request, res: Response) => {
  try {
    const { uid } = req.user!;
    const { page = 1, limit = 10, status, type } = req.query;

    // Get district admin's custom claims to find their district
    const adminData = await admin.auth().getUser(uid);
    if (!adminData.customClaims?.districtId) {
      return res.status(400).json({ message: "District admin data not found" });
    }

    const districtId = adminData.customClaims.districtId;
    console.log('🔍 Getting assigned resources for district admin:', { uid, districtId });

    // Build query for resource assignments
    let assignmentsQuery = admin.firestore()
      .collection('resource_assignments')
      .where('assignedTo', '==', uid)
      .where('targetType', '==', 'district')
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

export const assignResourceToSchoolAdmin = async (req: Request, res: Response) => {
  try {
    const { uid } = req.user!;
    const { resourceId, schoolAdminId, targetSchoolId } = req.body;

    console.log('🎯 Assigning resource to school admin:', { resourceId, schoolAdminId, targetSchoolId });

    if (!resourceId || !schoolAdminId || !targetSchoolId) {
      return res.status(400).json({ 
        message: 'Resource ID, school admin ID, and target school ID are required' 
      });
    }

    // Get district admin's custom claims
    const adminData = await admin.auth().getUser(uid);
    if (!adminData.customClaims?.districtId) {
      return res.status(400).json({ message: 'District admin data not found' });
    }

    const districtId = adminData.customClaims.districtId;

    // Verify the resource exists and is assigned to this district admin
    const resourceDoc = await admin.firestore()
      .collection('resources')
      .doc(resourceId)
      .get();

    if (!resourceDoc.exists) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    // Check if this district admin has this resource assigned
    const existingAssignment = await admin.firestore()
      .collection('resource_assignments')
      .where('resourceId', '==', resourceId)
      .where('assignedTo', '==', uid)
      .where('targetType', '==', 'district')
      .where('status', '==', 'active')
      .get();

    if (existingAssignment.empty) {
      return res.status(403).json({ message: 'You do not have access to assign this resource' });
    }

    // Verify the school admin exists and belongs to this district
    const schoolAdminData = await admin.auth().getUser(schoolAdminId);
    const schoolAdminClaims = schoolAdminData.customClaims;
    if (!schoolAdminClaims?.schoolId || schoolAdminClaims?.districtId !== districtId) {
      return res.status(403).json({ message: 'Invalid school admin or not in your district' });
    }

    // Verify the target school exists and belongs to this district
    const schoolDoc = await admin.firestore()
      .collection('schools')
      .doc(targetSchoolId)
      .get();

    const schoolData = schoolDoc.data();
    if (!schoolDoc.exists || !schoolData || schoolData.districtId !== districtId) {
      return res.status(403).json({ message: 'Invalid school or not in your district' });
    }

    // Check if already assigned to this school admin
    const existingSchoolAssignment = await admin.firestore()
      .collection('resource_assignments')
      .where('resourceId', '==', resourceId)
      .where('assignedTo', '==', schoolAdminId)
      .where('targetType', '==', 'school')
      .where('targetId', '==', targetSchoolId)
      .where('status', '==', 'active')
      .get();

    if (!existingSchoolAssignment.empty) {
      return res.status(400).json({ message: 'Resource already assigned to this school admin' });
    }

    // Create the assignment
    const assignmentRef = await admin.firestore()
      .collection('resource_assignments')
      .add({
        resourceId,
        assignedBy: uid,
        assignedTo: schoolAdminId,
        targetType: 'school',
        targetId: targetSchoolId,
        status: 'active',
        assignedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

    console.log('✅ Resource assigned successfully:', assignmentRef.id);

    res.status(201).json({
      message: 'Resource assigned to school admin successfully',
      assignmentId: assignmentRef.id
    });

  } catch (error) {
    console.error('❌ Error assigning resource to school admin:', error);
    res.status(500).json({ message: 'Failed to assign resource to school admin' });
  }
};

export const getResourceAssignments = async (req: Request, res: Response) => {
  try {
    const { uid } = req.user!;
    const { page = 1, limit = 10, resourceId } = req.query;

    console.log('📊 Getting resource assignments made by district admin:', { uid, resourceId });

    // Get district admin's custom claims
    const adminData = await admin.auth().getUser(uid);
    if (!adminData.customClaims?.districtId) {
      return res.status(400).json({ message: 'District admin data not found' });
    }

    // Build query for assignments made by this district admin
    let assignmentsQuery = admin.firestore()
      .collection('resource_assignments')
      .where('assignedBy', '==', uid)
      .where('targetType', '==', 'school')
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

    // Enrich assignments with resource, school admin, and school details
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

      // Get school details
      if (assignmentData.targetId) {
        const schoolDoc = await admin.firestore()
          .collection('schools')
          .doc(assignmentData.targetId)
          .get();
        
        if (schoolDoc.exists) {
          assignmentData.school = { id: schoolDoc.id, ...schoolDoc.data() };
        }
      }

      // Get school admin details
      if (assignmentData.assignedTo) {
        try {
          const schoolAdminData = await admin.auth().getUser(assignmentData.assignedTo);
          assignmentData.schoolAdmin = {
            uid: schoolAdminData.uid,
            email: schoolAdminData.email,
            displayName: schoolAdminData.displayName || 'Unknown',
            customClaims: schoolAdminData.customClaims
          };
        } catch (error) {
          console.error('Error getting school admin data:', error);
          assignmentData.schoolAdmin = { uid: assignmentData.assignedTo, email: 'Unknown' };
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

export const getAvailableSchoolAdmins = async (req: Request, res: Response) => {
  try {
    const { uid } = req.user!;

    // Get district admin's custom claims
    const adminData = await admin.auth().getUser(uid);
    if (!adminData.customClaims?.districtId) {
      return res.status(400).json({ message: 'District admin data not found' });
    }

    const districtId = adminData.customClaims.districtId;
    console.log('🏫 Getting school admins for district:', districtId);

    // Get all schools in the district
    const schoolsSnapshot = await admin.firestore()
      .collection('schools')
      .where('districtId', '==', districtId)
      .where('status', '==', 'active')
      .get();

    const schools = schoolsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
    console.log('🏫 Found schools:', schools.length);

    // Get all users with school admin role in this district
    const listUsersResult = await admin.auth().listUsers();
    const schoolAdmins = listUsersResult.users.filter(user => {
      const claims = user.customClaims;
      return claims?.role === 'school-admin' && claims?.districtId === districtId;
    });

    console.log('👨‍💼 Found school admins:', schoolAdmins.length);

    // Combine school admin data with their schools
    const schoolAdminsWithSchools = schoolAdmins.map(admin => {
      const schoolId = admin.customClaims?.schoolId;
      const school = schools.find(s => s.id === schoolId);
      
      return {
        uid: admin.uid,
        email: admin.email,
        displayName: admin.displayName || 'Unknown',
        schoolId: schoolId,
        school: school ? { id: school.id, name: school.name } : null
      };
    });

    res.status(200).json({
      schoolAdmins: schoolAdminsWithSchools,
      schools
    });

  } catch (error) {
    console.error('❌ Error getting available school admins:', error);
    res.status(500).json({ message: 'Failed to get available school admins' });
  }
};
