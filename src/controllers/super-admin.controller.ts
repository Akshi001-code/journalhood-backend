import { Request, Response } from "express";
import {
  TCreateDistrictAdmin,
  TDistrictAdminParam,
  TMultipleDistrictAdminCreationSchema,
  TCreateDistrict,
  TDistrictParam,
  TUpdateDistrict,
} from "../validators/super-admin.validator";
import admin from "../config/firebase.config";
import {
  FirebaseAuthError,
  ListUsersResult,
  UserRecord,
} from "firebase-admin/auth";
import { DEFAULT_PASSWORDS, ROLES } from "../config/app.config";
import { transporter } from "../config/nodemailer.config";
import { Timestamp } from 'firebase-admin/firestore';
import { DocumentData, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { createHierarchicalClaims } from "../utils/roleHierarchy";
import { generateRandomPassword } from "../utils/generate-password";
import { FirebaseEmailService } from "../services/firebase-email.service";
import { tryDecryptContent, isEncrypted } from "../utils/decrypt-journal";

// Test email function
export const testEmail = async (req: Request, res: Response) => {
  try {
    const { testEmailAddress } = req.body;
    const targetEmail = testEmailAddress || req.user?.email || process.env.EMAIL;

    if (!targetEmail) {
      return res.status(400).json({
        error: "No email address provided",
        details: "Please provide a testEmailAddress in the request body"
      });
    }

    if (!transporter) {
      return res.status(500).json({
        error: "Email transporter not configured",
        details: "Check EMAIL and EMAIL_PASSWORD environment variables"
      });
    }

    // Send test email
    await transporter!.sendMail({
      from: process.env.TITAN_EMAIL || (process.env as any).titanemail || process.env.EMAIL,
      to: targetEmail,
      subject: "JournalHood Email Test - Configuration Successful!",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Email Test Successful</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #10b981; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
            .content { background-color: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; }
            .success { color: #10b981; font-weight: bold; }
            .info { background-color: #e0f2fe; padding: 15px; border-radius: 6px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>✅ Email Configuration Test</h1>
          </div>
          <div class="content">
            <p class="success">Congratulations! Your email configuration is working perfectly.</p>
            
            <div class="info">
              <h3>📧 Configuration Details:</h3>
              <p><strong>From:</strong> ${process.env.TITAN_EMAIL || (process.env as any).titanemail || process.env.EMAIL}</p>
              <p><strong>To:</strong> ${targetEmail}</p>
              <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
              <p><strong>Status:</strong> Email sent successfully</p>
            </div>
            
            <p>This means your JournalHood system can now send:</p>
            <ul>
              <li>✅ Welcome emails to new administrators</li>
              <li>✅ Password reset links</li>
              <li>✅ Account notifications</li>
              <li>✅ System alerts</li>
            </ul>
            
            <p>Your email functionality is fully operational!</p>
            <p><strong>The JournalHood Team</strong></p>
          </div>
        </body>
        </html>
      `,
    });

    console.log(`✅ Test email sent successfully to ${targetEmail}`);
    
    return res.status(200).json({
      message: "Test email sent successfully!",
      sentTo: targetEmail,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("❌ Test email failed:", error);
    
    let errorMessage = "Failed to send test email";
    let errorDetails = "";

    if (error instanceof Error) {
      errorMessage = error.message;
      
      if (error.message.includes("authentication failed")) {
        errorDetails = "Email authentication failed. Check your EMAIL_PASSWORD environment variable.";
        if (process.env.EMAIL?.includes("gmail.com")) {
          errorDetails += " For Gmail, use an App Password instead of your regular password.";
        }
      } else if (error.message.includes("ENOTFOUND")) {
        errorDetails = "SMTP server not found. Check your email provider configuration.";
      } else if (error.message.includes("ECONNREFUSED")) {
        errorDetails = "Connection refused. Check SMTP host and port settings.";
      }
    }

    return res.status(500).json({
      error: errorMessage,
      details: errorDetails,
      timestamp: new Date().toISOString()
    });
  }
};

// Test Firebase email configuration
export const testFirebaseEmail = async (req: Request, res: Response) => {
  try {
    const { email = "test@example.com" } = req.body;
    
    console.log("🧪 Testing Firebase email configuration...");
    console.log("📧 Target email:", email);
    
    // Test Firebase Auth connection
    try {
      const user = await admin.auth().getUserByEmail(email).catch(() => null);
      console.log("🔍 User lookup result:", user ? "Found" : "Not found");
    } catch (error) {
      console.log("🔍 User lookup error:", error);
    }
    
    // Test password reset email
    try {
      const resetLink = await admin.auth().generatePasswordResetLink(email, {
        url: 'http://localhost:3000/login',
        handleCodeInApp: false,
      });
      
      console.log("✅ Password reset link generated successfully");
      console.log("🔗 Reset link:", resetLink);
      
      return res.status(200).json({
        success: true,
        message: "Firebase email test successful",
        resetLink,
        note: "If you didn't receive the email, check Firebase Console > Authentication > Templates"
      });
    } catch (error) {
      console.error("❌ Password reset link generation failed:", error);
      return res.status(500).json({
        success: false,
        error: error.message,
        note: "Check Firebase Console > Authentication > Templates and ensure they are enabled"
      });
    }
  } catch (error) {
    console.error("❌ Firebase email test failed:", error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// createDistrictAdmin
export const createDistrictAdmin = async (req: Request, res: Response) => {
  try {
    const { email, name, districtId, phone } = req.body;

    console.log("🔄 Creating district admin:", { email, name, districtId, phone });

    // Check if district exists
    const districtDoc = await admin.firestore().collection("districts").doc(districtId).get();
    if (!districtDoc.exists) {
      console.log("❌ District not found:", districtId);
      return res.status(404).json({ error: "District not found" });
    }

    console.log("✅ District found:", districtDoc.data()?.name);

    // Check if user already exists
    try {
      const existingUser = await admin.auth().getUserByEmail(email);
      console.log("❌ User already exists:", existingUser.uid);
      return res.status(400).json({ error: "User already exists" });
    } catch (error: any) {
      if (error.code !== 'auth/user-not-found') {
        throw error;
      }
      console.log("✅ User doesn't exist, proceeding with creation");
    }

    // Create user in Firebase Auth
    const userCreateData: admin.auth.CreateRequest = {
      displayName: name,
      email: email,
      password: DEFAULT_PASSWORDS.DISTRICT_ADMIN,
      emailVerified: false,
      phoneNumber: phone || null,
    };
     
    const userRecord = await admin.auth().createUser(userCreateData);
    console.log("✅ Firebase Auth user created:", userRecord.uid);

    // Create user document in Firestore
    const userDocData = {
      displayName: name,
      email: email,
      role: ROLES.DISTRICT_ADMIN,
      districtId: districtId,
      districtName: districtDoc.data()?.name || '',
      isActive: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      phoneNumber: phone || null,
    };
     
    await admin.firestore().collection("users").doc(userRecord.uid).set(userDocData);
    console.log("✅ Firestore user document created");

    // Set custom claims for role-based access
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      role: ROLES.DISTRICT_ADMIN,
      districtId: districtId,
      districtName: districtDoc.data()?.name || '',
    });
    console.log("✅ Custom claims set for district admin");

    // Determine the from address once (prefer Titan env, fallback to generic EMAIL)
    const fromAddress =
      process.env.TITAN_EMAIL ||
      (process.env as any).titanemail ||
      process.env.EMAIL ||
      "noreply@journalhood.com";

    // Generate password reset and email verification links and send welcome email
    if (email) {
      const [resetLink, verifyEmailLink] = await Promise.all([
        admin.auth().generatePasswordResetLink(email),
        admin.auth().generateEmailVerificationLink(email)
      ]);

      if (transporter && fromAddress) {
        try {
          await transporter.sendMail({
            from: fromAddress,
            to: email,
            subject: "Welcome to Journal Hood",
            html: `
              <h1>Welcome to Journal Hood</h1>
              <p>You have been added as a District Admin in Journal Hood</p>
              <p>Please click the link below to reset your password</p>
              <a href="${resetLink}">Reset Password</a>
              <p>Please click the link below to verify your email</p>
              <a href="${verifyEmailLink}">Verify Email</a>
            `,
          });
        } catch (emailError) {
          console.error("Error sending welcome email:", emailError);
        }
      } else {
        console.warn("Email configuration missing, skipping welcome email");
      }
    }

    return res.status(201).json({
      success: true,
      message: "District admin created successfully",
      data: {
        id: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        phoneNumber: userRecord.phoneNumber,
        emailSent: !!(transporter && fromAddress),
      },
    });
  } catch (error) {
    console.error("Error creating district admin:", error);
    if (error instanceof Error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
};

// createMultipleDistrictAdmins
export const createMultipleDistrictAdmins = async (
  req: Request,
  res: Response
) => {
  try {
    const districtAdmins: TMultipleDistrictAdminCreationSchema = req.body;

    districtAdmins.forEach(async (districtAdmin) => {
      const user = await admin.auth().getUserByEmail(districtAdmin.email);

      if (user) {
        throw new Error(
          `User with email ${districtAdmin.email} already exists`
        );
      }
    });

    await Promise.all(
      districtAdmins.map(
        async ({ districtId, email, name, password, phone, role }) => {
          try {
            // Get district info to ensure it exists
            const districtDoc = await admin.firestore()
              .collection("districts")
              .doc(districtId)
              .get();
            
            if (!districtDoc.exists) {
              throw new Error("District not found");
            }

            // Create the user if they don't exist
            const newUser: UserRecord = await admin.auth().createUser({
              displayName: name,
              email: email,
              password: password,
              phoneNumber: phone,
              emailVerified: false,
            });

            // Set custom claims
            await admin.auth().setCustomUserClaims(newUser.uid, {
              role,
              districtId: districtId,
              districtName: districtDoc.data()?.name || '',
            });
          } catch (err: any) {
            console.error(`Error processing user ${email}:`, err.message);
            throw err;
          }
        }
      )
    );

    return res.status(200).json({
      message: "District Admins Created Successfully",
    });
  } catch (error) {
    console.log("Error while creating district admin", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Internal Server Error",
    });
  }
};

// getDistrictAdmins
export const getDistrictAdmins = async (_req: Request, res: Response) => {
  try {
    console.log("🔍 Fetching district admins...");
    const listUserResult: ListUsersResult = await admin.auth().listUsers();

    const users: UserRecord[] = listUserResult.users;
    console.log(`📊 Total users: ${users.length}`);
    
    const districtAdmins: UserRecord[] = users.filter(
      (user: UserRecord) => {
        const isDistrictAdmin = user.customClaims?.role === ROLES.DISTRICT_ADMIN;
        if (isDistrictAdmin) {
          console.log(`✅ Found district admin: ${user.email} (${user.uid})`);
        }
        return isDistrictAdmin;
      }
    );

    console.log(`📋 District admins found: ${districtAdmins.length}`);

    res.status(200).json({
      districtAdmins,
    });
  } catch (error) {
    console.log("Error while getting district admins", error);
    res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

// updateDistrictAdmin
export const updateDistrictAdmin = async (req: Request, res: Response) => {
  try {
    const { uid }: TDistrictAdminParam = req.params as TDistrictAdminParam;
    const { email, name, phone, districtId }: TCreateDistrictAdmin = req.body;

    const user: UserRecord = await admin.auth().getUser(uid);

    if (user.email !== email) {
      await admin.auth().updateUser(uid, {
        email,
        displayName: name,
        password: DEFAULT_PASSWORDS.DISTRICT_ADMIN,
        phoneNumber: phone,
        emailVerified: false,
      });
    } else {
      await admin.auth().updateUser(uid, {
        displayName: name,
        phoneNumber: phone,
      });
    }

    await admin.auth().setCustomUserClaims(uid, {
      ...user.customClaims,
      districtId,
    });

    const passwordResetLink = await admin
      .auth()
      .generatePasswordResetLink(email);
    const verifyEmailLink = await admin
      .auth()
      .generateEmailVerificationLink(email);

    await transporter.sendMail({
      from: process.env.EMAIL,
      to: email,
      subject: "Welcome to Journal Hood",
      html: `
        <h1>Welcome to Journal Hood</h1>
        <p>You have been added as a District Admin in Journal Hood</p>
        <p>Please click the link below to reset your password</p>
        <a href="${passwordResetLink}">Reset Password</a>
        <p>Please click the link below to verify your email</p>
        <a href="${verifyEmailLink}">Verify Email</a>
        `,
    });

    res.status(200).json({
      message: "District Admin Updated Successfully",
    });
  } catch (error) {
    console.log("Error ", error);
    res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

// suspendOrUnsuspendDistrictAdmin
export const suspendOrUnsuspendDistrictAdmin = async (
  req: Request,
  res: Response
) => {
  try {
    const { uid }: TDistrictAdminParam = req.params as TDistrictAdminParam;

    const user: UserRecord = await admin.auth().getUser(uid);

    await admin.auth().updateUser(uid, {
      disabled: !user.disabled,
    });

    res.status(200).json({
      message: `District Admin ${
        user.disabled ? "Unsuspended" : "Suspended"
      } Successfully`,
    });
  } catch (error) {
    console.log("Suspend or Unsuspend District Admin Error", error);
    res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

// getSystemStats
export const getSystemStats = async (_req: Request, res: Response) => {
  try {
    const listUserResult: ListUsersResult = await admin.auth().listUsers();
    const users: UserRecord[] = listUserResult.users;

    // Count users by role
    const districtAdmins = users.filter(user => user.customClaims?.role === ROLES.DISTRICT_ADMIN);
    const schoolAdmins = users.filter(user => user.customClaims?.role === ROLES.SCHOOL_ADMIN);
    const teachers = users.filter(user => user.customClaims?.role === ROLES.TEACHER);
    const students = users.filter(user => user.customClaims?.role === ROLES.STUDENT);

    // Get unique districts from district admins
    const uniqueDistricts = new Set();
    districtAdmins.forEach(admin => {
      if (admin.customClaims?.districtId) {
        uniqueDistricts.add(admin.customClaims.districtId);
      }
    });

    // Get unique schools from school admins and teachers
    const uniqueSchools = new Set();
    [...schoolAdmins, ...teachers].forEach(user => {
      if (user.customClaims?.school) {
        uniqueSchools.add(user.customClaims.school);
      }
    });

    const stats = {
      totalDistricts: uniqueDistricts.size,
      activeDistricts: uniqueDistricts.size, // Assuming all are active for now
      totalSchools: uniqueSchools.size,
      activeSchools: uniqueSchools.size,
      totalStudents: students.length,
      activeStudents: students.filter(s => !s.disabled).length,
      totalDistrictAdmins: districtAdmins.length,
      activeDistrictAdmins: districtAdmins.filter(da => !da.disabled).length,
      totalSchoolAdmins: schoolAdmins.length,
      activeSchoolAdmins: schoolAdmins.filter(sa => !sa.disabled).length,
      totalTeachers: teachers.length,
      activeTeachers: teachers.filter(t => !t.disabled).length,
    };

    res.status(200).json(stats);
  } catch (error) {
    console.error("Error getting system stats:", error);
    res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

// deleteDistrictAdmin
export const deleteDistrictAdmin = async (req: Request, res: Response) => {
  try {
    const { uid }: TDistrictAdminParam = req.params as TDistrictAdminParam;

    await admin.auth().deleteUser(uid);

    res.status(200).json({
      message: "District Admin Deleted Successfully",
    });
  } catch (error) {
    console.log("Delete District Admin Error", error);
    res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

// createDistrict
export const createDistrict = async (req: Request, res: Response) => {
  try {
    const { name, country }: TCreateDistrict = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({
        error: "Invalid district name",
        details: "District name is required and cannot be empty"
      });
    }

    // Create district document in Firestore
    const districtRef = await admin.firestore().collection('districts').add({
      name: name.trim(),
      country,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'active',
      schoolCount: 0,
      studentCount: 0,
    });

    res.status(201).json({
      message: "District created successfully",
      district: {
        id: districtRef.id,
        name: name.trim(),
        country,
      },
    });
  } catch (error) {
    console.error("Error creating district:", error);
    res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

// updateDistrict
export const updateDistrict = async (req: Request, res: Response) => {
  try {
    const { id }: TDistrictParam = req.params as TDistrictParam;
    const { name, country }: TUpdateDistrict = req.body;

    await admin.firestore().collection('districts').doc(id).update({
      name,
      country,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(200).json({
      message: "District updated successfully",
    });
  } catch (error) {
    console.error("Error updating district:", error);
    res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

// deleteDistrict
export const deleteDistrict = async (req: Request, res: Response) => {
  try {
    const { id }: TDistrictParam = req.params as TDistrictParam;

    await admin.firestore().collection('districts').doc(id).delete();

    res.status(200).json({
      message: "District deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting district:", error);
    res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

// toggleDistrictStatus
export const toggleDistrictStatus = async (req: Request, res: Response) => {
  try {
    const { id }: TDistrictParam = req.params as TDistrictParam;
    const { status } = req.body;

    await admin.firestore().collection('districts').doc(id).update({
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(200).json({
      message: "District status updated successfully",
    });
  } catch (error) {
    console.error("Error updating district status:", error);
    res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

// getAllDistricts
export const getAllDistricts = async (_req: Request, res: Response) => {
  try {
    console.log('📊 Fetching all districts with admin information...');
    
    // Get districts from Firestore
    const districtsSnapshot = await admin.firestore().collection('districts').get();
    const districts = districtsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as any[];

    console.log(`📋 Found ${districts.length} districts`);

    // Get all schools to calculate class and school counts per district
    const schoolsSnapshot = await admin.firestore().collection('schools').get();
    const schools = schoolsSnapshot.docs.map(doc => ({
      id: doc.id,
      districtId: doc.data().districtId,
      classCount: doc.data().classCount || 0
    }));

    // Get all classes to count per district
    const classesSnapshot = await admin.firestore().collection('classes').get();
    const classes = classesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        schoolId: data.schoolId,
      };
    });
    // Map schoolId to districtId
    const schoolIdToDistrictId = schools.reduce((acc, school) => {
      acc[school.id] = school.districtId;
      return acc;
    }, {} as Record<string, string>);
    // Count classes per district
    const districtClassCounts = classes.reduce((acc, cls) => {
      const districtId = schoolIdToDistrictId[cls.schoolId];
      if (districtId) {
        acc[districtId] = (acc[districtId] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // Get all users to find district admins and students
    const listUserResult = await admin.auth().listUsers();
    const users = listUserResult.users;

    // Find district admins and match them to districts
    const districtAdmins = users.filter(user => 
      user.customClaims?.role === ROLES.DISTRICT_ADMIN
    );

    // Find students and count per district
    const students = users.filter(user => user.customClaims?.role === ROLES.STUDENT);
    const districtStudentCounts = students.reduce((acc, student) => {
      const districtId = student.customClaims?.districtId;
      if (districtId) {
        acc[districtId] = (acc[districtId] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // Count schools per district
    const districtSchoolCounts = schools.reduce((acc, school) => {
      if (school.districtId) {
        acc[school.districtId] = (acc[school.districtId] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // Enhance districts with admin information and counts
    const enhancedDistricts = districts.map(district => {
      // Find the admin for this district
      const admin = districtAdmins.find(user => 
        user.customClaims?.districtId === district.id
      );
      return {
        ...district,
        country: district.country || 'N/A',
        adminId: admin?.uid || null,
        adminName: admin?.displayName || null,
        adminEmail: admin?.email || null,
        classCount: districtClassCounts[district.id] || 0,
        schoolCount: districtSchoolCounts[district.id] || 0,
        studentCount: districtStudentCounts[district.id] || 0
      };
    });

    res.status(200).json({
      districts: enhancedDistricts,
    });
  } catch (error) {
    console.error("❌ Error getting all districts:", error);
    res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

// getAllSchools
export const getAllSchools = async (_req: Request, res: Response) => {
  try {
    // Get schools from Firestore collection
    const schoolsSnapshot = await admin.firestore().collection('schools').get();
    const schools = schoolsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data?.name || "Unnamed School",
        address: data?.address || "",
        zipCode: data?.zipCode || "",
        districtId: data?.districtId || "",
        districtName: data?.districtName || "",
        adminId: data?.adminId || "",
        adminName: data?.adminName || "",
        adminEmail: data?.adminEmail || "",
        teacherCount: data?.teacherCount || 0,
        studentCount: data?.studentCount || 0,
        classCount: data?.classCount || 0,
        status: data?.status || "active",
        createdAt: data?.createdAt || new Date()
      };
    });

    // Get actual counts from users if needed
    const listUserResult = await admin.auth().listUsers();
    const users = listUserResult.users;
    
    // Get teacher counts
    const teachers = users.filter(
      (user) => user.customClaims?.role === ROLES.TEACHER
    );

    // Get student counts
    const students = users.filter(
      (user) => user.customClaims?.role === ROLES.STUDENT
    );

    // Update counts with actual data
    schools.forEach(school => {
      school.teacherCount = teachers.filter(
        t => t.customClaims?.schoolId === school.id
      ).length;
      school.studentCount = students.filter(
        s => s.customClaims?.schoolId === school.id
      ).length;
    });

    res.status(200).json({
      schools
    });
  } catch (error: any) {
    console.error("Error while getting schools:", error);
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
};

// Helper function to get districts data
const getDistrictsData = async () => {
  try {
    const snapshot = await admin.firestore().collection('districts').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting districts data:', error);
    return [];
  }
};

// Helper function to get schools data
const getSchoolsData = async () => {
  try {
    const snapshot = await admin.firestore().collection('schools').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting schools data:', error);
    return [];
  }
};

interface UserData {
  role: string;
  name?: string;
  classId?: string;
  schoolId?: string;
}

interface ClassData {
  name?: string;
  division?: string;
  teacherId?: string;
}

interface SchoolData {
  name?: string;
  districtId?: string;
}

interface DistrictData {
  name?: string;
}

interface JournalAnalytics {
  studentId: string;
  studentName: string;
  className: string;
  division: string;
  teacherName: string;
  schoolName: string;
  districtName: string;
  emotion: string;
  wordCount: number;
  timestamp: Date;
}

interface DiaryEntry {
  id: string;
  content: string;
  timestamp: FirebaseFirestore.Timestamp;
  studentId: string;
}

interface RawDiaryEntry {
  content: {
    [key: string]: {
      insert: string;
    };
  };
  timestamp: FirebaseFirestore.Timestamp;
}

interface StudentStats {
  totalWords: number;
  avgWordsPerEntry: number;
  totalEntries: number;
  studentName: string;
  classId: string;
  schoolId: string;
  districtId: string;
}

interface ClassStats {
  totalWords: number;
  avgWordsPerStudent: number;
  totalEntries: number;
  activeStudents: number;
  className: string;
  schoolId: string;
}

interface SchoolStats {
  totalWords: number;
  avgWordsPerStudent: number;
  totalEntries: number;
  activeStudents: number;
  schoolName: string;
  districtId: string;
}

interface DistrictStats {
  totalWords: number;
  avgWordsPerStudent: number;
  totalEntries: number;
  activeStudents: number;
  districtName: string;
}

interface AnalyzedData {
  id: string;
  timestamp: admin.firestore.Timestamp;
  totalWords: number;
  totalEntries: number;
  districtStats: {
    [districtId: string]: {
      districtName: string;
      totalWords: number;
      avgWordsPerStudent: number;
      totalEntries: number;
      activeStudents: number;
      weeklyGrowth?: number;
      monthlyGrowth?: number;
      weeklyEntries?: number;
      monthlyEntries?: number;
      weeklyAvgWords?: number;
      monthlyAvgWords?: number;
      emotionDistribution: { [emotion: string]: number };
      schools: string[];
      classes: string[];
    };
  };
  schoolStats: {
    [schoolId: string]: {
      schoolName: string;
      districtId: string;
      districtName: string;
      totalWords: number;
      avgWordsPerStudent: number;
      totalEntries: number;
      activeStudents: number;
      weeklyGrowth?: number;
      monthlyGrowth?: number;
      weeklyEntries?: number;
      monthlyEntries?: number;
      weeklyAvgWords?: number;
      monthlyAvgWords?: number;
      emotionDistribution: { [emotion: string]: number };
      classes: string[];
    };
  };
  classStats: {
    [classId: string]: {
      className: string;
      schoolId: string;
      schoolName: string;
      districtId: string;
      districtName: string;
      totalWords: number;
      avgWordsPerStudent: number;
      totalEntries: number;
      activeStudents: number;
      weeklyGrowth?: number;
      monthlyGrowth?: number;
      weeklyEntries?: number;
      monthlyEntries?: number;
      weeklyAvgWords?: number;
      monthlyAvgWords?: number;
      emotionDistribution: { [emotion: string]: number };
    };
  };
  studentStats: {
    [studentId: string]: {
      studentName: string;
      classId: string;
      className: string;
      schoolId: string;
      schoolName: string;
      districtId: string;
      districtName: string;
      totalWords: number;
      avgWordsPerEntry: number;
      totalEntries: number;
      weeklyGrowth?: number;
      monthlyGrowth?: number;
      weeklyEntries?: number;
      monthlyEntries?: number;
      weeklyAvgWords?: number;
      monthlyAvgWords?: number;
      emotionDistribution: { [emotion: string]: number };
      lastEntryDate?: string;
    };
  };
}

export const analyzeDiaryEntries = async (req: Request, res: Response) => {
  try {
    console.log('🧠 Starting unified journal analysis workflow...');
    
    const { uid: adminId } = req.user!;
    
    // Verify this is a super admin
    const adminUser = await admin.auth().getUser(adminId);
    const adminClaims = adminUser.customClaims as any;
    
    if (adminClaims?.role !== 'super-admin') {
      return res.status(403).json({
        error: "Access denied",
        details: "Only super admins can run comprehensive analysis"
      });
    }

    const db = admin.firestore();
    
    // STEP 1: Get all students with their hierarchical data
    console.log('👥 Getting all students...');
    const studentsSnapshot = await admin.auth().listUsers();
    const students = studentsSnapshot.users.filter(user => {
      const claims = user.customClaims as any;
      return claims && claims.role === ROLES.STUDENT;
    });

    // STEP 2: Get all journal entries
    console.log('📝 Getting all journal entries...');
    const entries: any[] = [];
    
    // Get from diaryEntries (non-encrypted)
    for (const student of students) {
      const claims = student.customClaims as any;
      if (!claims) continue;

      const entriesSnapshot = await db
        .collection('diaryEntries')
        .doc(student.uid)
        .collection('entries')
        .orderBy('timestamp', 'desc')
        .get();

      entries.push(...entriesSnapshot.docs.map(doc => ({
        id: doc.id,
        studentId: student.uid,
        studentName: student.displayName || student.email,
        classId: claims.classId,
        className: `${claims.gradeName} ${claims.division}`,
        schoolId: claims.schoolId,
        schoolName: claims.schoolName,
        districtId: claims.districtId,
        districtName: claims.districtName,
        ...doc.data()
      })));
    }

    console.log(`📊 Found ${entries.length} total entries`);

    // STEP 3: Calculate statistics
    console.log('📊 Calculating statistics...');
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const stats: AnalyzedData = {
      id: new Date().toISOString(),
      timestamp: admin.firestore.Timestamp.now(),
      totalWords: 0,
      totalEntries: entries.length,
      districtStats: {},
      schoolStats: {},
      classStats: {},
      studentStats: {}
    };

    // Process each entry
    for (const entry of entries) {
      const {
        studentId,
        studentName,
        classId,
        className,
        schoolId,
        schoolName,
        districtId,
        districtName,
        content,
        emotion,
        timestamp
      } = entry;

      // Initialize stats objects if they don't exist
      if (!stats.studentStats[studentId]) {
        stats.studentStats[studentId] = {
          studentName,
          classId,
          className,
          schoolId,
          schoolName,
          districtId,
          districtName,
          totalWords: 0,
          avgWordsPerEntry: 0,
          totalEntries: 0,
          weeklyEntries: 0,
          monthlyEntries: 0,
          weeklyAvgWords: 0,
          monthlyAvgWords: 0,
          emotionDistribution: {},
          lastEntryDate: ''
        };
      }

      if (!stats.classStats[classId]) {
        stats.classStats[classId] = {
          className,
          schoolId,
          schoolName,
          districtId,
          districtName,
          totalWords: 0,
          avgWordsPerStudent: 0,
          totalEntries: 0,
          activeStudents: 0,
          weeklyEntries: 0,
          monthlyEntries: 0,
          weeklyAvgWords: 0,
          monthlyAvgWords: 0,
          emotionDistribution: {}
        };
      }

      if (!stats.schoolStats[schoolId]) {
        stats.schoolStats[schoolId] = {
          schoolName,
          districtId,
          districtName,
          totalWords: 0,
          avgWordsPerStudent: 0,
          totalEntries: 0,
          activeStudents: 0,
          weeklyEntries: 0,
          monthlyEntries: 0,
          weeklyAvgWords: 0,
          monthlyAvgWords: 0,
          emotionDistribution: {},
          classes: []
        };
        if (!stats.schoolStats[schoolId].classes.includes(classId)) {
          stats.schoolStats[schoolId].classes.push(classId);
        }
      }

      if (!stats.districtStats[districtId]) {
        stats.districtStats[districtId] = {
          districtName,
          totalWords: 0,
          avgWordsPerStudent: 0,
          totalEntries: 0,
          activeStudents: 0,
          weeklyEntries: 0,
          monthlyEntries: 0,
          weeklyAvgWords: 0,
          monthlyAvgWords: 0,
          emotionDistribution: {},
          schools: [],
          classes: []
        };
        if (!stats.districtStats[districtId].schools.includes(schoolId)) {
          stats.districtStats[districtId].schools.push(schoolId);
        }
        if (!stats.districtStats[districtId].classes.includes(classId)) {
          stats.districtStats[districtId].classes.push(classId);
        }
      }

      // Calculate word count
      let wordCount = 0;
      if (Array.isArray(content)) {
        wordCount = content
          .map(item => (item.insert || '').toString().trim())
          .join(' ')
          .split(/\s+/)
          .filter((word: string) => word.length > 0)
          .length;
      } else if (typeof content === 'string') {
        wordCount = content.trim().split(/\s+/).filter((word: string) => word.length > 0).length;
      }

      // Update student stats
      const student = stats.studentStats[studentId];
      student.totalWords += wordCount;
      student.totalEntries++;
      student.avgWordsPerEntry = Math.round(student.totalWords / student.totalEntries);
      student.emotionDistribution[emotion] = (student.emotionDistribution[emotion] || 0) + 1;
      
      const entryDate = timestamp.toDate();
      if (!student.lastEntryDate || entryDate > new Date(student.lastEntryDate)) {
        student.lastEntryDate = entryDate.toISOString();
      }

      if (entryDate > weekAgo) {
        student.weeklyEntries = (student.weeklyEntries || 0) + 1;
        student.weeklyAvgWords = Math.round(wordCount / student.weeklyEntries);
      }
      if (entryDate > monthAgo) {
        student.monthlyEntries = (student.monthlyEntries || 0) + 1;
        student.monthlyAvgWords = Math.round(wordCount / student.monthlyEntries);
      }

      // Update class stats
      const classStats = stats.classStats[classId];
      classStats.totalWords += wordCount;
      classStats.totalEntries++;
      classStats.emotionDistribution[emotion] = (classStats.emotionDistribution[emotion] || 0) + 1;
      if (entryDate > weekAgo) {
        classStats.weeklyEntries = (classStats.weeklyEntries || 0) + 1;
        classStats.weeklyAvgWords = Math.round(wordCount / classStats.weeklyEntries);
      }
      if (entryDate > monthAgo) {
        classStats.monthlyEntries = (classStats.monthlyEntries || 0) + 1;
        classStats.monthlyAvgWords = Math.round(wordCount / classStats.monthlyEntries);
      }

      // Update school stats
      const schoolStats = stats.schoolStats[schoolId];
      schoolStats.totalWords += wordCount;
      schoolStats.totalEntries++;
      schoolStats.emotionDistribution[emotion] = (schoolStats.emotionDistribution[emotion] || 0) + 1;
      if (entryDate > weekAgo) {
        schoolStats.weeklyEntries = (schoolStats.weeklyEntries || 0) + 1;
        schoolStats.weeklyAvgWords = Math.round(wordCount / schoolStats.weeklyEntries);
      }
      if (entryDate > monthAgo) {
        schoolStats.monthlyEntries = (schoolStats.monthlyEntries || 0) + 1;
        schoolStats.monthlyAvgWords = Math.round(wordCount / schoolStats.monthlyEntries);
      }

      // Update district stats
      const districtStats = stats.districtStats[districtId];
      districtStats.totalWords += wordCount;
      districtStats.totalEntries++;
      districtStats.emotionDistribution[emotion] = (districtStats.emotionDistribution[emotion] || 0) + 1;
      if (entryDate > weekAgo) {
        districtStats.weeklyEntries = (districtStats.weeklyEntries || 0) + 1;
        districtStats.weeklyAvgWords = Math.round(wordCount / districtStats.weeklyEntries);
      }
      if (entryDate > monthAgo) {
        districtStats.monthlyEntries = (districtStats.monthlyEntries || 0) + 1;
        districtStats.monthlyAvgWords = Math.round(wordCount / districtStats.monthlyEntries);
      }

      // Update total words
      stats.totalWords += wordCount;
    }

    // Calculate active students and averages
    const activeStudentsByClass = new Set<string>();
    const activeStudentsBySchool = new Set<string>();
    const activeStudentsByDistrict = new Set<string>();

    Object.entries(stats.studentStats).forEach(([studentId, student]) => {
      if (student.totalEntries > 0) {
        activeStudentsByClass.add(`${student.classId}_${studentId}`);
        activeStudentsBySchool.add(`${student.schoolId}_${studentId}`);
        activeStudentsByDistrict.add(`${student.districtId}_${studentId}`);
      }
    });

    // Update class stats
    Object.entries(stats.classStats).forEach(([classId, classStats]) => {
      const activeStudents = Array.from(activeStudentsByClass)
        .filter(key => key.startsWith(`${classId}_`))
        .length;
      classStats.activeStudents = activeStudents;
      classStats.avgWordsPerStudent = activeStudents > 0 
        ? Math.round(classStats.totalWords / activeStudents)
        : 0;
    });

    // Update school stats
    Object.entries(stats.schoolStats).forEach(([schoolId, schoolStats]) => {
      const activeStudents = Array.from(activeStudentsBySchool)
        .filter(key => key.startsWith(`${schoolId}_`))
        .length;
      schoolStats.activeStudents = activeStudents;
      schoolStats.avgWordsPerStudent = activeStudents > 0
        ? Math.round(schoolStats.totalWords / activeStudents)
        : 0;
    });

    // Update district stats
    Object.entries(stats.districtStats).forEach(([districtId, districtStats]) => {
      const activeStudents = Array.from(activeStudentsByDistrict)
        .filter(key => key.startsWith(`${districtId}_`))
        .length;
      districtStats.activeStudents = activeStudents;
      districtStats.avgWordsPerStudent = activeStudents > 0
        ? Math.round(districtStats.totalWords / activeStudents)
        : 0;
    });

    // Calculate growth rates
    const previousAnalyticsSnapshot = await db
      .collection('analyzedData')
      .orderBy('timestamp', 'desc')
      .limit(1)
      .get();

    if (!previousAnalyticsSnapshot.empty) {
      const previousAnalytics = previousAnalyticsSnapshot.docs[0].data() as AnalyzedData;

      // Calculate growth for each level
      Object.entries(stats.studentStats).forEach(([studentId, student]) => {
        const previous = previousAnalytics.studentStats?.[studentId];
        if (previous) {
          student.weeklyGrowth = calculateGrowthRate(
            previous.weeklyEntries || 0,
            student.weeklyEntries || 0
          );
          student.monthlyGrowth = calculateGrowthRate(
            previous.monthlyEntries || 0,
            student.monthlyEntries || 0
          );
        }
      });

      Object.entries(stats.classStats).forEach(([classId, classStats]) => {
        const previous = previousAnalytics.classStats?.[classId];
        if (previous) {
          classStats.weeklyGrowth = calculateGrowthRate(
            previous.weeklyEntries || 0,
            classStats.weeklyEntries || 0
          );
          classStats.monthlyGrowth = calculateGrowthRate(
            previous.monthlyEntries || 0,
            classStats.monthlyEntries || 0
          );
        }
      });

      Object.entries(stats.schoolStats).forEach(([schoolId, schoolStats]) => {
        const previous = previousAnalytics.schoolStats?.[schoolId];
        if (previous) {
          schoolStats.weeklyGrowth = calculateGrowthRate(
            previous.weeklyEntries || 0,
            schoolStats.weeklyEntries || 0
          );
          schoolStats.monthlyGrowth = calculateGrowthRate(
            previous.monthlyEntries || 0,
            schoolStats.monthlyEntries || 0
          );
        }
      });

      Object.entries(stats.districtStats).forEach(([districtId, districtStats]) => {
        const previous = previousAnalytics.districtStats?.[districtId];
        if (previous) {
          districtStats.weeklyGrowth = calculateGrowthRate(
            previous.weeklyEntries || 0,
            districtStats.weeklyEntries || 0
          );
          districtStats.monthlyGrowth = calculateGrowthRate(
            previous.monthlyEntries || 0,
            districtStats.monthlyEntries || 0
          );
        }
      });
    }

    // STEP 4: Save analytics report
    console.log('💾 Saving analytics report...');
    await db.collection('analyzedData').doc(stats.id).set(stats);
    console.log('💾 Analytics report saved');

    console.log('✅ Analysis completed successfully!');
    console.log('📊 Summary:');
    console.log(`  - Total entries analyzed: ${stats.totalEntries}`);
    console.log(`  - Total words counted: ${stats.totalWords}`);
    console.log(`  - Districts processed: ${Object.keys(stats.districtStats).length}`);
    console.log(`  - Schools processed: ${Object.keys(stats.schoolStats).length}`);
    console.log(`  - Classes processed: ${Object.keys(stats.classStats).length}`);
    console.log(`  - Students processed: ${Object.keys(stats.studentStats).length}`);

    return res.status(200).json({
      success: true,
      message: "Analysis completed successfully",
      data: stats
    });
  } catch (error: unknown) {
    console.error('❌ Error in analysis:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return res.status(500).json({
      error: "Failed to analyze data",
      details: errorMessage
    });
  }
};

function calculateGrowthRate(previous: number, current: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

// ================================================================================================
// INCREMENTAL ANALYTICS UPDATE FUNCTION
// ================================================================================================

export const updateAnalyticsIncremental = async (req: Request, res: Response) => {
  try {
    console.log('📊 Starting incremental analytics update...');
    
    const { uid: adminId } = req.user!;
    
    // Verify this is a super admin
    const adminUser = await admin.auth().getUser(adminId);
    const adminClaims = adminUser.customClaims as any;
    
    if (adminClaims?.role !== 'super-admin') {
      return res.status(403).json({
        error: "Access denied",
        details: "Only super admins can update analytics"
      });
    }

    const db = admin.firestore();

    // STEP 1: Get current analytics data
    console.log('📋 STEP 1: Getting current analytics data...');
    const analyticsSnapshot = await db.collection('analyzedData')
      .orderBy('timestamp', 'desc')
      .limit(1)
      .get();

    if (analyticsSnapshot.empty) {
      return res.status(404).json({
        error: "No existing analytics found",
        message: "Please run the main analysis first using /analyze-diary-entries"
      });
    }

    const currentAnalytics = analyticsSnapshot.docs[0].data() as AnalyzedData;
    console.log('📋 Current analytics found with:', {
      totalWords: currentAnalytics.totalWords,
      totalEntries: currentAnalytics.totalEntries,
      studentsCount: Object.keys(currentAnalytics.studentStats).length
    });

    // STEP 2: Get all journal entries from both sources
    console.log('📚 STEP 2: Collecting all journal entries...');
    
    // Get from analyzedjournals (already processed)
    const analyzedJournalsSnapshot = await db.collection('analyzedjournals').get();
    console.log(`📚 Found ${analyzedJournalsSnapshot.size} entries in analyzedjournals collection`);

    // Get from diaryEntriesBackup (not yet processed)
    const backupJournalsSnapshot = await db.collection('diaryEntriesBackup').get();
    const backupEntries: any[] = [];
    
    for (const studentDoc of backupJournalsSnapshot.docs) {
      const entriesSnapshot = await studentDoc.ref.collection('entries').get();
      for (const entryDoc of entriesSnapshot.docs) {
        const entryData = entryDoc.data();
        backupEntries.push({
          id: entryDoc.id,
          studentId: studentDoc.id,
          ...entryData
        });
      }
    }
    console.log(`📚 Found ${backupEntries.length} entries in diaryEntriesBackup collection`);

    // Get from user collections (new test entries)
    const usersSnapshot = await db.collection('users').where('role', '==', 'student').get();
    const userJournalEntries: any[] = [];
    
    for (const userDoc of usersSnapshot.docs) {
      const journalEntriesSnapshot = await userDoc.ref.collection('journalEntries').get();
      for (const entryDoc of journalEntriesSnapshot.docs) {
        const entryData = entryDoc.data();
        userJournalEntries.push({
          id: entryDoc.id,
          studentId: userDoc.id,
          ...entryData
        });
      }
    }
    console.log(`📚 Found ${userJournalEntries.length} entries in user collections`);

    // Combine all entries and deduplicate
    const allEntries = new Map();
    
    // Add analyzed journals
    analyzedJournalsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const key = `${data.studentId}_${data.originalId || doc.id}`;
      allEntries.set(key, {
        id: data.originalId || doc.id,
        studentId: data.studentId,
        content: data.content,
        timestamp: data.timestamp,
        wordCount: data.wordCount
      });
    });

    // Add backup entries
    backupEntries.forEach(entry => {
      const key = `${entry.studentId}_${entry.id}`;
      if (!allEntries.has(key)) {
        allEntries.set(key, entry);
      }
    });

    // Add user journal entries (newest, might include test entries)
    userJournalEntries.forEach(entry => {
      const key = `${entry.studentId}_${entry.id}`;
      allEntries.set(key, entry); // This will overwrite if exists, giving priority to latest version
    });

    const combinedEntries = Array.from(allEntries.values());
    console.log(`📚 Combined total: ${combinedEntries.length} unique entries`);

    // STEP 3: Recalculate analytics with all entries
    console.log('📊 STEP 3: Recalculating analytics...');
    
    // Get all students with their hierarchical data
    const studentsSnapshot = await admin.auth().listUsers();
    const students = studentsSnapshot.users.filter(user => {
      const claims = user.customClaims as any;
      return claims && claims.role === ROLES.STUDENT;
    });

    // Initialize stats objects
    const studentStats: Record<string, StudentStats & {
      districtName: string;
      emotionDistribution: { [emotion: string]: number };
      schools: string[];
      classes: string[];
    }> = {};
    const classStats: Record<string, ClassStats> = {};
    const schoolStats: Record<string, ExtendedSchoolStats> = {};
    const districtStats: Record<string, DistrictStats & {
      districtName: string;
      emotionDistribution: { [emotion: string]: number };
      schools: string[];
      classes: string[];
    }> = {};

    // Process each student's entries for analytics
    for (const student of students) {
      const claims = student.customClaims as {
        role: string;
        classId: string;
        className: string;
        schoolId: string;
        schoolName: string;
        districtId: string;
        districtName: string;
      } | undefined;
      
      if (!claims || !claims.classId || !claims.schoolId || !claims.districtId || !claims.className) continue;

      const studentEntries = combinedEntries.filter(entry => entry.studentId === student.uid);
      if (studentEntries.length === 0) continue;

      // Calculate student stats
      let totalWords = 0;
      for (const entry of studentEntries) {
        let content = entry.content;
        
        // Handle different content formats
        if (Array.isArray(content)) {
          content = content.map((op: any) => op.insert || '').join('').trim();
        } else if (typeof content === 'string') {
          content = content.trim();
        } else {
          continue;
        }

        if (content && content.length >= 10) {
          const words = content.split(/\s+/).filter(word => word.length > 0);
          totalWords += words.length;
        }
      }

      const avgWordsPerEntry = Math.round(totalWords / studentEntries.length);

      const classId = claims.classId;
      const schoolId = claims.schoolId;
      const districtId = claims.districtId;
        
      // Store student stats
      studentStats[student.uid] = {
        totalWords,
        avgWordsPerEntry,
        totalEntries: studentEntries.length,
        studentName: student.displayName || student.email || student.uid,
        classId,
        schoolId,
        districtId,
        districtName: claims.districtName,
        emotionDistribution: {},
        schools: [],
        classes: []
      };

      // Update class stats
      if (!classStats[classId]) {
        classStats[classId] = {
          totalWords: 0,
          avgWordsPerStudent: 0,
          totalEntries: 0,
          activeStudents: 0,
          className: claims.className,
          schoolId
        };
      }
      classStats[classId].totalWords += totalWords;
      classStats[classId].totalEntries += studentEntries.length;
      classStats[classId].activeStudents++;
      classStats[classId].avgWordsPerStudent = Math.round(classStats[classId].totalWords / classStats[classId].activeStudents);

      // Update school stats
      if (!schoolStats[schoolId]) {
        schoolStats[schoolId] = {
          totalWords: 0,
          avgWordsPerStudent: 0,
          totalEntries: 0,
          activeStudents: 0,
          schoolName: claims.schoolName || 'Unknown School',
          districtId,
          districtName: claims.districtName || 'Unknown District',
          emotionDistribution: {},
          classes: []
        };
      }
      schoolStats[schoolId].totalWords += totalWords;
      schoolStats[schoolId].totalEntries += studentEntries.length;
      schoolStats[schoolId].activeStudents++;
      schoolStats[schoolId].avgWordsPerStudent = Math.round(schoolStats[schoolId].totalWords / schoolStats[schoolId].activeStudents);

      // Update district stats
      if (!districtStats[districtId]) {
        districtStats[districtId] = {
          totalWords: 0,
          avgWordsPerStudent: 0,
          totalEntries: 0,
          activeStudents: 0,
          districtName: claims.districtName || 'Unknown District',
          emotionDistribution: {},
          schools: [],
          classes: []
        };
      }
      districtStats[districtId].totalWords += totalWords;
      districtStats[districtId].totalEntries += studentEntries.length;
      districtStats[districtId].activeStudents++;
      districtStats[districtId].avgWordsPerStudent = Math.round(districtStats[districtId].totalWords / districtStats[districtId].activeStudents);
    }

    // Create updated analyzed data document
    const updatedAnalytics: AnalyzedData = {
      id: new Date().toISOString(),
      timestamp: admin.firestore.Timestamp.now(),
      totalWords: Object.values(districtStats).reduce((sum, stats) => sum + stats.totalWords, 0),
      totalEntries: Object.values(districtStats).reduce((sum, stats) => sum + stats.totalEntries, 0),
      districtStats,
      schoolStats,
      classStats,
      studentStats
    };

    console.log(`📊 STEP 3 Complete: Updated analytics calculated`);
    console.log(`📊 Comparison:`, {
      oldWords: currentAnalytics.totalWords,
      newWords: updatedAnalytics.totalWords,
      oldEntries: currentAnalytics.totalEntries,
      newEntries: updatedAnalytics.totalEntries,
      wordsDiff: updatedAnalytics.totalWords - currentAnalytics.totalWords,
      entriesDiff: updatedAnalytics.totalEntries - currentAnalytics.totalEntries
    });

    // STEP 4: Save updated analytics
    console.log('💾 STEP 4: Saving updated analytics...');
    await db.collection('analyzedData').doc(updatedAnalytics.id).set(updatedAnalytics);
    console.log('💾 STEP 4 Complete: Updated analytics saved');

    console.log(`✅ Incremental analytics update completed successfully!`);

    return res.status(200).json({
      success: true,
      data: {
        previousStats: {
          totalWords: currentAnalytics.totalWords,
          totalEntries: currentAnalytics.totalEntries,
          students: Object.keys(currentAnalytics.studentStats).length
        },
        updatedStats: {
          totalWords: updatedAnalytics.totalWords,
          totalEntries: updatedAnalytics.totalEntries,
          students: Object.keys(updatedAnalytics.studentStats).length
        },
        changes: {
          wordsDiff: updatedAnalytics.totalWords - currentAnalytics.totalWords,
          entriesDiff: updatedAnalytics.totalEntries - currentAnalytics.totalEntries,
          entriesFromSources: {
            analyzedJournals: analyzedJournalsSnapshot.size,
            backupEntries: backupEntries.length,
            userJournals: userJournalEntries.length,
            totalUnique: combinedEntries.length
          }
        }
      }
    });

  } catch (error) {
    console.error('❌ Error in incremental analytics update:', error);
    return res.status(500).json({
      error: "Failed to update analytics incrementally",
      details: error.message
    });
  }
};

// Update the getAnalytics function to use the new dailyAnalytics collection
export const getAnalytics = async (req: Request, res: Response) => {
  try {
    const db = admin.firestore();
    
    // Get the latest analyzed data
    const analyticsSnapshot = await db.collection('analyzedData')
      .orderBy('timestamp', 'desc')
      .limit(1)
      .get();

    if (analyticsSnapshot.empty) {
      return res.status(404).json({
        error: "No analytics data found",
        message: "Please run the analysis first"
      });
    }

    const latestAnalytics = analyticsSnapshot.docs[0].data() as AnalyzedData;

    return res.status(200).json({
      data: latestAnalytics
    });
  } catch (error) {
    console.error('Error getting analytics:', error);
    return res.status(500).json({
      error: "Failed to get analytics data",
      details: (error as Error).message
    });
  }
};

// Get historical analytics data for line graphs
export const getHistoricalAnalytics = async (req: Request, res: Response) => {
  try {
    const db = admin.firestore();
    
    // Get last 30 days of analyzed data reports
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const historicalSnapshot = await db.collection('analyzedData')
      .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
      .orderBy('timestamp', 'asc')
      .get();

    if (historicalSnapshot.empty) {
      return res.status(200).json({
        data: [],
        message: "No historical data found for the last 30 days"
      });
    }

    const historicalData = historicalSnapshot.docs.map(doc => {
      const data = doc.data() as AnalyzedData;
      return {
        id: data.id,
        timestamp: data.timestamp.toDate().toISOString(),
        date: data.timestamp.toDate().toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
        fullDate: data.timestamp.toDate().toISOString().split('T')[0],
        totalWords: data.totalWords,
        totalEntries: data.totalEntries,
        activeDistricts: Object.keys(data.districtStats || {}).length,
        activeSchools: Object.keys(data.schoolStats || {}).length,
        activeClasses: Object.keys(data.classStats || {}).length,
        activeStudents: Object.keys(data.studentStats || {}).length
      };
    });

    return res.status(200).json({
      data: historicalData
    });
  } catch (error) {
    console.error('Error getting historical analytics:', error);
    return res.status(500).json({
      error: "Failed to get historical analytics data",
      details: (error as Error).message
    });
  }
};

function calculateStudentStats(analytics: JournalAnalytics[]) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentEntries = analytics.filter(entry => entry.timestamp >= thirtyDaysAgo);
  const uniqueStudents = new Set(analytics.map(entry => entry.studentId));
  const activeStudents = new Set(recentEntries.map(entry => entry.studentId));

  return {
    totalEntries: analytics.length,
    averageEntriesPerStudent: uniqueStudents.size > 0 
      ? (analytics.length / uniqueStudents.size).toFixed(1) 
      : 0,
    activeStudentsLast30Days: activeStudents.size,
    totalStudents: uniqueStudents.size
  };
}

function calculateDistrictStats(analytics: JournalAnalytics[]) {
  const districts = new Map<string, {
    name: string,
    studentCount: Set<string>,
    totalEntries: number,
    activeStudents: Set<string>
  }>();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Process each entry
  analytics.forEach(entry => {
    if (!districts.has(entry.districtName)) {
      districts.set(entry.districtName, {
        name: entry.districtName,
        studentCount: new Set(),
        totalEntries: 0,
        activeStudents: new Set()
      });
    }

    const districtData = districts.get(entry.districtName)!;
    districtData.studentCount.add(entry.studentId);
    districtData.totalEntries++;
    
    if (entry.timestamp >= thirtyDaysAgo) {
      districtData.activeStudents.add(entry.studentId);
    }
  });

  const districtArray = Array.from(districts.values())
    .map(district => ({
      name: district.name,
      studentCount: district.studentCount.size,
      averageEntries: Math.round(district.totalEntries / district.studentCount.size),
      activeStudents: district.activeStudents.size
    }))
    .sort((a, b) => b.activeStudents - a.activeStudents)
    .slice(0, 5);

  return {
    totalDistricts: districts.size,
    activeDistricts: districtArray.length,
    topDistricts: districtArray
  };
}

function calculateSchoolStats(analytics: JournalAnalytics[]) {
  const schools = new Map<string, {
    name: string,
    district: string,
    studentCount: Set<string>,
    activeStudents: Set<string>
  }>();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Process each entry
  analytics.forEach(entry => {
    if (!schools.has(entry.schoolName)) {
      schools.set(entry.schoolName, {
        name: entry.schoolName,
        district: entry.districtName,
        studentCount: new Set(),
        activeStudents: new Set()
      });
    }

    const schoolData = schools.get(entry.schoolName)!;
    schoolData.studentCount.add(entry.studentId);
    
    if (entry.timestamp >= thirtyDaysAgo) {
      schoolData.activeStudents.add(entry.studentId);
    }
  });

  const schoolArray = Array.from(schools.values())
    .map(school => ({
      name: school.name,
      district: school.district,
      studentCount: school.studentCount.size,
      activeStudents: school.activeStudents.size
    }))
    .sort((a, b) => b.activeStudents - a.activeStudents)
    .slice(0, 5);

  return {
    totalSchools: schools.size,
    activeSchools: schoolArray.length,
    averageStudentsPerSchool: Math.round(
      Array.from(schools.values()).reduce((sum, school) => sum + school.studentCount.size, 0) / schools.size
    ),
    topSchools: schoolArray
  };
}

async function getSystemHealth() {
  try {
    // Get total users
    const usersSnapshot = await admin.firestore().collection('users').count().get();
    const totalUsers = usersSnapshot.data().count;

    // Calculate storage used (simplified)
    const storageUsed = 1024; // 1GB placeholder

    return {
      uptime: 99.9, // Placeholder
      totalUsers,
      storageUsed,
      lastBackup: new Date().toISOString() // Placeholder
    };
  } catch (error) {
    console.error('Error getting system health:', error);
    return {
      uptime: 0,
      totalUsers: 0,
      storageUsed: 0,
      lastBackup: new Date().toISOString()
    };
  }
}

export const toggleSchoolStatus = async (req: Request, res: Response) => {
  try {
    const { id }: TDistrictParam = req.params as TDistrictParam;

    const school = await admin.firestore().collection('schools').doc(id).get();

    if (!school.exists) {
      return res.status(404).json({
        error: "School not found",
      });
    }

    const schoolData = school.data();

    await admin.firestore().collection('schools').doc(id).update({
      status: schoolData?.status === "active" ? "suspended" : "active",
    });

    res.status(200).json({
      message: "School status updated successfully",
    });
  } catch (error) {
    console.log("Error while toggling school status", error);
    res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

// Super Admin School Management Functions

// Create school with optional district assignment
export const createSchoolBySuperAdmin = async (req: Request, res: Response) => {
  try {
    const { name, address, zipCode, districtId, adminName, adminEmail, contactPhone } = req.body;

    if (!name) {
      return res.status(400).json({ 
        message: "School name is required" 
      });
    }

    console.log('🏫 Super Admin creating school:', { name, address, zipCode, districtId, adminName, adminEmail });

    // Get district name if districtId is provided
    let districtName = null;
    if (districtId) {
      try {
        const districtDoc = await admin.firestore().collection("districts").doc(districtId).get();
        if (districtDoc.exists) {
          districtName = districtDoc.data()?.name || null;
          console.log('✅ Found district:', { districtId, districtName });
        } else {
          console.warn('⚠️ District not found:', districtId);
        }
              } catch (error) {
          console.warn('⚠️ Error fetching district:', error instanceof Error ? error.message : 'Unknown error');
        }
    }

    // Create school in Firestore with optional district assignment
    const docRef = await admin.firestore().collection("schools").add({
      name,
      address: address || '',
      zipCode: zipCode || '',
      districtId: districtId || null,
      districtName: districtName,
      adminId: null, // No school admin assigned initially  
      adminName: adminName || null,
      adminEmail: adminEmail || null,
      contactPhone: contactPhone || null,
      teacherCount: 0,
      studentCount: 0,
      grades: [],
      status: "active",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log('✅ School created successfully:', docRef.id);

    res.status(201).json({
      message: "School created successfully",
      schoolId: docRef.id,
    });
  } catch (error) {
    console.error("Error creating school:", error);
    res.status(500).json({ 
      message: "Failed to create school",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

// Update school details
export const updateSchoolBySuperAdmin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, address, zipCode } = req.body;

    if (!id) {
      return res.status(400).json({ message: "School ID is required" });
    }

    console.log('🏫 Super Admin updating school:', { id, name, address, zipCode });

    // Check if school exists
    const schoolDoc = await admin.firestore().collection("schools").doc(id).get();
    if (!schoolDoc.exists) {
      return res.status(404).json({ message: "School not found" });
    }

    // Update school in Firestore
    const updateData: any = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (name) updateData.name = name;
    if (address !== undefined) updateData.address = address;
    if (zipCode !== undefined) updateData.zipCode = zipCode;

    await admin.firestore().collection("schools").doc(id).update(updateData);

    console.log('✅ School updated successfully:', id);

    res.status(200).json({ message: "School updated successfully" });
  } catch (error) {
    console.error("Error updating school:", error);
    res.status(500).json({ 
      message: "Failed to update school",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

// Delete school
export const deleteSchoolBySuperAdmin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "School ID is required" });
    }

    console.log('🏫 Super Admin deleting school:', id);

    // Check if school exists
    const schoolDoc = await admin.firestore().collection("schools").doc(id).get();
    if (!schoolDoc.exists) {
      return res.status(404).json({ message: "School not found" });
    }

    // TODO: Add checks for existing students/teachers/classes before deletion
    // For now, we'll allow deletion

    // Delete school from Firestore
    await admin.firestore().collection("schools").doc(id).delete();

    console.log('✅ School deleted successfully:', id);

    res.status(200).json({ message: "School deleted successfully" });
  } catch (error) {
    console.error("Error deleting school:", error);
    res.status(500).json({ 
      message: "Failed to delete school",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

// Assign school to district
export const assignSchoolToDistrict = async (req: Request, res: Response) => {
  try {
    const { schoolId, districtId } = req.body;

    if (!schoolId || !districtId) {
      return res.status(400).json({ 
        message: "School ID and District ID are required" 
      });
    }

    console.log('🏫 Super Admin assigning school to district:', { schoolId, districtId });

    // Check if school exists
    const schoolDoc = await admin.firestore().collection("schools").doc(schoolId).get();
    if (!schoolDoc.exists) {
      return res.status(404).json({ message: "School not found" });
    }

    // Check if district exists
    const districtDoc = await admin.firestore().collection("districts").doc(districtId).get();
    if (!districtDoc.exists) {
      return res.status(404).json({ message: "District not found" });
    }

    const districtData = districtDoc.data();
    if (!districtData?.name) {
      return res.status(400).json({ message: "District name not found" });
    }

    // Update school with district assignment
    await admin.firestore().collection("schools").doc(schoolId).update({
      districtId,
      districtName: districtData.name,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log('✅ School assigned to district successfully');

    res.status(200).json({ 
      message: "School assigned to district successfully"
    });
  } catch (error) {
    console.error("Error assigning school to district:", error);
    res.status(500).json({ 
      message: "Failed to assign school to district",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

// Unassign school from district
export const unassignSchoolFromDistrict = async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.body;

    if (!schoolId) {
      return res.status(400).json({ 
        message: "School ID is required" 
      });
    }

    console.log('🏫 Super Admin unassigning school from district:', schoolId);

    // Check if school exists
    const schoolDoc = await admin.firestore().collection("schools").doc(schoolId).get();
    if (!schoolDoc.exists) {
      return res.status(404).json({ message: "School not found" });
    }

    // Remove district assignment
    await admin.firestore().collection("schools").doc(schoolId).update({
      districtId: null,
      districtName: null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log('✅ School unassigned from district successfully');

    res.status(200).json({ 
      message: "School unassigned from district successfully"
    });
  } catch (error) {
    console.error("Error unassigning school from district:", error);
    res.status(500).json({ 
      message: "Failed to unassign school from district",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

// Get unassigned schools
export const getUnassignedSchools = async (req: Request, res: Response) => {
  try {
    console.log('🏫 Super Admin getting unassigned schools');

    // Get schools without district assignment
    const schoolsSnapshot = await admin.firestore()
      .collection("schools")
      .where("districtId", "==", null)
      .get();

    const schools = schoolsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    console.log('📊 Found unassigned schools:', schools.length);

    res.status(200).json({ 
      schools,
      count: schools.length
    });
  } catch (error) {
    console.error("Error getting unassigned schools:", error);
    res.status(500).json({ 
      message: "Failed to get unassigned schools",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

// Get students filtered by classId (Super Admin only)
export const getStudents = async (req: Request, res: Response) => {
  try {
    const classId = req.query.classId as string;

    console.log('👨‍🎓 Super Admin getting students, classId:', classId);

    // Get all users from Firebase Auth
    const studentsSnapshot = await admin.auth().listUsers();
    console.log('Total users found:', studentsSnapshot.users.length);

    // Filter students based on classId if provided
    let students = studentsSnapshot.users.filter(
      (user) => {
        const studentClaims = user.customClaims;
        
        if (!studentClaims) {
          return false;
        }

        // Must be a student
        if (studentClaims.role !== ROLES.STUDENT) {
          return false;
        }

        // If classId is provided, filter by it
        if (classId) {
          return studentClaims.classId === classId;
        }

        // If no classId, return all students
        return true;
      }
    );

    console.log('Filtered students:', students.length);

    // Get student analytics from Firestore
    const analyticsPromises = students.map(async (student) => {
      const entriesSnapshot = await admin.firestore()
        .collection("diaryEntriesBackup")
        .doc(student.uid)
        .collection("entries")
        .orderBy('timestamp', 'desc')
        .get();

      const entries = entriesSnapshot.docs.length;
      const lastEntry = entries > 0 
        ? entriesSnapshot.docs[0].data()?.timestamp?.toDate().toISOString()
        : null;

      return {
        studentId: student.uid,
        totalEntries: entries,
        lastEntry
      };
    });

    const analyticsResults = await Promise.all(analyticsPromises);

    // Map students to response format
    const mappedStudents = students.map((student) => {
      const studentClaims = student.customClaims;
      const analytics = analyticsResults.find(a => a.studentId === student.uid);
      
      return {
        uid: student.uid,
        displayName: student.displayName || '',
        email: student.email || '',
        status: student.disabled ? "disabled" : student.emailVerified ? "active" : "pending",
        journalEntries: analytics?.totalEntries || 0,
        lastActivity: analytics?.lastEntry || null,
        customClaims: studentClaims
      };
    });

    console.log('📊 Returning students:', mappedStudents.length);

    res.status(200).json(mappedStudents);
  } catch (error) {
    console.error("Error getting students:", error);
    res.status(500).json({ 
      message: "Failed to get students",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

// Alternative: Use Firebase built-in email (simpler and more reliable)
const sendWelcomeEmailViaFirebase = async (email: string, name: string, districtName: string) => {
  try {
    // Generate password reset link (automatically sends email)
    const passwordResetLink = await admin.auth().generatePasswordResetLink(email, {
      url: `${process.env.FRONTEND_URL}/login?message=password-set`, // Redirect after password reset
      handleCodeInApp: false,
    });

    console.log(`✅ Firebase password reset email sent to ${email}`);
    return { success: true, link: passwordResetLink };
  } catch (error) {
    console.error("❌ Firebase email failed:", error);
    return { success: false, error };
  }
};

// Enhanced: Use Firebase Extensions for custom welcome emails
const sendCustomWelcomeEmail = async (email: string, name: string, districtName: string, passwordResetLink: string) => {
  try {
    // Add document to trigger email extension
    await admin.firestore().collection('mail').add({
      to: [email],
      template: {
        name: 'welcome-district-admin',
        data: {
          name,
          email,
          districtName,
          passwordResetLink,
          loginUrl: `${process.env.FRONTEND_URL}/login`,
        },
      },
    });

    console.log(`✅ Custom welcome email queued for ${email}`);
    return { success: true };
  } catch (error) {
    console.error("❌ Custom email failed:", error);
    return { success: false, error };
  }
};

// =============================================================================
// RESOURCE MANAGEMENT FUNCTIONS
// =============================================================================

// Create Resource
export const createResource = async (req: Request, res: Response) => {
  try {
    const { title, description, url, type, category } = req.body;
    const userId = req.user?.uid;

    console.log('📚 Super Admin creating resource:', { title, url, type, category });

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // Create resource document
    const resourceData = {
      title,
      description: description || '',
      url,
      type: type || 'link',
      category,
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'active'
    };

    const resourceRef = await admin.firestore().collection('resources').add(resourceData);
    
    console.log('✅ Resource created successfully:', resourceRef.id);

    res.status(201).json({
      message: "Resource created successfully",
      resourceId: resourceRef.id,
      resource: { id: resourceRef.id, ...resourceData }
    });
  } catch (error) {
    console.error("Error creating resource:", error);
    res.status(500).json({
      error: "Failed to create resource",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

// Get Resources
export const getResources = async (req: Request, res: Response) => {
  try {
    const { status = 'active', limit = 50, offset = 0 } = req.query;

    console.log('📚 Super Admin getting resources:', { status, limit, offset });

    let query = admin.firestore().collection('resources').orderBy('createdAt', 'desc');

    // Filter by status if provided
    if (status && status !== 'all') {
      query = query.where('status', '==', status);
    }

    // Apply pagination
    if (offset && Number(offset) > 0) {
      query = query.offset(Number(offset));
    }
    
    if (limit) {
      query = query.limit(Number(limit));
    }

    const resourcesSnapshot = await query.get();

    const resources = resourcesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
      updatedAt: doc.data().updatedAt?.toDate?.() || doc.data().updatedAt,
    }));

    console.log('�� Found resources:', resources.length);

    res.status(200).json({
      resources,
      count: resources.length,
      pagination: {
        limit: Number(limit),
        offset: Number(offset)
      }
    });
  } catch (error) {
    console.error("Error getting resources:", error);
    res.status(500).json({
      error: "Failed to get resources",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

// Update Resource
export const updateResource = async (req: Request, res: Response) => {
  try {
    const { resourceId } = req.params;
    const updateData = req.body;

    console.log('📚 Super Admin updating resource:', resourceId, updateData);

    // Check if resource exists
    const resourceDoc = await admin.firestore().collection('resources').doc(resourceId).get();
    if (!resourceDoc.exists) {
      return res.status(404).json({ error: "Resource not found" });
    }

    // Update resource
    const updatedData = {
      ...updateData,
      updatedAt: new Date()
    };

    await admin.firestore().collection('resources').doc(resourceId).update(updatedData);

    console.log('✅ Resource updated successfully');

    res.status(200).json({
      message: "Resource updated successfully",
      resourceId
    });
  } catch (error) {
    console.error("Error updating resource:", error);
    res.status(500).json({
      error: "Failed to update resource",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

// Delete Resource
export const deleteResource = async (req: Request, res: Response) => {
  try {
    const { resourceId } = req.params;

    console.log('📚 Super Admin deleting resource:', resourceId);

    // Check if resource exists
    const resourceDoc = await admin.firestore().collection('resources').doc(resourceId).get();
    if (!resourceDoc.exists) {
      return res.status(404).json({ error: "Resource not found" });
    }

    // Soft delete - mark as archived
    await admin.firestore().collection('resources').doc(resourceId).update({
      status: 'archived',
      updatedAt: new Date()
    });

    // Also archive any assignments of this resource
    const assignmentsSnapshot = await admin.firestore()
      .collection('resource_assignments')
      .where('resourceId', '==', resourceId)
      .where('status', '==', 'active')
      .get();

    const batch = admin.firestore().batch();
    assignmentsSnapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        status: 'archived',
        updatedAt: new Date()
      });
    });
    await batch.commit();

    console.log('✅ Resource and assignments archived successfully');

    res.status(200).json({
      message: "Resource deleted successfully",
      resourceId
    });
  } catch (error) {
    console.error("Error deleting resource:", error);
    res.status(500).json({
      error: "Failed to delete resource",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

// Assign Resource
export const assignResource = async (req: Request, res: Response) => {
  try {
    const { resourceId, assignedTo, assignedToRole, targetType, targetId, targetName } = req.body;
    const userId = req.user?.uid;

    console.log('📚 Super Admin assigning resource:', {
      resourceId,
      assignedTo,
      assignedToRole,
      targetType,
      targetId
    });

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // Check if resource exists
    const resourceDoc = await admin.firestore().collection('resources').doc(resourceId).get();
    if (!resourceDoc.exists) {
      return res.status(404).json({ error: "Resource not found" });
    }

    const resourceData = resourceDoc.data() as any;

    // Create assignment document
    const assignmentData = {
      resourceId,
      resourceTitle: resourceData.title,
      resourceUrl: resourceData.url,
      assignedBy: userId,
      assignedByRole: 'super-admin',
      assignedTo,
      assignedToRole,
      targetType,
      targetId,
      targetName: targetName || '',
      assignedAt: new Date(),
      status: 'active'
    };

    const assignmentRef = await admin.firestore().collection('resource_assignments').add(assignmentData);

    console.log('✅ Resource assigned successfully:', assignmentRef.id);

    res.status(201).json({
      message: "Resource assigned successfully",
      assignmentId: assignmentRef.id,
      assignment: { id: assignmentRef.id, ...assignmentData }
    });
  } catch (error) {
    console.error("Error assigning resource:", error);
    res.status(500).json({
      error: "Failed to assign resource",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

// Get Resource Assignments
export const getResourceAssignments = async (req: Request, res: Response) => {
  try {
    const { resourceId, assignedTo, targetType, targetId, status = 'active' } = req.query;

    console.log('📚 Super Admin getting resource assignments:', {
      resourceId,
      assignedTo,
      targetType,
      targetId,
      status
    });

    let query = admin.firestore().collection('resource_assignments').orderBy('assignedAt', 'desc');

    // Apply filters
    if (resourceId) {
      query = query.where('resourceId', '==', resourceId);
    }
    if (assignedTo) {
      query = query.where('assignedTo', '==', assignedTo);
    }
    if (targetType) {
      query = query.where('targetType', '==', targetType);
    }
    if (targetId) {
      query = query.where('targetId', '==', targetId);
    }
    if (status && status !== 'all') {
      query = query.where('status', '==', status);
    }

    const assignmentsSnapshot = await query.get();

    const assignments = assignmentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      assignedAt: doc.data().assignedAt?.toDate?.() || doc.data().assignedAt,
      viewedAt: doc.data().viewedAt?.toDate?.() || doc.data().viewedAt,
    }));

    console.log('📊 Found assignments:', assignments.length);

    res.status(200).json({
      assignments,
      count: assignments.length
    });
  } catch (error) {
    console.error("Error getting resource assignments:", error);
    res.status(500).json({
      error: "Failed to get resource assignments",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

// Get classes for a school
export const getClasses = async (req: Request, res: Response) => {
  try {
    const schoolId = req.query.schoolId as string;
    console.log("🔍 getClasses called with schoolId:", schoolId);
    
    if (!schoolId) {
      return res.status(400).json({ message: "School ID is required" });
    }

    // Get classes from Firestore with simple ordering
    console.log("📚 Querying classes for schoolId:", schoolId);
    const querySnapshot = await admin
      .firestore()
      .collection("classes")
      .where("schoolId", "==", schoolId)
      .orderBy("gradeName", "asc")
      .get();
    
    console.log("📊 Query returned", querySnapshot.docs.length, "classes");

    const classes = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        gradeName: data.gradeName || '',
        division: data.division || '',
        teacherId: data.teacherId || '',
        teacherName: data.teacherName || '',
        studentCount: data.studentCount || 0,
        maxStudents: data.maxStudents || 25,
        status: data.status || 'active',
        createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate().toISOString() || new Date().toISOString()
      };
    });

    res.status(200).json({ classes });
  } catch (error) {
    console.error("Error getting classes:", error);
    res.status(500).json({ 
      message: "Failed to get classes",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

// Get district analytics
export const getDistrictAnalytics = async (req: Request, res: Response) => {
  try {
    const { districtId } = req.params;
    console.log('🏛️ Super Admin getting district analytics:', districtId);

    if (!districtId) {
      return res.status(400).json({
        error: "Invalid request",
        details: "District ID is required"
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

    const latestAnalytics = analyticsSnapshot.docs[0].data() as AnalyzedData;

    // Filter data for the specific district
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

    // Return the full analytics data so the frontend can filter schools and classes
    return res.status(200).json({
      data: latestAnalytics
    });
  } catch (error: unknown) {
    console.error('Error getting district analytics:', error);
    return res.status(500).json({
      error: "Failed to get district analytics data",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

// Get district historical analytics
export const getDistrictHistoricalAnalytics = async (req: Request, res: Response) => {
  try {
    const { districtId } = req.params;
    console.log('🏛️ Super Admin getting district historical analytics:', districtId);

    if (!districtId) {
      return res.status(400).json({
        error: "Invalid request",
        details: "District ID is required"
      });
    }

    const db = admin.firestore();
    
    // Get last 30 days of analyzed data reports
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const historicalSnapshot = await db.collection('analyzedData')
      .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
      .orderBy('timestamp', 'asc')
      .get();

    if (historicalSnapshot.empty) {
      return res.status(200).json({
        data: [],
        message: "No historical data found for the last 30 days"
      });
    }

    const historicalData = historicalSnapshot.docs.map(doc => {
      const data = doc.data() as AnalyzedData;
      const districtData = data.districtStats?.[districtId];
      return {
        id: data.id,
        timestamp: data.timestamp.toDate().toISOString(),
        date: data.timestamp.toDate().toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
        fullDate: data.timestamp.toDate().toISOString().split('T')[0],
        totalWords: districtData?.totalWords || 0,
        totalEntries: districtData?.totalEntries || 0,
        activeSchools: districtData?.schools?.length || 0,
        activeStudents: districtData?.activeStudents || 0
      };
    });

    return res.status(200).json({
      data: historicalData
    });
  } catch (error: unknown) {
    console.error('Error getting district historical analytics:', error);
    return res.status(500).json({
      error: "Failed to get district historical analytics data",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

// Get school analytics
export const getSchoolAnalytics = async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.params;
    console.log('🏫 Super Admin getting school analytics:', schoolId);

    if (!schoolId) {
      return res.status(400).json({
        error: "Invalid request",
        details: "School ID is required"
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

    const latestAnalytics = analyticsSnapshot.docs[0].data() as AnalyzedData;

    // Filter data for the specific school
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
    const districtStats = (latestAnalytics.districtStats && schoolData.districtId && latestAnalytics.districtStats[schoolData.districtId])
      ? { [schoolData.districtId]: latestAnalytics.districtStats[schoolData.districtId] }
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
  } catch (error: unknown) {
    console.error('Error getting school analytics:', error);
    return res.status(500).json({
      error: "Failed to get school analytics data",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

// Get school historical analytics
export const getSchoolHistoricalAnalytics = async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.params;
    console.log('🏫 Super Admin getting school historical analytics:', schoolId);

    if (!schoolId) {
      return res.status(400).json({
        error: "Invalid request",
        details: "School ID is required"
      });
    }

    const db = admin.firestore();
    
    // Get last 30 days of analyzed data reports
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const historicalSnapshot = await db.collection('analyzedData')
      .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
      .orderBy('timestamp', 'asc')
      .get();

    if (historicalSnapshot.empty) {
      return res.status(200).json({
        data: [],
        message: "No historical data found for the last 30 days"
      });
    }

    const historicalData = historicalSnapshot.docs.map(doc => {
      const data = doc.data() as AnalyzedData;
      const schoolData = data.schoolStats?.[schoolId];
      return {
        id: data.id,
        timestamp: data.timestamp.toDate().toISOString(),
        date: data.timestamp.toDate().toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
        fullDate: data.timestamp.toDate().toISOString().split('T')[0],
        totalWords: schoolData?.totalWords || 0,
        totalEntries: schoolData?.totalEntries || 0,
        activeClasses: schoolData?.classes?.length || 0,
        activeStudents: schoolData?.activeStudents || 0
      };
    });

    return res.status(200).json({
      data: historicalData
    });
  } catch (error: unknown) {
    console.error('Error getting school historical analytics:', error);
    return res.status(500).json({
      error: "Failed to get school historical analytics data",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

// Get class analytics
export const getClassAnalytics = async (req: Request, res: Response) => {
  try {
    const { classId } = req.params;
    console.log('👨‍🏫 Super Admin getting class analytics:', classId);

    if (!classId) {
      return res.status(400).json({
        error: "Invalid request",
        details: "Class ID is required"
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

    const latestAnalytics = analyticsSnapshot.docs[0].data() as AnalyzedData;

    // Filter data for the specific class
    const classData = latestAnalytics.classStats?.[classId];
    console.log('👨‍🏫 Found classData:', classData);

    if (!classData) {
      return res.status(200).json({
        data: {
          id: latestAnalytics.id,
          timestamp: latestAnalytics.timestamp,
          totalWords: 0,
          totalEntries: 0,
          classStats: {},
          studentStats: {},
          schoolStats: {},
          districtStats: {}
        }
      });
    }

    // Get students in this class
    const studentStats = Object.entries(latestAnalytics.studentStats || {})
      .filter(([_, studentData]: [string, any]) => studentData.classId === classId)
      .reduce((acc, [studentId, studentData]) => {
        acc[studentId] = studentData;
        return acc;
      }, {} as any);

    // Get school stats for context
    const schoolStats = (latestAnalytics.schoolStats && classData.schoolId && latestAnalytics.schoolStats[classData.schoolId])
      ? { [classData.schoolId]: latestAnalytics.schoolStats[classData.schoolId] }
      : {};

    // Get district stats for context
    const districtStats = (latestAnalytics.districtStats && classData.districtId && latestAnalytics.districtStats[classData.districtId])
      ? { [classData.districtId]: latestAnalytics.districtStats[classData.districtId] }
      : {};

    console.log('👨‍🏫 Filtered analytics:', {
      classStatsKeys: Object.keys({ [classId]: classData }),
      studentStatsKeys: Object.keys(studentStats)
    });

    const filteredAnalytics = {
      id: latestAnalytics.id,
      timestamp: latestAnalytics.timestamp,
      totalWords: classData.totalWords || 0,
      totalEntries: classData.totalEntries || 0,
      classStats: {
        [classId]: classData
      },
      studentStats,
      schoolStats,
      districtStats
    };

    return res.status(200).json({
      data: filteredAnalytics
    });
  } catch (error: unknown) {
    console.error('Error getting class analytics:', error);
    return res.status(500).json({
      error: "Failed to get class analytics data",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

// Get class historical analytics
export const getClassHistoricalAnalytics = async (req: Request, res: Response) => {
  try {
    const { classId } = req.params;
    console.log('👨‍🏫 Super Admin getting class historical analytics:', classId);

    if (!classId) {
      return res.status(400).json({
        error: "Invalid request",
        details: "Class ID is required"
      });
    }

    const db = admin.firestore();
    
    // Get last 30 days of analyzed data reports
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const historicalSnapshot = await db.collection('analyzedData')
      .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
      .orderBy('timestamp', 'asc')
      .get();

    if (historicalSnapshot.empty) {
      return res.status(200).json({
        data: [],
        message: "No historical data found for the last 30 days"
      });
    }

    const historicalData = historicalSnapshot.docs.map(doc => {
      const data = doc.data() as AnalyzedData;
      const classData = data.classStats?.[classId];
      return {
        id: data.id,
        timestamp: data.timestamp.toDate().toISOString(),
        date: data.timestamp.toDate().toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
        fullDate: data.timestamp.toDate().toISOString().split('T')[0],
        totalWords: classData?.totalWords || 0,
        totalEntries: classData?.totalEntries || 0,
        activeStudents: classData?.activeStudents || 0,
        avgWordsPerStudent: classData?.avgWordsPerStudent || 0
      };
    });

    return res.status(200).json({
      data: historicalData
    });
  } catch (error: unknown) {
    console.error('Error getting class historical analytics:', error);
    return res.status(500).json({
      error: "Failed to get class historical analytics data",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
};
