// @ts-nocheck
import { Request, Response } from "express";
import {
  TCreateStudent,
  TStudentIdParam,
  TUpdateStudent,
} from "../validators/teacher.validator";
import admin from "../config/firebase.config";
import { DEFAULT_PASSWORDS, ROLES } from "../config/app.config";
import { UserRecord } from "firebase-admin/auth";
import { transporter } from "../config/nodemailer.config";
import { Timestamp } from "firebase-admin/firestore";
import { createHierarchicalClaims } from "../utils/roleHierarchy";

interface TeacherClassData {
  id: string;
  name: string;
  students: UserRecord[];
}

interface DiaryEntry {
  content: string;
  wordCount: number;
  timestamp: Timestamp;
  sentiment: string;
}

interface StudentAnalytics {
  totalEntries: number;
  avgWordCount: number;
  lastEntry: string | null;
  weeklyEntries: number;
  monthlyEntries: number;
  weeklyWordCount: number;
  monthlyWordCount: number;
  weeklyGrowth: number;
  monthlyGrowth: number;
  studentId: string;
  sentiment: string;
}

interface TeacherCustomClaims {
  role: string;
  schoolId: string;
  schoolName: string;
  districtId: string;
  districtName: string;
  gradeId: string;
  gradeName?: string;
  division: string;
  teacherId?: string;
  teacherName?: string;
  teacherIncharge?: string;  // Added back for backward compatibility
}

// Update the Student interface to remove status and make lastActivity required
interface Student {
  uid: string;
  displayName: string | null;
  email: string | null;
  journalEntries: number;
  lastActivity: string | null;
  customClaims: TeacherCustomClaims;
}

interface ClassData {
  id: string;
  name: string;
  schoolId: string;
  teacherId: string;
  createdAt: any; // FirebaseFirestore.FieldValue
  updatedAt: any; // FirebaseFirestore.FieldValue
}

// createStudent
export const createStudent = async (req: Request, res: Response) => {
  try {
    console.log('Creating student - Request body:', req.body);
    const { uid: teacherId } = req.user!;
    console.log('Teacher ID:', teacherId);

    // Get teacher's data
    const teacherData = await admin.auth().getUser(teacherId);
    console.log('Teacher data:', {
      uid: teacherData.uid,
      email: teacherData.email,
      displayName: teacherData.displayName,
      customClaims: teacherData.customClaims
    });

    if (!teacherData.customClaims) {
      console.error('No custom claims found for teacher:', teacherId);
      return res.status(400).json({
        error: "Invalid teacher data",
        details: "Teacher has no custom claims"
      });
    }

    const teacherClaims = teacherData.customClaims as TeacherCustomClaims;
    console.log('Teacher claims:', teacherClaims);

    const { 
      role,
      schoolId,
      schoolName,
      districtId,
      districtName
    } = teacherClaims;
    
    // Validate teacher role
    if (role !== ROLES.TEACHER) {
      console.error('Invalid teacher role:', {
        expectedRole: ROLES.TEACHER,
        actualRole: role
      });
      return res.status(400).json({
        error: "Invalid teacher data",
        details: "User is not a teacher"
      });
    }

    // Handle different teacher claim formats
    let gradeId: string;
    let gradeName: string;
    let division: string;
    let classId: string;

    // Check if teacher has direct classId (newer format)
    if ((teacherClaims as any).classId && (teacherClaims as any).className) {
      classId = (teacherClaims as any).classId as string;
      const className = (teacherClaims as any).className as string;
      
      console.log('🎯 Using newer classId format:', { classId, className });
      
      // Extract grade and division from classId and className
      // classId format: "dis1school1class1" -> extract "1" as grade
      // className format: "DIS1SCHOOL1 Class 1" -> extract "Class 1" as gradeName
      const gradeMatch = classId.match(/class(\d+)$/);
      if (gradeMatch && gradeMatch[1]) {
        gradeId = gradeMatch[1];
        gradeName = `Grade ${gradeId}`;
        division = 'A'; // Default division for newer format
      } else {
        // Fallback: try to extract from className
        const classNameMatch = className.match(/Class (\d+)/);
        if (classNameMatch && classNameMatch[1]) {
          gradeId = classNameMatch[1];
          gradeName = `Grade ${gradeId}`;
          division = 'A';
        } else {
          return res.status(400).json({
            error: "Invalid teacher data",
            details: "Cannot extract grade information from class data"
          });
        }
      }
    } else if (teacherClaims.gradeId && teacherClaims.gradeName && teacherClaims.division) {
      // Legacy format
      // Prefer numeric grade if gradeId is a doc ID
      gradeId = /^(\d+)$/.test(String(teacherClaims.gradeId))
        ? String(teacherClaims.gradeId)
        : (teacherClaims.gradeName.match(/\d+/)?.[0] || String(teacherClaims.gradeId));
      gradeName = teacherClaims.gradeName;
      division = teacherClaims.division;
      classId = `${gradeId}_${division}`;
      
      console.log('🎯 Using legacy format:', { gradeId, gradeName, division });
      
      // Extract gradeId from gradeName if needed
      if (gradeName) {
        // If gradeId looks like a document ID, extract number from gradeName
        if (gradeId && gradeId.length > 10) {
          const gradeNumber = gradeName.match(/\d+/)?.[0];
          if (gradeNumber) {
            gradeId = gradeNumber;
          }
        }
        // If no gradeId, extract from gradeName
        if (!gradeId) {
          const gradeNumber = gradeName.match(/\d+/)?.[0];
          if (gradeNumber) {
            gradeId = gradeNumber;
          }
        }
      }
    } else {
      return res.status(400).json({
        error: "Invalid teacher data",
        details: "Teacher must have either 'classId' or 'gradeId/gradeName/division' information"
      });
    }

    // Validate required fields
    const missingFields = [];
    if (!schoolId) missingFields.push('schoolId');
    if (!schoolName) missingFields.push('schoolName');
    if (!districtId) missingFields.push('districtId');
    if (!districtName) missingFields.push('districtName');
    if (!gradeName) missingFields.push('gradeName');
    if (!gradeId) missingFields.push('gradeId');
    if (!division) missingFields.push('division');

    if (missingFields.length > 0) {
      console.error('Missing required teacher fields:', {
        missingFields,
        availableFields: {
          schoolId,
          schoolName,
          districtId,
          districtName,
          gradeId,
          gradeName,
          division,
          classId,
          className: `${gradeName} ${division}`
        }
      });
      return res.status(400).json({
        error: "Invalid teacher data",
        details: `Missing required teacher information: ${missingFields.join(', ')}`
      });
    }

    // Validate email format
    if (!req.body.email || !req.body.email.includes('@') || !req.body.email.includes('.')) {
      return res.status(400).json({
        error: "Invalid email",
        details: "Please provide a valid email address"
      });
    }

    // Validate name
    if (!req.body.name || req.body.name.length < 2 || req.body.name.includes('@')) {
      return res.status(400).json({
        error: "Invalid name",
        details: "Name must be at least 2 characters and not contain @ symbol"
      });
    }

    // Check if student email already exists
    try {
      const existingUser = await admin.auth().getUserByEmail(req.body.email);
      if (existingUser) {
        return res.status(400).json({
          error: "Email already in use",
          details: "A user with this email already exists"
        });
      }
    } catch (error: any) {
      // Error code auth/user-not-found means email is available
      if (error.code !== 'auth/user-not-found') {
        throw error;
      }
    }

    // Create the student user
    const user = await admin.auth().createUser({
      displayName: req.body.name,
      email: req.body.email,
      password: DEFAULT_PASSWORDS.STUDENT,
      emailVerified: false,
    });

    // Create hierarchical claims
    const claims = {
      role: ROLES.STUDENT,
      parentId: teacherId,
      districtId: districtId!,
      districtName: districtName!,
      schoolId: schoolId!,
      schoolName: schoolName!,
      gradeId: gradeId!,
      gradeName: gradeName!,
      division: division!,
      className: `${gradeName!} ${division!}`,
      teacherId,
      teacherName: teacherData.displayName || '',
      teacherIncharge: teacherId  // This is the key field we need
    };

    console.log('Creating student with claims:', claims);

    // Set custom claims
    await admin.auth().setCustomUserClaims(user.uid, claims);

    // Create a document in the users collection to store the hierarchy
    const userData = {
      name: req.body.name,
      email: req.body.email,
      role: ROLES.STUDENT,
      parentId: teacherId,
      districtId,
      districtName,
      schoolId,
      schoolName,
      gradeId,
      className: `${gradeId} ${division}`,
      teacherId,
      teacherName: teacherData.displayName || null,
      teacherIncharge: teacherId,  // Make sure it's set here too
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: "active"
    };

    console.log('Creating user document:', userData);

    await admin.firestore().collection("users").doc(user.uid).set(userData);

    // Always generate password reset and email verification links
    if (req.body.email) {
      const [passwordResetLink, verifyEmailLink] = await Promise.all([
        admin.auth().generatePasswordResetLink(req.body.email),
        admin.auth().generateEmailVerificationLink(req.body.email)
      ]);

      // Send welcome email (prefer Titan env)
      const fromAddressForStudent =
        process.env.TITAN_EMAIL ||
        (process.env as any).titanemail ||
        process.env.EMAIL ||
        "noreply@journalhood.com";

      if (transporter && fromAddressForStudent) {
        try {
          await transporter.sendMail({
            from: fromAddressForStudent,
            to: req.body.email,
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
                    <p>Hi ${req.body.name},</p>
                    <p>Your Student account has been created. Please set your password to activate your account and start using JournalHood.</p>
                  </div>
                  <a href="${passwordResetLink}" class="button">Set Your Password</a>
                  <div style="margin: 24px 0;">
                    <p>Once your password is set, you can log in and start journaling and exploring your dashboard.</p>
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
        console.warn("Email transporter not configured or from address missing; skipping welcome email");
      }
    }

    return res.status(200).json({
      message: "Student created successfully",
      uid: user.uid,
    });
  } catch (error: any) {
    console.error("Error creating student:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error.message || "An unexpected error occurred while creating the student"
    });
  }
};

// updateStudent
export const updateStudent = async (req: Request, res: Response) => {
  try {
    const { uid }: TStudentIdParam = req.params as TStudentIdParam;
    const { name, email }: TUpdateStudent = req.body;

    const user: UserRecord = await admin.auth().getUser(uid);

    if (user.email !== email) {
      await admin.auth().updateUser(uid, {
        displayName: name,
        email,
        password: DEFAULT_PASSWORDS.STUDENT,
      });
    } else {
      await admin.auth().updateUser(uid, {
        displayName: name,
      });
    }

    const passwordResetLink = await admin
      .auth()
      .generatePasswordResetLink(email);
    const verifyEmailLink = await admin
      .auth()
      .generateEmailVerificationLink(email);

    await transporter.sendMail({
      from: process.env.TITAN_EMAIL || (process.env as any).titanemail || process.env.EMAIL,
      to: email,
      subject: "Welcome to Journal Hood",
      html: `
        <h1>Welcome to Journal Hood</h1>
        <p>You have been added as a Student in Journal Hood</p>
        <p>Please click the link below to reset your password</p>
        <a href="${passwordResetLink}">Reset Password</a>
        <p>Please click the link below to verify your email</p>
        <a href="${verifyEmailLink}">Verify Email</a>
        `,
    });

    return res.status(200).json({
      message: "Student updated successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
};

// deleteStudent
export const deleteStudent = async (req: Request, res: Response) => {
  try {
    const { uid }: TStudentIdParam = req.params as TStudentIdParam;

    await admin.auth().deleteUser(uid);

    res.status(200).json({
      message: "Student deleted successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
};

// getStudents
export const getStudents = async (req: Request, res: Response) => {
  try {
    const { uid } = req.user!;

    // Get user's custom claims
    const teacherData = await admin.auth().getUser(uid);
    if (!teacherData.customClaims) {
      return res.status(400).json({
        error: "Teacher data not found",
        details: "No custom claims found for teacher"
      });
    }

    const userClaims = teacherData.customClaims as TeacherCustomClaims;
    const userRole = userClaims.role;  // Get role from claims instead of req.userRole

    // Get all users from Firebase Auth
    const studentsSnapshot = await admin.auth().listUsers();
    let students: admin.auth.UserRecord[] = [];

    if (userRole === ROLES.TEACHER) {
      // For teachers: Get students in their specific class
      if (!userClaims.schoolId) {
        console.error('Missing schoolId in teacher claims:', userClaims);
        return res.status(400).json({
          error: "Invalid teacher data",
          details: "Missing required teacher information (schoolId)"
        });
      }

      students = studentsSnapshot.users.filter((user) => {
        const studentClaims = user.customClaims as any;
        if (!studentClaims) return false;

        // Check if the student belongs to this teacher
        const isMatch = 
          studentClaims.schoolId === userClaims.schoolId &&  // Same school
          studentClaims.role === ROLES.STUDENT &&  // Is a student
          (studentClaims.teacherIncharge === uid ||  // Teacher is assigned directly
           (studentClaims.teacherId === uid && !studentClaims.teacherIncharge));  // Fallback to teacherId if teacherIncharge not set

        return isMatch;
      });
    } else if (userRole === ROLES.SUPER_ADMIN || userRole === ROLES.DISTRICT_ADMIN || userRole === ROLES.SCHOOL_ADMIN) {
      // Allow admins to fetch by teacherId query for debugging/support
      const teacherId = (req.query.teacherId as string) || '';
      if (!teacherId) {
        return res.status(400).json({ error: 'teacherId is required for admin access' });
      }
      students = studentsSnapshot.users.filter((user) => {
        const studentClaims = user.customClaims as any;
        if (!studentClaims) return false;
        return studentClaims.role === ROLES.STUDENT && (studentClaims.teacherIncharge === teacherId || (studentClaims.teacherId === teacherId && !studentClaims.teacherIncharge));
      });
    }

    // Get real journal entries count and last activity from diaryEntries collection
    const entriesPromises = students.map(async (student) => {
      const entriesSnapshot = await admin.firestore()
        .collection("diaryEntries")
        .doc(student.uid)
        .collection("entries")
        .orderBy('timestamp', 'desc')
        .get();

      // Get the timestamp of the most recent entry
      const lastEntry = entriesSnapshot.docs[0]?.data()?.timestamp;
      const lastActivity = lastEntry ? lastEntry.toDate().toISOString() : null;

      return {
        studentId: student.uid,
        totalEntries: entriesSnapshot.size,
        lastActivity
      };
    });

    const entriesResults = await Promise.all(entriesPromises);

    // Map students to response format
    const mappedStudents: Student[] = students.map((student: UserRecord) => {
      if (!student.customClaims) {
        console.error('Student has no custom claims:', student.uid);
        throw new Error(`Student ${student.uid} has no custom claims`);
      }
      const studentClaims = student.customClaims as TeacherCustomClaims;
      const displayName = typeof student.displayName === 'string' ? student.displayName : null;
      const email = typeof student.email === 'string' ? student.email : null;
      
      // Get real entries count and last activity
      const entriesData = entriesResults.find(e => e.studentId === student.uid);
      const totalEntries = entriesData ? entriesData.totalEntries : 0;
      const lastActivity = entriesData ? entriesData.lastActivity : null;

      const result: Student = {
        uid: student.uid,
        displayName,
        email,
        journalEntries: totalEntries,
        lastActivity,
        customClaims: studentClaims
      };
      return result;
    });

    return res.status(200).json({ students: mappedStudents });
  } catch (error) {
    console.error("Error getting students:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "An unexpected error occurred"
    });
  }
};

// suspendOrUnsuspendStudent
export const suspendOrUnsuspendStudent = async (
  req: Request,
  res: Response
) => {
  try {
    const { uid }: TStudentIdParam = req.params as TStudentIdParam;

    const user = await admin.auth().getUser(uid);

    await admin.auth().updateUser(uid, {
      disabled: !user.disabled,
    });

    return res.status(200).json({
      message: `Student ${
        !user.disabled ? "Suspended" : "Unsuspended"
      } successfully`,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
};

// resetDiaryEntriesPin
export const resetDiaryEntriesPin = async (req: Request, res: Response) => {
  try {
    const { uid }: TStudentIdParam = req.params as TStudentIdParam;

    const user = await admin.auth().getUser(uid);

    await admin.firestore().collection("users").doc(uid).delete();

    if (transporter && user.email) {
      await transporter.sendMail({
        from: process.env.TITAN_EMAIL || (process.env as any).titanemail || process.env.EMAIL || 'noreply@example.com',
        to: user.email,
        subject: "Diary Entries Pin Reset",
        html: `
          <h1>Diary Entries Pin Reset</h1>
          <p>Your Diary Entries Pin has been reset</p>
          <p>Please set new pin</p>
        `,
      });
    }

    return res.status(200).json({
      message: "Diary Entries Pin Reset Successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// getDashboard
export const getDashboard = async (req: Request, res: Response) => {
  try {
    const { uid } = req.user!;

    // Get teacher's custom claims
    const teacherData = await admin.auth().getUser(uid);
    if (!teacherData.customClaims) {
      return res.status(400).json({
        error: "Teacher data not found",
        details: "No custom claims found for teacher"
      });
    }

    const teacherClaims = teacherData.customClaims as TeacherCustomClaims;
    if (!teacherClaims.schoolId) {
      return res.status(400).json({
        error: "Invalid teacher data",
        details: "Missing required teacher information (schoolId)"
      });
    }

    // If no gradeName or division, teacher has no class assigned
    if (!teacherClaims.gradeName) {
      return res.status(200).json({
        class: null,
        students: [],
        analytics: {
          totalStudents: 0,
          activeStudents: 0,
          avgWordCount: 0,
          totalEntries: 0,
          classEngagement: 0,
          weeklyGrowth: 0,
          monthlyGrowth: 0,
          weeklyEntries: 0,
          monthlyEntries: 0,
          weeklyAvgWords: 0,
          monthlyAvgWords: 0,
          sentimentDistribution: {
            veryPositive: 0,
            positive: 0,
            neutral: 0,
            negative: 0
          }
        }
      });
    }

    // Format class ID from gradeName and division
    const classId = teacherClaims.division ? `${teacherClaims.gradeName.replace(/\s+/g, '')}_${teacherClaims.division}` : teacherClaims.gradeName.replace(/\s+/g, '');

    // Get teacher's class data
    const classDoc = await admin.firestore()
      .collection("classes")
      .doc(classId)
      .get();

    // Initialize default class data if document doesn't exist
    const classData: ClassData = classDoc.exists && classDoc.data() ? {
      ...classDoc.data(),
      id: classId
    } as ClassData : {
      id: classId,
      name: `${teacherClaims.gradeName}${teacherClaims.division ? ` ${teacherClaims.division}` : ''}`,
      schoolId: teacherClaims.schoolId,
      teacherId: uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Get students in the class
    const studentsSnapshot = await admin.auth().listUsers();
    const students = studentsSnapshot.users.filter(
      (user) => {
        const studentClaims = user.customClaims as TeacherCustomClaims | undefined;
        if (!studentClaims) return false;
        return studentClaims.schoolId === teacherClaims.schoolId &&
          studentClaims.role === ROLES.STUDENT &&
          studentClaims.teacherIncharge === uid;
      }
    );

    // Get student analytics from Firestore
    const analyticsPromises = students.map(async (student) => {
      const entriesSnapshot = await admin.firestore()
        .collection("diaryEntries")  // Changed from diaryEntriesBackup
        .doc(student.uid)
        .collection("entries")
        .orderBy('timestamp', 'desc')
        .get();

      const entries = entriesSnapshot.docs.map(doc => {
        const data = doc.data() as { 
          content?: string;
          wordCount?: number;
          timestamp?: FirebaseFirestore.Timestamp;
          sentiment?: string;
        };

        const now = admin.firestore.Timestamp.now();
        if (!data || !data.timestamp || !(data.timestamp instanceof admin.firestore.Timestamp)) {
          return {
            content: '',
            wordCount: 0,
            timestamp: now,
            sentiment: 'Neutral'
          } as DiaryEntry;
        }

        const timestamp = data.timestamp;
        if (!(timestamp instanceof admin.firestore.Timestamp)) {
          return {
            content: '',
            wordCount: 0,
            timestamp: now,
            sentiment: 'Neutral'
          } as DiaryEntry;
        }

        return {
          content: data.content || '',
          wordCount: typeof data.wordCount === 'number' ? data.wordCount : 0,
          timestamp,
          sentiment: data.sentiment || 'Neutral'
        } as DiaryEntry;
      });

      // Filter out any entries without timestamp and ensure TypeScript knows timestamp exists
      const validEntries = entries.filter((entry): entry is DiaryEntry & { timestamp: FirebaseFirestore.Timestamp } => 
        entry.timestamp instanceof admin.firestore.Timestamp
      );

      const totalWords = validEntries.reduce((sum, entry) => sum + entry.wordCount, 0);
      const avgWordCount = validEntries.length > 0 ? Math.round(totalWords / validEntries.length) : 0;
      const lastEntry = validEntries.length > 0 ? validEntries[0].timestamp.toDate().toISOString() : null;

      // Get entries from the last week and month
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const weeklyEntries = validEntries.filter(e => e.timestamp.toDate() > weekAgo).length;
      const monthlyEntries = validEntries.filter(e => e.timestamp.toDate() > monthAgo).length;

      const weeklyWordCount = validEntries
        .filter(e => e.timestamp.toDate() > weekAgo)
        .reduce((sum, entry) => sum + entry.wordCount, 0);

      const monthlyWordCount = validEntries
        .filter(e => e.timestamp.toDate() > monthAgo)
        .reduce((sum, entry) => sum + entry.wordCount, 0);

      // Calculate growth (percentage change in entries)
      const prevWeekEntries = validEntries.filter(e => 
        e.timestamp.toDate() > new Date(weekAgo.getTime() - 7 * 24 * 60 * 60 * 1000) &&
        e.timestamp.toDate() < weekAgo
      ).length;

      const prevMonthEntries = validEntries.filter(e =>
        e.timestamp.toDate() > new Date(monthAgo.getTime() - 30 * 24 * 60 * 60 * 1000) &&
        e.timestamp.toDate() < monthAgo
      ).length;

      const weeklyGrowth = prevWeekEntries > 0 ? ((weeklyEntries - prevWeekEntries) / prevWeekEntries) * 100 : 0;
      const monthlyGrowth = prevMonthEntries > 0 ? ((monthlyEntries - prevMonthEntries) / prevMonthEntries) * 100 : 0;

      const lastSentiment = validEntries.length > 0 ? validEntries[0].sentiment : 'Neutral';

      return {
        studentId: student.uid,
        totalEntries: validEntries.length,
        avgWordCount,
        lastEntry,
        weeklyEntries,
        monthlyEntries,
        weeklyWordCount,
        monthlyWordCount,
        weeklyGrowth,
        monthlyGrowth,
        sentiment: lastSentiment
      } as StudentAnalytics;
    });

    const analyticsResults = await Promise.all(analyticsPromises);

    // Calculate class analytics
    const totalEntries = analyticsResults.reduce((sum, a) => sum + a.totalEntries, 0);
    const avgWordCount = analyticsResults.length > 0 
      ? Math.round(analyticsResults.reduce((sum, a) => sum + a.avgWordCount, 0) / analyticsResults.length)
      : 0;
    const activeStudents = students.filter(s => !s.disabled && s.emailVerified).length;
    const classEngagement = students.length > 0 
      ? Math.round((activeStudents / students.length) * 100)
      : 0;

    // Calculate weekly and monthly metrics
    const weeklyGrowth = analyticsResults.length > 0 ? analyticsResults.reduce((sum, a) => sum + a.weeklyGrowth, 0) / analyticsResults.length : 0;
    const monthlyGrowth = analyticsResults.length > 0 ? analyticsResults.reduce((sum, a) => sum + a.monthlyGrowth, 0) / analyticsResults.length : 0;
    const weeklyAvgWords = analyticsResults.length > 0 ? analyticsResults.reduce((sum, a) => sum + (a.weeklyWordCount / (a.weeklyEntries || 1)), 0) / analyticsResults.length : 0;
    const monthlyAvgWords = analyticsResults.length > 0 ? analyticsResults.reduce((sum, a) => sum + (a.monthlyWordCount / (a.monthlyEntries || 1)), 0) / analyticsResults.length : 0;
    const weeklyEntries = analyticsResults.reduce((sum, a) => sum + a.weeklyEntries, 0);
    const monthlyEntries = analyticsResults.reduce((sum, a) => sum + a.monthlyEntries, 0);

    // Calculate sentiment distribution
    const sentimentCounts = analyticsResults.reduce((counts, a) => {
      switch (a.sentiment) {
        case 'Very Positive':
          counts.veryPositive++;
          break;
        case 'Positive':
          counts.positive++;
          break;
        case 'Neutral':
          counts.neutral++;
          break;
        case 'Negative':
          counts.negative++;
          break;
      }
      return counts;
    }, {
      veryPositive: 0,
      positive: 0,
      neutral: 0,
      negative: 0
    });

    // Create class document if it doesn't exist
    if (!classDoc.exists) {
      await admin.firestore()
        .collection("classes")
        .doc(classId)
        .set(classData);
    }

    return res.status(200).json({
      class: classData,
      students: students.map((student, index) => {
        const claims = student.customClaims as TeacherCustomClaims | undefined;
        const studentAnalytics = analyticsResults[index];
        return {
          uid: student.uid || '',
          displayName: student.displayName || '',
          email: student.email || '',
        status: student.disabled ? "disabled" : student.emailVerified ? "active" : "pending",
          journalEntries: studentAnalytics?.totalEntries || 0,
          lastActivity: studentAnalytics?.lastEntry || null,
          weeklyEntries: studentAnalytics?.weeklyEntries || 0,
          monthlyEntries: studentAnalytics?.monthlyEntries || 0,
          weeklyWordCount: studentAnalytics?.weeklyWordCount || 0,
          monthlyWordCount: studentAnalytics?.monthlyWordCount || 0,
          weeklyGrowth: studentAnalytics?.weeklyGrowth || 0,
          monthlyGrowth: studentAnalytics?.monthlyGrowth || 0,
          sentiment: studentAnalytics?.sentiment || 'Neutral',
          customClaims: claims || {}
        };
      }),
      analytics: {
        totalStudents: students.length,
        activeStudents,
        avgWordCount,
        totalEntries,
        classEngagement,
        weeklyGrowth,
        monthlyGrowth,
        weeklyAvgWords,
        monthlyAvgWords,
        weeklyEntries,
        monthlyEntries,
        sentimentDistribution: sentimentCounts
      }
    });
  } catch (error) {
    console.error("Error getting dashboard data:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "An unexpected error occurred"
    });
  }
};

// getClass
export const getClass = async (req: Request, res: Response) => {
  try {
    const { uid } = req.user!;

    // Get teacher's custom claims
    const teacherData = await admin.auth().getUser(uid);
    if (!teacherData.customClaims) {
      return res.status(400).json({
        error: "Teacher data not found",
        details: "No custom claims found for teacher"
      });
    }

    const { gradeId } = teacherData.customClaims;

    // Get class data
    const classDoc = await admin.firestore()
      .collection("classes")
      .doc(gradeId)
      .get();

    if (!classDoc.exists) {
      return res.status(404).json({
        error: "Class not found",
        details: "No class found for this teacher"
      });
    }

    const classData = classDoc.data();

    return res.status(200).json(classData);
  } catch (error) {
    console.error("Error getting class data:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "An unexpected error occurred"
    });
  }
};

// getTeacherAnalytics - Get analytics data filtered for teacher's class
export const getTeacherAnalytics = async (req: Request, res: Response) => {
  try {
    const { uid } = req.user!;

    // Get teacher's custom claims
    const teacherData = await admin.auth().getUser(uid);
    if (!teacherData.customClaims) {
      return res.status(400).json({
        error: "Teacher data not found",
        details: "No custom claims found for teacher"
      });
    }

    const teacherClaims = teacherData.customClaims as TeacherCustomClaims;
    
    // DEBUG: Show teacher claims
    console.log('🔍 Teacher Analytics Debug - Teacher Claims:', {
      schoolId: teacherClaims.schoolId,
      gradeId: teacherClaims.gradeId,
      gradeName: teacherClaims.gradeName,
      division: teacherClaims.division,
      classId: (teacherClaims as any).classId,
      className: (teacherClaims as any).className,
      districtId: teacherClaims.districtId,
      uid: uid
    });

    if (!teacherClaims.schoolId || !teacherClaims.districtId) {
      return res.status(400).json({
        error: "Invalid teacher data",
        details: "Missing required teacher information (schoolId, districtId)"
      });
    }

    // Handle different teacher claim formats
    let classId: string;
    
    // Check if teacher has direct classId (newer format)
    if ((teacherClaims as any).classId) {
      classId = (teacherClaims as any).classId;
      console.log('🎯 Using direct classId from claims:', classId);
    } else if (teacherClaims.gradeId && teacherClaims.division) {
      // Legacy format can contain Firestore doc IDs for gradeId.
      // Prefer numeric grade from gradeName when gradeId is not a number.
      const numericGrade = /^(\d+)$/.test(String(teacherClaims.gradeId))
        ? String(teacherClaims.gradeId)
        : (teacherClaims.gradeName?.match(/\d+/)?.[0] || '');
      classId = numericGrade
        ? `${numericGrade}_${teacherClaims.division}`
        : `${teacherClaims.gradeId}_${teacherClaims.division}`;
      console.log('🎯 Constructed classId from grade (robust):', classId);
    } else if (teacherClaims.gradeName && teacherClaims.division) {
      // Extract grade number from gradeName (e.g., "Grade 6" -> "6")
      const gradeNumber = teacherClaims.gradeName?.match(/\d+/)?.[0] || '';
      console.log('🔢 Extracted grade number from gradeName:', gradeNumber);
      
      classId = gradeNumber && teacherClaims.division 
        ? `${gradeNumber}_${teacherClaims.division}` 
        : gradeNumber;
      console.log('🎯 Constructed classId from gradeName + division:', classId);
    } else {
      return res.status(400).json({
        error: "Invalid teacher data",
        details: "Missing class information. Teacher must have either 'classId' or 'gradeId/gradeName' + 'division'"
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

    // DEBUG: Show available class IDs in Firebase
    console.log('📊 Available classIds in Firebase:', Object.keys(latestAnalytics.classStats || {}));
    console.log('📊 Looking for classId:', classId);

    // Filter data for teacher's class
    const classData = latestAnalytics.classStats?.[classId];
    console.log('📊 Found classData:', classData);
    
    if (!classData) {
      console.log('❌ No classData found for classId:', classId);
      return res.status(200).json({
        data: {
          id: latestAnalytics.id,
          timestamp: latestAnalytics.timestamp,
          totalWords: 0,
          totalEntries: 0,
          classStats: {},
          studentStats: {},
          districtStats: {},
          schoolStats: {}
        }
      });
    }

    // Get students in teacher's class
    const allStudentStats = latestAnalytics.studentStats || {};
    console.log('👥 Total students in analytics:', Object.keys(allStudentStats).length);
    console.log('👥 Sample student classIds:', Object.values(allStudentStats).slice(0, 3).map((s: any) => s.classId));
    
    const studentStats = Object.entries(allStudentStats)
      .filter(([_, studentData]: [string, any]) => studentData.classId === classId)
      .reduce((acc, [studentId, studentData]) => {
        acc[studentId] = studentData;
        return acc;
      }, {} as any);

    console.log('👥 Filtered students for this class:', Object.keys(studentStats).length);

    // Get school stats for context
    const schoolStats = (latestAnalytics.schoolStats && teacherClaims.schoolId) 
      ? latestAnalytics.schoolStats[teacherClaims.schoolId] || {}
      : {};

    // Get district stats for context  
    const districtStats = (latestAnalytics.districtStats && teacherClaims.districtId)
      ? latestAnalytics.districtStats[teacherClaims.districtId] || {}
      : {};

    const filteredAnalytics = {
      id: latestAnalytics.id,
      timestamp: latestAnalytics.timestamp,
      totalWords: classData.totalWords || 0,
      totalEntries: classData.totalEntries || 0,
      classStats: {
        [classId]: classData
      },
      studentStats,
      schoolStats: {
        [teacherClaims.schoolId]: schoolStats
      },
      districtStats: {
        [teacherClaims.districtId]: districtStats
      }
    };

    console.log('✅ Sending analytics data:', {
      totalWords: filteredAnalytics.totalWords,
      totalEntries: filteredAnalytics.totalEntries,
      classStatsKeys: Object.keys(filteredAnalytics.classStats),
      studentStatsKeys: Object.keys(filteredAnalytics.studentStats),
      schoolStatsKeys: Object.keys(filteredAnalytics.schoolStats),
      districtStatsKeys: Object.keys(filteredAnalytics.districtStats)
    });

    return res.status(200).json({
      data: filteredAnalytics
    });

  } catch (error) {
    console.error('Error getting teacher analytics:', error);
    return res.status(500).json({
      error: "Failed to get analytics data",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

// getTeacherInfo - Get teacher's profile and class information
export const getTeacherInfo = async (req: Request, res: Response) => {
  try {
    const { uid } = req.user!;

    // Get teacher's data from Firebase Auth
    const teacherData = await admin.auth().getUser(uid);
    if (!teacherData.customClaims) {
      return res.status(400).json({
        error: "Teacher data not found",
        details: "No custom claims found for teacher"
      });
    }

    const teacherClaims = teacherData.customClaims as TeacherCustomClaims;
    
    console.log('🔍 Teacher Info Debug - Teacher Claims:', {
      schoolId: teacherClaims.schoolId,
      gradeId: teacherClaims.gradeId,
      gradeName: teacherClaims.gradeName,
      division: teacherClaims.division,
      classId: (teacherClaims as any).classId,
      className: (teacherClaims as any).className,
      districtId: teacherClaims.districtId,
      uid: uid
    });

    // Handle different teacher claim formats and ensure we have the required data
    let classId: string;
    let gradeId: string;
    let gradeName: string;
    let division: string;
    
    // Check if teacher has direct classId (newer format)
    if ((teacherClaims as any).classId) {
      classId = (teacherClaims as any).classId;
      const className = (teacherClaims as any).className || '';
      
      // Extract grade and division from classId and className
      const gradeMatch = classId.match(/class(\d+)$/);
      if (gradeMatch && gradeMatch[1]) {
        gradeId = gradeMatch[1];
        gradeName = `Grade ${gradeId}`;
        division = 'A'; // Default division for newer format
      } else {
        // Fallback: try to extract from className
        const classNameMatch = className.match(/Class (\d+)/);
        if (classNameMatch && classNameMatch[1]) {
          gradeId = classNameMatch[1];
          gradeName = `Grade ${gradeId}`;
          division = 'A';
        } else {
          // Use fallback values
          gradeId = '1';
          gradeName = 'Grade 1';
          division = 'A';
        }
      }
    } else if (teacherClaims.gradeId && teacherClaims.division) {
      // Legacy format
      gradeId = teacherClaims.gradeId;
      gradeName = teacherClaims.gradeName || `Grade ${gradeId}`;
      division = teacherClaims.division;
      classId = `${gradeId}_${division}`;
      
      // Extract gradeId from gradeName if needed
      if (gradeName) {
        const gradeNumber = gradeName.match(/\d+/)?.[0];
        if (gradeNumber) {
          gradeId = gradeNumber;
        }
      }
    } else {
      // No proper class information found, provide defaults
      console.warn('⚠️ No proper class information found for teacher, using defaults');
      gradeId = '1';
      gradeName = 'Grade 1';
      division = 'A';
      classId = `${gradeId}_${division}`;
    }

    // Get class data from Firestore if available
    let classData = null;
    try {
      const classDoc = await admin.firestore()
        .collection('classes')
        .doc(classId)
        .get();
      
      if (classDoc.exists) {
        classData = classDoc.data();
      }
    } catch (error) {
      console.warn('Could not fetch class data:', error);
    }

    // Prepare teacher info response
    const teacherInfo = {
      uid: teacherData.uid,
      email: teacherData.email,
      displayName: teacherData.displayName,
      photoURL: teacherData.photoURL,
      emailVerified: teacherData.emailVerified,
      disabled: teacherData.disabled,
      customClaims: {
        ...teacherClaims,
        gradeId,
        gradeName,
        division,
        classId
      },
      classData,
      hasRequiredClaims: true
    };

    console.log('✅ Teacher Info Response:', {
      uid: teacherInfo.uid,
      email: teacherInfo.email,
      gradeId: teacherInfo.customClaims.gradeId,
      gradeName: teacherInfo.customClaims.gradeName,
      division: teacherInfo.customClaims.division,
      classId: teacherInfo.customClaims.classId,
      hasClassData: !!classData
    });

    return res.status(200).json({
      teacher: teacherInfo
    });

  } catch (error) {
    console.error('Error getting teacher info:', error);
    return res.status(500).json({
      error: "Failed to get teacher information",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

// Resource Management
export const getAssignedResources = async (req: Request, res: Response) => {
  try {
    const { uid } = req.user!;
    const { page = 1, limit = 10, status, category, topic } = req.query;

    console.log('🔍 Getting assigned resources for teacher:', { uid });

    // Get teacher's custom claims
    const teacherData = await admin.auth().getUser(uid);
    if (!teacherData.customClaims?.role || teacherData.customClaims.role !== ROLES.TEACHER) {
      return res.status(400).json({ message: "Teacher data not found" });
    }

    // Build query for resource assignments to this teacher
    let assignmentsQuery = admin.firestore()
      .collection('resource_assignments')
      .where('assignedTo', '==', uid)
      .where('status', '==', 'active');

    // Teachers can be assigned resources directly or through their class
    const teacherClasses = await admin.firestore()
      .collection('classes')
      .where('teacherId', '==', uid)
      .get();

    const classIds = teacherClasses.docs.map(doc => doc.id);
    console.log('📚 Teacher classes:', classIds);

    // Get assignments for both teacher and their classes
    const teacherAssignments = await assignmentsQuery.get();
    
    let classAssignments: any[] = [];
    if (classIds.length > 0) {
      // Split class IDs into chunks of 10 for Firestore 'in' query limitation
      const classChunks = [];
      for (let i = 0; i < classIds.length; i += 10) {
        classChunks.push(classIds.slice(i, i + 10));
      }

      const classQueries = classChunks.map(chunk => 
        admin.firestore()
          .collection('resource_assignments')
          .where('targetId', 'in', chunk)
          .where('targetType', '==', 'class')
          .where('status', '==', 'active')
          .get()
      );

      const classResults = await Promise.all(classQueries);
      classAssignments = classResults.flatMap(snapshot => snapshot.docs);
    }

    // Combine all assignments
    const allAssignments = [...teacherAssignments.docs, ...classAssignments];
    console.log('📊 Found assignments:', allAssignments.length);

    if (allAssignments.length === 0) {
      return res.status(200).json({
        resources: [],
        count: 0,
        totalPages: 0,
        currentPage: Number(page)
      });
    }

    // Get resource IDs from assignments
    const resourceIds = [...new Set(allAssignments.map(doc => doc.data()?.resourceId).filter((id): id is string => Boolean(id)))];
    console.log('📋 Resource IDs:', resourceIds);

    // Query resources with filters
    const resourceQueries = [];
    for (let i = 0; i < resourceIds.length; i += 10) {
      const batch = resourceIds.slice(i, i + 10);
      let batchQuery = admin.firestore()
        .collection('resources')
        .where(admin.firestore.FieldPath.documentId(), 'in', batch);
      
      if (status && status !== 'all') {
        batchQuery = batchQuery.where('status', '==', status);
      }
      if (category && category !== 'all') {
        batchQuery = batchQuery.where('category', '==', category);
      }
      if (topic && topic !== 'all') {
        batchQuery = batchQuery.where('topic', '==', topic);
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
      const assignment = allAssignments.find(
        assignmentDoc => assignmentDoc.data()?.resourceId === doc.id
      );
      
      if (assignment) {
        const assignmentData = assignment.data();
        if (assignmentData) {
          resourceData.assignmentInfo = {
            assignedAt: assignmentData.assignedAt,
            assignedBy: assignmentData.assignedBy,
            assignmentId: assignment.id,
            targetType: assignmentData.targetType,
            targetId: assignmentData.targetId
          };

          // Get assigner details
          if (assignmentData.assignedBy) {
            try {
              const assignerData = await admin.auth().getUser(assignmentData.assignedBy);
              resourceData.assignmentInfo.assignerName = assignerData.displayName || 'Unknown';
              resourceData.assignmentInfo.assignerEmail = assignerData.email;
            } catch (error) {
              console.error('Error getting assigner data:', error);
              resourceData.assignmentInfo.assignerName = 'Unknown';
            }
          }
        }
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

export const getResourceDetails = async (req: Request, res: Response) => {
  try {
    const { uid } = req.user!;
    const { resourceId } = req.params;

    console.log('🔍 Getting resource details for teacher:', { uid, resourceId });

    // Verify teacher has access to this resource
    const assignmentsQuery = admin.firestore()
      .collection('resource_assignments')
      .where('resourceId', '==', resourceId)
      .where('assignedTo', '==', uid)
      .where('status', '==', 'active');

    const assignments = await assignmentsQuery.get();
    
    if (assignments.empty) {
      // Check if resource is assigned to teacher's class
      const teacherClasses = await admin.firestore()
        .collection('classes')
        .where('teacherId', '==', uid)
        .get();

      if (!teacherClasses.empty) {
        const classIds = teacherClasses.docs.map(doc => doc.id);
        
        const classAssignmentsQuery = admin.firestore()
          .collection('resource_assignments')
          .where('resourceId', '==', resourceId)
          .where('targetType', '==', 'class')
          .where('status', '==', 'active');

        const classAssignments = await classAssignmentsQuery.get();
        const hasClassAssignment = classAssignments.docs.some(
          doc => classIds.includes(doc.data().targetId)
        );

        if (!hasClassAssignment) {
          return res.status(403).json({ message: 'You do not have access to this resource' });
        }
      } else {
        return res.status(403).json({ message: 'You do not have access to this resource' });
      }
    }

    // Get resource details
    const resourceDoc = await admin.firestore()
      .collection('resources')
      .doc(resourceId)
      .get();

    if (!resourceDoc.exists) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    const resourceData = { id: resourceDoc.id, ...resourceDoc.data() };

    console.log('✅ Returning resource details:', resourceData.id);

    res.status(200).json({ resource: resourceData });

  } catch (error) {
    console.error('❌ Error getting resource details:', error);
    res.status(500).json({ message: 'Failed to get resource details' });
  }
};

export const shareResourceWithStudents = async (req: Request, res: Response) => {
  try {
    const { uid } = req.user!;
    const { resourceId, studentIds, classId, message } = req.body;

    console.log('🔄 Sharing resource with students:', { resourceId, studentIds, classId });

    if (!resourceId || (!studentIds && !classId)) {
      return res.status(400).json({ 
        message: 'Resource ID and either student IDs or class ID are required' 
      });
    }

    // Verify teacher has access to this resource
    const assignmentsQuery = admin.firestore()
      .collection('resource_assignments')
      .where('resourceId', '==', resourceId)
      .where('assignedTo', '==', uid)
      .where('status', '==', 'active');

    const assignments = await assignmentsQuery.get();
    
    if (assignments.empty) {
      return res.status(403).json({ message: 'You do not have access to this resource' });
    }

    // Get resource details
    const resourceDoc = await admin.firestore()
      .collection('resources')
      .doc(resourceId)
      .get();

    if (!resourceDoc.exists) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    const resourceData = resourceDoc.data();

    // Prepare student assignments
    const assignmentPromises = [];
    let targetStudents = [];

    if (classId) {
      // Get all students in the class
      const classStudents = await admin.firestore()
        .collection('users')
        .where('customClaims.role', '==', ROLES.STUDENT)
        .where('customClaims.classId', '==', classId)
        .get();

      targetStudents = classStudents.docs.map(doc => doc.id);
    } else {
      targetStudents = studentIds;
    }

    // Create assignments for each student
    for (const studentId of targetStudents) {
      const assignmentData = {
        resourceId,
        assignedBy: uid,
        assignedTo: studentId,
        targetType: 'student',
        targetId: studentId,
        status: 'active',
        assignedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        message: message || null
      };

      assignmentPromises.push(
        admin.firestore()
          .collection('resource_assignments')
          .add(assignmentData)
      );
    }

    // Execute all assignments
    await Promise.all(assignmentPromises);

    console.log('✅ Resource shared successfully with students:', targetStudents.length);

    res.status(201).json({
      message: `Resource shared with ${targetStudents.length} students successfully`
    });

  } catch (error) {
    console.error('❌ Error sharing resource with students:', error);
    res.status(500).json({ message: 'Failed to share resource with students' });
  }
};

export const getSharedResources = async (req: Request, res: Response) => {
  try {
    const { uid } = req.user!;
    const { page = 1, limit = 10, resourceId } = req.query;

    console.log('📊 Getting shared resources by teacher:', { uid, resourceId });

    // Build query for resources shared by this teacher
    let assignmentsQuery = admin.firestore()
      .collection('resource_assignments')
      .where('assignedBy', '==', uid)
      .where('targetType', '==', 'student')
      .where('status', '==', 'active');

    if (resourceId && resourceId !== 'all') {
      assignmentsQuery = assignmentsQuery.where('resourceId', '==', resourceId);
    }

    const assignmentsSnapshot = await assignmentsQuery.get();
    console.log('📋 Found shared assignments:', assignmentsSnapshot.size);

    // Apply pagination
    const startIndex = (Number(page) - 1) * Number(limit);
    const endIndex = startIndex + Number(limit);
    const paginatedDocs = assignmentsSnapshot.docs.slice(startIndex, endIndex);

    // Enrich assignments with resource and student details
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

      // Get student details
      if (assignmentData.assignedTo) {
        try {
          const studentData = await admin.auth().getUser(assignmentData.assignedTo);
          assignmentData.student = {
            uid: studentData.uid,
            email: studentData.email,
            displayName: studentData.displayName || 'Unknown',
            customClaims: studentData.customClaims
          };
        } catch (error) {
          console.error('Error getting student data:', error);
          assignmentData.student = { uid: assignmentData.assignedTo, email: 'Unknown' };
        }
      }

      return assignmentData;
    }));

    const totalPages = Math.ceil(assignmentsSnapshot.size / Number(limit));

    console.log('✅ Returning shared resources:', { count: assignments.length, totalPages, currentPage: Number(page) });

    res.status(200).json({
      assignments,
      count: assignmentsSnapshot.size,
      totalPages,
      currentPage: Number(page)
    });

  } catch (error) {
    console.error('❌ Error getting shared resources:', error);
    res.status(500).json({ message: 'Failed to get shared resources' });
  }
};

// Get delivered resources for students in teacher's class
export const getDeliveredResources = async (req: Request, res: Response) => {
  try {
    const { uid } = req.user!;
    const { page = 1, limit = 10, studentId, issueType } = req.query;

    console.log('📊 Getting delivered resources for teacher:', { uid, studentId, issueType });

    // Get teacher's custom claims
    const teacherData = await admin.auth().getUser(uid);
    if (!teacherData.customClaims?.role || teacherData.customClaims.role !== ROLES.TEACHER) {
      return res.status(400).json({ message: "Teacher data not found" });
    }

    // Get teacher's claims for filtering students
    const teacherClaims = teacherData.customClaims as any;
    
    // Get all students linked to this teacher (same logic as getStudents)
    const studentsSnapshot = await admin.auth().listUsers();
    const students = studentsSnapshot.users.filter((user) => {
      const studentClaims = user.customClaims as any;
      if (!studentClaims) return false;

      // Check if the student belongs to this teacher
      const isMatch = 
        studentClaims.schoolId === teacherClaims.schoolId &&  // Same school
        studentClaims.role === ROLES.STUDENT &&  // Is a student
        (studentClaims.teacherIncharge === uid ||  // Teacher is assigned directly
         (studentClaims.teacherId === uid && !studentClaims.teacherIncharge));  // Fallback to teacherId if teacherIncharge not set

      return isMatch;
    });
    
    if (students.length === 0) {
      return res.status(200).json({
        deliveredResources: [],
        count: 0,
        totalPages: 0,
        currentPage: Number(page)
      });
    }

    const studentIds = students.map(student => student.uid);
    console.log('👥 Found students for teacher:', studentIds.length);

    // Build query for studentFlags collection
    let flagsQuery = admin.firestore()
      .collection('studentFlags')
      .where('studentId', 'in', studentIds.slice(0, 10)) // Firestore limit
      .where('resourcesDelivered', '==', true);

    // Filter by specific student if requested
    if (studentId && typeof studentId === 'string' && studentId !== 'all') {
      flagsQuery = admin.firestore()
        .collection('studentFlags')
        .where('studentId', '==', studentId)
        .where('resourcesDelivered', '==', true);
    }

    // Filter by issue type if requested
    if (issueType && typeof issueType === 'string' && issueType !== 'all') {
      flagsQuery = flagsQuery.where('issueType', '==', issueType);
    }

    const flagsSnapshot = await flagsQuery.get();
    console.log('📋 Found student flags:', flagsSnapshot.size);

    const deliveredResources = flagsSnapshot.docs.map(doc => {
      const flagData = doc.data() as any;
      return {
        id: doc.id,
        resourceId: 'mental-health-resource',
        title: `Mental Health Resource - ${flagData.issueType}`,
        description: `Resource delivered for ${flagData.issueType} concerns`,
        url: '#',
        category: 'Mental Health',
        issueType: flagData.issueType,
        deliveredAt: flagData.resourcesDeliveredAt?.toDate?.() || flagData.resourcesDeliveredAt || new Date(),
        deliveredReason: `Detected ${flagData.issueType} concerns in journal entries`,
        viewedAt: null,
        studentId: flagData.studentId,
        student: {
          uid: flagData.studentId,
          displayName: flagData.studentName || 'Unknown Student',
          email: flagData.studentEmail || 'unknown@example.com',
          districtId: flagData.districtId,
          schoolId: flagData.schoolId,
          dateFirstFlagged: flagData.dateFirstFlagged,
          dateLastFlagged: flagData.dateLastFlagged,
          deliveredResourcesCount: flagData.deliveredResourcesCount || 0,
          resourcesDelivered: flagData.resourcesDelivered || false,
          resourcesDeliveredAt: flagData.resourcesDeliveredAt?.toDate?.() || flagData.resourcesDeliveredAt
        },
        flags: [flagData],
        totalFlagCount: flagData.flagCount || 0,
        flagsByType: {
          [flagData.issueType]: flagData.flagCount || 0
        },
        excerpts: flagData.excerpts || [],
        lastAnalysisDate: flagData.lastUpdated?.toDate?.() || flagData.lastUpdated
      };
    });

    // Sort by delivered date (newest first)
    deliveredResources.sort((a, b) => {
      const dateA = a.deliveredAt instanceof Date ? a.deliveredAt : new Date(a.deliveredAt);
      const dateB = b.deliveredAt instanceof Date ? b.deliveredAt : new Date(b.deliveredAt);
      return dateB.getTime() - dateA.getTime();
    });

    // Apply pagination
    const startIndex = (Number(page) - 1) * Number(limit);
    const endIndex = startIndex + Number(limit);
    const paginatedResources = deliveredResources.slice(startIndex, endIndex);

    const totalPages = Math.ceil(deliveredResources.length / Number(limit));

    console.log('✅ Returning delivered resources:', { 
      count: paginatedResources.length, 
      total: deliveredResources.length,
      totalPages, 
      currentPage: Number(page) 
    });

    res.status(200).json({
      deliveredResources: paginatedResources,
      count: deliveredResources.length,
      totalPages,
      currentPage: Number(page)
    });

  } catch (error) {
    console.error('❌ Error getting delivered resources:', error);
    res.status(500).json({ message: 'Failed to get delivered resources' });
  }
};

// Simple endpoint to get students in the teacher's class
export const getTeacherStudents = async (req, res) => {
  try {
    const { uid } = req.user!;
    // Get teacher's custom claims
    const teacherData = await admin.auth().getUser(uid);
    if (!teacherData.customClaims) {
      return res.status(400).json({ error: "Teacher data not found" });
    }
    const teacherClaims = teacherData.customClaims;
    if (!teacherClaims.schoolId) {
      return res.status(400).json({ error: "Invalid teacher data: missing schoolId" });
    }
    // Get students in the class
    const studentsSnapshot = await admin.auth().listUsers();
    const students = studentsSnapshot.users.filter((user) => {
      const studentClaims = user.customClaims;
      if (!studentClaims) return false;
      return studentClaims.schoolId === teacherClaims.schoolId &&
        studentClaims.role === "student" &&
        studentClaims.teacherIncharge === uid;
    });
    // For each student, fetch journalEntries and lastActivity from Firestore
    const db = admin.firestore();
    const studentList = await Promise.all(students.map(async user => {
      let journalEntries = 0;
      let lastActivity: string | null = null;
      try {
        const entriesSnap = await db.collection('diaryEntries').doc(user.uid).collection('entries').orderBy('createdAt', 'desc').get();
        journalEntries = entriesSnap.size;
        if (!entriesSnap.empty) {
          const lastEntry = entriesSnap.docs[0].data();
          lastActivity = lastEntry.createdAt?.toDate ? lastEntry.createdAt.toDate().toISOString() : (lastEntry.createdAt || null);
        }
      } catch (e) {
        // If error, leave journalEntries as 0 and lastActivity as null
      }
      return {
        uid: user.uid,
        displayName: user.displayName || '',
        email: user.email || '',
        status: user.disabled ? 'inactive' : 'active',
        customClaims: user.customClaims || {},
        journalEntries,
        lastActivity,
      };
    }));
    return res.status(200).json({ students: studentList });
  } catch (error) {
    console.error("Error in getTeacherStudents:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
