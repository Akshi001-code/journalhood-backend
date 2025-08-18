"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClassHistoricalAnalytics = exports.getClassAnalytics = exports.getSchoolHistoricalAnalytics = exports.getSchoolAnalytics = exports.getDistrictHistoricalAnalytics = exports.getDistrictAnalytics = exports.getClasses = exports.getResourceAssignments = exports.assignResource = exports.deleteResource = exports.updateResource = exports.getResources = exports.createResource = exports.getStudents = exports.getUnassignedSchools = exports.unassignSchoolFromDistrict = exports.assignSchoolToDistrict = exports.deleteSchoolBySuperAdmin = exports.updateSchoolBySuperAdmin = exports.createSchoolBySuperAdmin = exports.toggleSchoolStatus = exports.getHistoricalAnalytics = exports.getAnalytics = exports.updateAnalyticsIncremental = exports.analyzeDiaryEntries = exports.getAllSchools = exports.getAllDistricts = exports.toggleDistrictStatus = exports.deleteDistrict = exports.updateDistrict = exports.createDistrict = exports.deleteDistrictAdmin = exports.getSystemStats = exports.suspendOrUnsuspendDistrictAdmin = exports.updateDistrictAdmin = exports.getDistrictAdmins = exports.createMultipleDistrictAdmins = exports.createDistrictAdmin = exports.testFirebaseEmail = exports.testEmail = void 0;
const firebase_config_1 = __importDefault(require("../config/firebase.config"));
const app_config_1 = require("../config/app.config");
const nodemailer_config_1 = require("../config/nodemailer.config");
const firestore_1 = require("firebase-admin/firestore");
// Test email function
const testEmail = async (req, res) => {
    try {
        const { testEmailAddress } = req.body;
        const targetEmail = testEmailAddress || req.user?.email || process.env.EMAIL;
        if (!targetEmail) {
            return res.status(400).json({
                error: "No email address provided",
                details: "Please provide a testEmailAddress in the request body"
            });
        }
        if (!nodemailer_config_1.transporter) {
            return res.status(500).json({
                error: "Email transporter not configured",
                details: "Check EMAIL and EMAIL_PASSWORD environment variables"
            });
        }
        // Send test email
        await nodemailer_config_1.transporter.sendMail({
            from: process.env.TITAN_EMAIL || process.env.titanemail || process.env.EMAIL,
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
              <p><strong>From:</strong> ${process.env.TITAN_EMAIL || process.env.titanemail || process.env.EMAIL}</p>
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
    }
    catch (error) {
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
            }
            else if (error.message.includes("ENOTFOUND")) {
                errorDetails = "SMTP server not found. Check your email provider configuration.";
            }
            else if (error.message.includes("ECONNREFUSED")) {
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
exports.testEmail = testEmail;
// Test Firebase email configuration
const testFirebaseEmail = async (req, res) => {
    try {
        const { email = "test@example.com" } = req.body;
        console.log("🧪 Testing Firebase email configuration...");
        console.log("📧 Target email:", email);
        // Test Firebase Auth connection
        try {
            const user = await firebase_config_1.default.auth().getUserByEmail(email).catch(() => null);
            console.log("🔍 User lookup result:", user ? "Found" : "Not found");
        }
        catch (error) {
            console.log("🔍 User lookup error:", error);
        }
        // Test password reset email
        try {
            const resetLink = await firebase_config_1.default.auth().generatePasswordResetLink(email, {
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
        }
        catch (error) {
            console.error("❌ Password reset link generation failed:", error);
            return res.status(500).json({
                success: false,
                error: error.message,
                note: "Check Firebase Console > Authentication > Templates and ensure they are enabled"
            });
        }
    }
    catch (error) {
        console.error("❌ Firebase email test failed:", error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
exports.testFirebaseEmail = testFirebaseEmail;
// createDistrictAdmin
const createDistrictAdmin = async (req, res) => {
    try {
        const { email, name, districtId, phone } = req.body;
        console.log("🔄 Creating district admin:", { email, name, districtId, phone });
        // Check if district exists
        const districtDoc = await firebase_config_1.default.firestore().collection("districts").doc(districtId).get();
        if (!districtDoc.exists) {
            console.log("❌ District not found:", districtId);
            return res.status(404).json({ error: "District not found" });
        }
        console.log("✅ District found:", districtDoc.data()?.name);
        // Check if user already exists
        try {
            const existingUser = await firebase_config_1.default.auth().getUserByEmail(email);
            console.log("❌ User already exists:", existingUser.uid);
            return res.status(400).json({ error: "User already exists" });
        }
        catch (error) {
            if (error.code !== 'auth/user-not-found') {
                throw error;
            }
            console.log("✅ User doesn't exist, proceeding with creation");
        }
        // Create user in Firebase Auth
        const userCreateData = {
            displayName: name,
            email: email,
            password: app_config_1.DEFAULT_PASSWORDS.DISTRICT_ADMIN,
            emailVerified: false,
            phoneNumber: phone || null,
        };
        const userRecord = await firebase_config_1.default.auth().createUser(userCreateData);
        console.log("✅ Firebase Auth user created:", userRecord.uid);
        // Create user document in Firestore
        const userDocData = {
            displayName: name,
            email: email,
            role: app_config_1.ROLES.DISTRICT_ADMIN,
            districtId: districtId,
            districtName: districtDoc.data()?.name || '',
            isActive: true,
            createdAt: firestore_1.Timestamp.now(),
            updatedAt: firestore_1.Timestamp.now(),
            phoneNumber: phone || null,
        };
        await firebase_config_1.default.firestore().collection("users").doc(userRecord.uid).set(userDocData);
        console.log("✅ Firestore user document created");
        // Set custom claims for role-based access
        await firebase_config_1.default.auth().setCustomUserClaims(userRecord.uid, {
            role: app_config_1.ROLES.DISTRICT_ADMIN,
            districtId: districtId,
            districtName: districtDoc.data()?.name || '',
        });
        console.log("✅ Custom claims set for district admin");
        // Determine the from address once (prefer Titan env, fallback to generic EMAIL)
        const fromAddress = process.env.TITAN_EMAIL ||
            process.env.titanemail ||
            process.env.EMAIL ||
            "noreply@journalhood.com";
        // Generate password reset and email verification links and send welcome email
        if (email) {
            const [resetLink, verifyEmailLink] = await Promise.all([
                firebase_config_1.default.auth().generatePasswordResetLink(email),
                firebase_config_1.default.auth().generateEmailVerificationLink(email)
            ]);
            if (nodemailer_config_1.transporter && fromAddress) {
                try {
                    await nodemailer_config_1.transporter.sendMail({
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
                }
                catch (emailError) {
                    console.error("Error sending welcome email:", emailError);
                }
            }
            else {
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
                emailSent: !!(nodemailer_config_1.transporter && fromAddress),
            },
        });
    }
    catch (error) {
        console.error("Error creating district admin:", error);
        if (error instanceof Error) {
            return res.status(500).json({ error: error.message });
        }
        return res.status(500).json({ error: "Internal server error" });
    }
};
exports.createDistrictAdmin = createDistrictAdmin;
// createMultipleDistrictAdmins
const createMultipleDistrictAdmins = async (req, res) => {
    try {
        const districtAdmins = req.body;
        districtAdmins.forEach(async (districtAdmin) => {
            const user = await firebase_config_1.default.auth().getUserByEmail(districtAdmin.email);
            if (user) {
                throw new Error(`User with email ${districtAdmin.email} already exists`);
            }
        });
        await Promise.all(districtAdmins.map(async ({ districtId, email, name, password, phone, role }) => {
            try {
                // Get district info to ensure it exists
                const districtDoc = await firebase_config_1.default.firestore()
                    .collection("districts")
                    .doc(districtId)
                    .get();
                if (!districtDoc.exists) {
                    throw new Error("District not found");
                }
                // Create the user if they don't exist
                const newUser = await firebase_config_1.default.auth().createUser({
                    displayName: name,
                    email: email,
                    password: password,
                    phoneNumber: phone,
                    emailVerified: false,
                });
                // Set custom claims
                await firebase_config_1.default.auth().setCustomUserClaims(newUser.uid, {
                    role,
                    districtId: districtId,
                    districtName: districtDoc.data()?.name || '',
                });
            }
            catch (err) {
                console.error(`Error processing user ${email}:`, err.message);
                throw err;
            }
        }));
        return res.status(200).json({
            message: "District Admins Created Successfully",
        });
    }
    catch (error) {
        console.log("Error while creating district admin", error);
        return res.status(500).json({
            error: error instanceof Error ? error.message : "Internal Server Error",
        });
    }
};
exports.createMultipleDistrictAdmins = createMultipleDistrictAdmins;
// getDistrictAdmins
const getDistrictAdmins = async (_req, res) => {
    try {
        console.log("🔍 Fetching district admins...");
        const listUserResult = await firebase_config_1.default.auth().listUsers();
        const users = listUserResult.users;
        console.log(`📊 Total users: ${users.length}`);
        const districtAdmins = users.filter((user) => {
            const isDistrictAdmin = user.customClaims?.role === app_config_1.ROLES.DISTRICT_ADMIN;
            if (isDistrictAdmin) {
                console.log(`✅ Found district admin: ${user.email} (${user.uid})`);
            }
            return isDistrictAdmin;
        });
        console.log(`📋 District admins found: ${districtAdmins.length}`);
        res.status(200).json({
            districtAdmins,
        });
    }
    catch (error) {
        console.log("Error while getting district admins", error);
        res.status(500).json({
            error: "Internal Server Error",
        });
    }
};
exports.getDistrictAdmins = getDistrictAdmins;
// updateDistrictAdmin
const updateDistrictAdmin = async (req, res) => {
    try {
        const { uid } = req.params;
        const { email, name, phone, districtId } = req.body;
        const user = await firebase_config_1.default.auth().getUser(uid);
        if (user.email !== email) {
            await firebase_config_1.default.auth().updateUser(uid, {
                email,
                displayName: name,
                password: app_config_1.DEFAULT_PASSWORDS.DISTRICT_ADMIN,
                phoneNumber: phone,
                emailVerified: false,
            });
        }
        else {
            await firebase_config_1.default.auth().updateUser(uid, {
                displayName: name,
                phoneNumber: phone,
            });
        }
        await firebase_config_1.default.auth().setCustomUserClaims(uid, {
            ...user.customClaims,
            districtId,
        });
        const passwordResetLink = await firebase_config_1.default
            .auth()
            .generatePasswordResetLink(email);
        const verifyEmailLink = await firebase_config_1.default
            .auth()
            .generateEmailVerificationLink(email);
        await nodemailer_config_1.transporter.sendMail({
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
    }
    catch (error) {
        console.log("Error ", error);
        res.status(500).json({
            error: "Internal Server Error",
        });
    }
};
exports.updateDistrictAdmin = updateDistrictAdmin;
// suspendOrUnsuspendDistrictAdmin
const suspendOrUnsuspendDistrictAdmin = async (req, res) => {
    try {
        const { uid } = req.params;
        const user = await firebase_config_1.default.auth().getUser(uid);
        await firebase_config_1.default.auth().updateUser(uid, {
            disabled: !user.disabled,
        });
        res.status(200).json({
            message: `District Admin ${user.disabled ? "Unsuspended" : "Suspended"} Successfully`,
        });
    }
    catch (error) {
        console.log("Suspend or Unsuspend District Admin Error", error);
        res.status(500).json({
            error: "Internal Server Error",
        });
    }
};
exports.suspendOrUnsuspendDistrictAdmin = suspendOrUnsuspendDistrictAdmin;
// getSystemStats
const getSystemStats = async (_req, res) => {
    try {
        const listUserResult = await firebase_config_1.default.auth().listUsers();
        const users = listUserResult.users;
        // Count users by role
        const districtAdmins = users.filter(user => user.customClaims?.role === app_config_1.ROLES.DISTRICT_ADMIN);
        const schoolAdmins = users.filter(user => user.customClaims?.role === app_config_1.ROLES.SCHOOL_ADMIN);
        const teachers = users.filter(user => user.customClaims?.role === app_config_1.ROLES.TEACHER);
        const students = users.filter(user => user.customClaims?.role === app_config_1.ROLES.STUDENT);
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
    }
    catch (error) {
        console.error("Error getting system stats:", error);
        res.status(500).json({
            error: "Internal Server Error",
        });
    }
};
exports.getSystemStats = getSystemStats;
// deleteDistrictAdmin
const deleteDistrictAdmin = async (req, res) => {
    try {
        const { uid } = req.params;
        await firebase_config_1.default.auth().deleteUser(uid);
        res.status(200).json({
            message: "District Admin Deleted Successfully",
        });
    }
    catch (error) {
        console.log("Delete District Admin Error", error);
        res.status(500).json({
            error: "Internal Server Error",
        });
    }
};
exports.deleteDistrictAdmin = deleteDistrictAdmin;
// createDistrict
const createDistrict = async (req, res) => {
    try {
        const { name, country } = req.body;
        if (!name || name.trim() === '') {
            return res.status(400).json({
                error: "Invalid district name",
                details: "District name is required and cannot be empty"
            });
        }
        // Create district document in Firestore
        const districtRef = await firebase_config_1.default.firestore().collection('districts').add({
            name: name.trim(),
            country,
            createdAt: firebase_config_1.default.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase_config_1.default.firestore.FieldValue.serverTimestamp(),
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
    }
    catch (error) {
        console.error("Error creating district:", error);
        res.status(500).json({
            error: "Internal Server Error",
        });
    }
};
exports.createDistrict = createDistrict;
// updateDistrict
const updateDistrict = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, country } = req.body;
        await firebase_config_1.default.firestore().collection('districts').doc(id).update({
            name,
            country,
            updatedAt: firebase_config_1.default.firestore.FieldValue.serverTimestamp(),
        });
        res.status(200).json({
            message: "District updated successfully",
        });
    }
    catch (error) {
        console.error("Error updating district:", error);
        res.status(500).json({
            error: "Internal Server Error",
        });
    }
};
exports.updateDistrict = updateDistrict;
// deleteDistrict
const deleteDistrict = async (req, res) => {
    try {
        const { id } = req.params;
        await firebase_config_1.default.firestore().collection('districts').doc(id).delete();
        res.status(200).json({
            message: "District deleted successfully",
        });
    }
    catch (error) {
        console.error("Error deleting district:", error);
        res.status(500).json({
            error: "Internal Server Error",
        });
    }
};
exports.deleteDistrict = deleteDistrict;
// toggleDistrictStatus
const toggleDistrictStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        await firebase_config_1.default.firestore().collection('districts').doc(id).update({
            status,
            updatedAt: firebase_config_1.default.firestore.FieldValue.serverTimestamp(),
        });
        res.status(200).json({
            message: "District status updated successfully",
        });
    }
    catch (error) {
        console.error("Error updating district status:", error);
        res.status(500).json({
            error: "Internal Server Error",
        });
    }
};
exports.toggleDistrictStatus = toggleDistrictStatus;
// getAllDistricts
const getAllDistricts = async (_req, res) => {
    try {
        console.log('📊 Fetching all districts with admin information...');
        // Get districts from Firestore
        const districtsSnapshot = await firebase_config_1.default.firestore().collection('districts').get();
        const districts = districtsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));
        console.log(`📋 Found ${districts.length} districts`);
        // Get all schools to calculate class and school counts per district
        const schoolsSnapshot = await firebase_config_1.default.firestore().collection('schools').get();
        const schools = schoolsSnapshot.docs.map(doc => ({
            id: doc.id,
            districtId: doc.data().districtId,
            classCount: doc.data().classCount || 0
        }));
        // Get all classes to count per district
        const classesSnapshot = await firebase_config_1.default.firestore().collection('classes').get();
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
        }, {});
        // Count classes per district
        const districtClassCounts = classes.reduce((acc, cls) => {
            const districtId = schoolIdToDistrictId[cls.schoolId];
            if (districtId) {
                acc[districtId] = (acc[districtId] || 0) + 1;
            }
            return acc;
        }, {});
        // Get all users to find district admins and students
        const listUserResult = await firebase_config_1.default.auth().listUsers();
        const users = listUserResult.users;
        // Find district admins and match them to districts
        const districtAdmins = users.filter(user => user.customClaims?.role === app_config_1.ROLES.DISTRICT_ADMIN);
        // Find students and count per district
        const students = users.filter(user => user.customClaims?.role === app_config_1.ROLES.STUDENT);
        const districtStudentCounts = students.reduce((acc, student) => {
            const districtId = student.customClaims?.districtId;
            if (districtId) {
                acc[districtId] = (acc[districtId] || 0) + 1;
            }
            return acc;
        }, {});
        // Count schools per district
        const districtSchoolCounts = schools.reduce((acc, school) => {
            if (school.districtId) {
                acc[school.districtId] = (acc[school.districtId] || 0) + 1;
            }
            return acc;
        }, {});
        // Enhance districts with admin information and counts
        const enhancedDistricts = districts.map(district => {
            // Find the admin for this district
            const admin = districtAdmins.find(user => user.customClaims?.districtId === district.id);
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
    }
    catch (error) {
        console.error("❌ Error getting all districts:", error);
        res.status(500).json({
            error: "Internal Server Error",
        });
    }
};
exports.getAllDistricts = getAllDistricts;
// getAllSchools
const getAllSchools = async (_req, res) => {
    try {
        // Get schools from Firestore collection
        const schoolsSnapshot = await firebase_config_1.default.firestore().collection('schools').get();
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
        const listUserResult = await firebase_config_1.default.auth().listUsers();
        const users = listUserResult.users;
        // Get teacher counts
        const teachers = users.filter((user) => user.customClaims?.role === app_config_1.ROLES.TEACHER);
        // Get student counts
        const students = users.filter((user) => user.customClaims?.role === app_config_1.ROLES.STUDENT);
        // Update counts with actual data
        schools.forEach(school => {
            school.teacherCount = teachers.filter(t => t.customClaims?.schoolId === school.id).length;
            school.studentCount = students.filter(s => s.customClaims?.schoolId === school.id).length;
        });
        res.status(200).json({
            schools
        });
    }
    catch (error) {
        console.error("Error while getting schools:", error);
        res.status(500).json({
            error: "Internal Server Error"
        });
    }
};
exports.getAllSchools = getAllSchools;
// Helper function to get districts data
const getDistrictsData = async () => {
    try {
        const snapshot = await firebase_config_1.default.firestore().collection('districts').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
    catch (error) {
        console.error('Error getting districts data:', error);
        return [];
    }
};
// Helper function to get schools data
const getSchoolsData = async () => {
    try {
        const snapshot = await firebase_config_1.default.firestore().collection('schools').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
    catch (error) {
        console.error('Error getting schools data:', error);
        return [];
    }
};
const analyzeDiaryEntries = async (req, res) => {
    try {
        console.log('🧠 Starting unified journal analysis workflow...');
        const { uid: adminId } = req.user;
        // Verify this is a super admin
        const adminUser = await firebase_config_1.default.auth().getUser(adminId);
        const adminClaims = adminUser.customClaims;
        if (adminClaims?.role !== 'super-admin') {
            return res.status(403).json({
                error: "Access denied",
                details: "Only super admins can run comprehensive analysis"
            });
        }
        const db = firebase_config_1.default.firestore();
        // STEP 1: Get all students with their hierarchical data
        console.log('👥 Getting all students...');
        const studentsSnapshot = await firebase_config_1.default.auth().listUsers();
        const students = studentsSnapshot.users.filter(user => {
            const claims = user.customClaims;
            return claims && claims.role === app_config_1.ROLES.STUDENT;
        });
        // STEP 2: Get all journal entries
        console.log('📝 Getting all journal entries...');
        const entries = [];
        // Get from diaryEntries (non-encrypted)
        for (const student of students) {
            const claims = student.customClaims;
            if (!claims)
                continue;
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
        const stats = {
            id: new Date().toISOString(),
            timestamp: firebase_config_1.default.firestore.Timestamp.now(),
            totalWords: 0,
            totalEntries: entries.length,
            districtStats: {},
            schoolStats: {},
            classStats: {},
            studentStats: {}
        };
        // Process each entry
        for (const entry of entries) {
            const { studentId, studentName, classId, className, schoolId, schoolName, districtId, districtName, content, emotion, timestamp } = entry;
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
                    .filter((word) => word.length > 0)
                    .length;
            }
            else if (typeof content === 'string') {
                wordCount = content.trim().split(/\s+/).filter((word) => word.length > 0).length;
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
        const activeStudentsByClass = new Set();
        const activeStudentsBySchool = new Set();
        const activeStudentsByDistrict = new Set();
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
            const previousAnalytics = previousAnalyticsSnapshot.docs[0].data();
            // Calculate growth for each level
            Object.entries(stats.studentStats).forEach(([studentId, student]) => {
                const previous = previousAnalytics.studentStats?.[studentId];
                if (previous) {
                    student.weeklyGrowth = calculateGrowthRate(previous.weeklyEntries || 0, student.weeklyEntries || 0);
                    student.monthlyGrowth = calculateGrowthRate(previous.monthlyEntries || 0, student.monthlyEntries || 0);
                }
            });
            Object.entries(stats.classStats).forEach(([classId, classStats]) => {
                const previous = previousAnalytics.classStats?.[classId];
                if (previous) {
                    classStats.weeklyGrowth = calculateGrowthRate(previous.weeklyEntries || 0, classStats.weeklyEntries || 0);
                    classStats.monthlyGrowth = calculateGrowthRate(previous.monthlyEntries || 0, classStats.monthlyEntries || 0);
                }
            });
            Object.entries(stats.schoolStats).forEach(([schoolId, schoolStats]) => {
                const previous = previousAnalytics.schoolStats?.[schoolId];
                if (previous) {
                    schoolStats.weeklyGrowth = calculateGrowthRate(previous.weeklyEntries || 0, schoolStats.weeklyEntries || 0);
                    schoolStats.monthlyGrowth = calculateGrowthRate(previous.monthlyEntries || 0, schoolStats.monthlyEntries || 0);
                }
            });
            Object.entries(stats.districtStats).forEach(([districtId, districtStats]) => {
                const previous = previousAnalytics.districtStats?.[districtId];
                if (previous) {
                    districtStats.weeklyGrowth = calculateGrowthRate(previous.weeklyEntries || 0, districtStats.weeklyEntries || 0);
                    districtStats.monthlyGrowth = calculateGrowthRate(previous.monthlyEntries || 0, districtStats.monthlyEntries || 0);
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
    }
    catch (error) {
        console.error('❌ Error in analysis:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return res.status(500).json({
            error: "Failed to analyze data",
            details: errorMessage
        });
    }
};
exports.analyzeDiaryEntries = analyzeDiaryEntries;
function calculateGrowthRate(previous, current) {
    if (previous === 0)
        return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
}
// ================================================================================================
// INCREMENTAL ANALYTICS UPDATE FUNCTION
// ================================================================================================
const updateAnalyticsIncremental = async (req, res) => {
    try {
        console.log('📊 Starting incremental analytics update...');
        const { uid: adminId } = req.user;
        // Verify this is a super admin
        const adminUser = await firebase_config_1.default.auth().getUser(adminId);
        const adminClaims = adminUser.customClaims;
        if (adminClaims?.role !== 'super-admin') {
            return res.status(403).json({
                error: "Access denied",
                details: "Only super admins can update analytics"
            });
        }
        const db = firebase_config_1.default.firestore();
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
        const currentAnalytics = analyticsSnapshot.docs[0].data();
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
        const backupEntries = [];
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
        const userJournalEntries = [];
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
        const studentsSnapshot = await firebase_config_1.default.auth().listUsers();
        const students = studentsSnapshot.users.filter(user => {
            const claims = user.customClaims;
            return claims && claims.role === app_config_1.ROLES.STUDENT;
        });
        // Initialize stats objects
        const studentStats = {};
        const classStats = {};
        const schoolStats = {};
        const districtStats = {};
        // Process each student's entries for analytics
        for (const student of students) {
            const claims = student.customClaims;
            if (!claims || !claims.classId || !claims.schoolId || !claims.districtId || !claims.className)
                continue;
            const studentEntries = combinedEntries.filter(entry => entry.studentId === student.uid);
            if (studentEntries.length === 0)
                continue;
            // Calculate student stats
            let totalWords = 0;
            for (const entry of studentEntries) {
                let content = entry.content;
                // Handle different content formats
                if (Array.isArray(content)) {
                    content = content.map((op) => op.insert || '').join('').trim();
                }
                else if (typeof content === 'string') {
                    content = content.trim();
                }
                else {
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
        const updatedAnalytics = {
            id: new Date().toISOString(),
            timestamp: firebase_config_1.default.firestore.Timestamp.now(),
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
    }
    catch (error) {
        console.error('❌ Error in incremental analytics update:', error);
        return res.status(500).json({
            error: "Failed to update analytics incrementally",
            details: error.message
        });
    }
};
exports.updateAnalyticsIncremental = updateAnalyticsIncremental;
// Update the getAnalytics function to use the new dailyAnalytics collection
const getAnalytics = async (req, res) => {
    try {
        const db = firebase_config_1.default.firestore();
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
        const latestAnalytics = analyticsSnapshot.docs[0].data();
        return res.status(200).json({
            data: latestAnalytics
        });
    }
    catch (error) {
        console.error('Error getting analytics:', error);
        return res.status(500).json({
            error: "Failed to get analytics data",
            details: error.message
        });
    }
};
exports.getAnalytics = getAnalytics;
// Get historical analytics data for line graphs
const getHistoricalAnalytics = async (req, res) => {
    try {
        const db = firebase_config_1.default.firestore();
        // Get last 30 days of analyzed data reports
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const historicalSnapshot = await db.collection('analyzedData')
            .where('timestamp', '>=', firebase_config_1.default.firestore.Timestamp.fromDate(thirtyDaysAgo))
            .orderBy('timestamp', 'asc')
            .get();
        if (historicalSnapshot.empty) {
            return res.status(200).json({
                data: [],
                message: "No historical data found for the last 30 days"
            });
        }
        const historicalData = historicalSnapshot.docs.map(doc => {
            const data = doc.data();
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
    }
    catch (error) {
        console.error('Error getting historical analytics:', error);
        return res.status(500).json({
            error: "Failed to get historical analytics data",
            details: error.message
        });
    }
};
exports.getHistoricalAnalytics = getHistoricalAnalytics;
function calculateStudentStats(analytics) {
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
function calculateDistrictStats(analytics) {
    const districts = new Map();
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
        const districtData = districts.get(entry.districtName);
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
function calculateSchoolStats(analytics) {
    const schools = new Map();
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
        const schoolData = schools.get(entry.schoolName);
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
        averageStudentsPerSchool: Math.round(Array.from(schools.values()).reduce((sum, school) => sum + school.studentCount.size, 0) / schools.size),
        topSchools: schoolArray
    };
}
async function getSystemHealth() {
    try {
        // Get total users
        const usersSnapshot = await firebase_config_1.default.firestore().collection('users').count().get();
        const totalUsers = usersSnapshot.data().count;
        // Calculate storage used (simplified)
        const storageUsed = 1024; // 1GB placeholder
        return {
            uptime: 99.9, // Placeholder
            totalUsers,
            storageUsed,
            lastBackup: new Date().toISOString() // Placeholder
        };
    }
    catch (error) {
        console.error('Error getting system health:', error);
        return {
            uptime: 0,
            totalUsers: 0,
            storageUsed: 0,
            lastBackup: new Date().toISOString()
        };
    }
}
const toggleSchoolStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const school = await firebase_config_1.default.firestore().collection('schools').doc(id).get();
        if (!school.exists) {
            return res.status(404).json({
                error: "School not found",
            });
        }
        const schoolData = school.data();
        await firebase_config_1.default.firestore().collection('schools').doc(id).update({
            status: schoolData?.status === "active" ? "suspended" : "active",
        });
        res.status(200).json({
            message: "School status updated successfully",
        });
    }
    catch (error) {
        console.log("Error while toggling school status", error);
        res.status(500).json({
            error: "Internal Server Error",
        });
    }
};
exports.toggleSchoolStatus = toggleSchoolStatus;
// Super Admin School Management Functions
// Create school with optional district assignment
const createSchoolBySuperAdmin = async (req, res) => {
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
                const districtDoc = await firebase_config_1.default.firestore().collection("districts").doc(districtId).get();
                if (districtDoc.exists) {
                    districtName = districtDoc.data()?.name || null;
                    console.log('✅ Found district:', { districtId, districtName });
                }
                else {
                    console.warn('⚠️ District not found:', districtId);
                }
            }
            catch (error) {
                console.warn('⚠️ Error fetching district:', error instanceof Error ? error.message : 'Unknown error');
            }
        }
        // Create school in Firestore with optional district assignment
        const docRef = await firebase_config_1.default.firestore().collection("schools").add({
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
            createdAt: firebase_config_1.default.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase_config_1.default.firestore.FieldValue.serverTimestamp(),
        });
        console.log('✅ School created successfully:', docRef.id);
        res.status(201).json({
            message: "School created successfully",
            schoolId: docRef.id,
        });
    }
    catch (error) {
        console.error("Error creating school:", error);
        res.status(500).json({
            message: "Failed to create school",
            details: error instanceof Error ? error.message : "Unknown error"
        });
    }
};
exports.createSchoolBySuperAdmin = createSchoolBySuperAdmin;
// Update school details
const updateSchoolBySuperAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, address, zipCode } = req.body;
        if (!id) {
            return res.status(400).json({ message: "School ID is required" });
        }
        console.log('🏫 Super Admin updating school:', { id, name, address, zipCode });
        // Check if school exists
        const schoolDoc = await firebase_config_1.default.firestore().collection("schools").doc(id).get();
        if (!schoolDoc.exists) {
            return res.status(404).json({ message: "School not found" });
        }
        // Update school in Firestore
        const updateData = {
            updatedAt: firebase_config_1.default.firestore.FieldValue.serverTimestamp(),
        };
        if (name)
            updateData.name = name;
        if (address !== undefined)
            updateData.address = address;
        if (zipCode !== undefined)
            updateData.zipCode = zipCode;
        await firebase_config_1.default.firestore().collection("schools").doc(id).update(updateData);
        console.log('✅ School updated successfully:', id);
        res.status(200).json({ message: "School updated successfully" });
    }
    catch (error) {
        console.error("Error updating school:", error);
        res.status(500).json({
            message: "Failed to update school",
            details: error instanceof Error ? error.message : "Unknown error"
        });
    }
};
exports.updateSchoolBySuperAdmin = updateSchoolBySuperAdmin;
// Delete school
const deleteSchoolBySuperAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ message: "School ID is required" });
        }
        console.log('🏫 Super Admin deleting school:', id);
        // Check if school exists
        const schoolDoc = await firebase_config_1.default.firestore().collection("schools").doc(id).get();
        if (!schoolDoc.exists) {
            return res.status(404).json({ message: "School not found" });
        }
        // TODO: Add checks for existing students/teachers/classes before deletion
        // For now, we'll allow deletion
        // Delete school from Firestore
        await firebase_config_1.default.firestore().collection("schools").doc(id).delete();
        console.log('✅ School deleted successfully:', id);
        res.status(200).json({ message: "School deleted successfully" });
    }
    catch (error) {
        console.error("Error deleting school:", error);
        res.status(500).json({
            message: "Failed to delete school",
            details: error instanceof Error ? error.message : "Unknown error"
        });
    }
};
exports.deleteSchoolBySuperAdmin = deleteSchoolBySuperAdmin;
// Assign school to district
const assignSchoolToDistrict = async (req, res) => {
    try {
        const { schoolId, districtId } = req.body;
        if (!schoolId || !districtId) {
            return res.status(400).json({
                message: "School ID and District ID are required"
            });
        }
        console.log('🏫 Super Admin assigning school to district:', { schoolId, districtId });
        // Check if school exists
        const schoolDoc = await firebase_config_1.default.firestore().collection("schools").doc(schoolId).get();
        if (!schoolDoc.exists) {
            return res.status(404).json({ message: "School not found" });
        }
        // Check if district exists
        const districtDoc = await firebase_config_1.default.firestore().collection("districts").doc(districtId).get();
        if (!districtDoc.exists) {
            return res.status(404).json({ message: "District not found" });
        }
        const districtData = districtDoc.data();
        if (!districtData?.name) {
            return res.status(400).json({ message: "District name not found" });
        }
        // Update school with district assignment
        await firebase_config_1.default.firestore().collection("schools").doc(schoolId).update({
            districtId,
            districtName: districtData.name,
            updatedAt: firebase_config_1.default.firestore.FieldValue.serverTimestamp(),
        });
        console.log('✅ School assigned to district successfully');
        res.status(200).json({
            message: "School assigned to district successfully"
        });
    }
    catch (error) {
        console.error("Error assigning school to district:", error);
        res.status(500).json({
            message: "Failed to assign school to district",
            details: error instanceof Error ? error.message : "Unknown error"
        });
    }
};
exports.assignSchoolToDistrict = assignSchoolToDistrict;
// Unassign school from district
const unassignSchoolFromDistrict = async (req, res) => {
    try {
        const { schoolId } = req.body;
        if (!schoolId) {
            return res.status(400).json({
                message: "School ID is required"
            });
        }
        console.log('🏫 Super Admin unassigning school from district:', schoolId);
        // Check if school exists
        const schoolDoc = await firebase_config_1.default.firestore().collection("schools").doc(schoolId).get();
        if (!schoolDoc.exists) {
            return res.status(404).json({ message: "School not found" });
        }
        // Remove district assignment
        await firebase_config_1.default.firestore().collection("schools").doc(schoolId).update({
            districtId: null,
            districtName: null,
            updatedAt: firebase_config_1.default.firestore.FieldValue.serverTimestamp(),
        });
        console.log('✅ School unassigned from district successfully');
        res.status(200).json({
            message: "School unassigned from district successfully"
        });
    }
    catch (error) {
        console.error("Error unassigning school from district:", error);
        res.status(500).json({
            message: "Failed to unassign school from district",
            details: error instanceof Error ? error.message : "Unknown error"
        });
    }
};
exports.unassignSchoolFromDistrict = unassignSchoolFromDistrict;
// Get unassigned schools
const getUnassignedSchools = async (req, res) => {
    try {
        console.log('🏫 Super Admin getting unassigned schools');
        // Get schools without district assignment
        const schoolsSnapshot = await firebase_config_1.default.firestore()
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
    }
    catch (error) {
        console.error("Error getting unassigned schools:", error);
        res.status(500).json({
            message: "Failed to get unassigned schools",
            details: error instanceof Error ? error.message : "Unknown error"
        });
    }
};
exports.getUnassignedSchools = getUnassignedSchools;
// Get students filtered by classId (Super Admin only)
const getStudents = async (req, res) => {
    try {
        const classId = req.query.classId;
        console.log('👨‍🎓 Super Admin getting students, classId:', classId);
        // Get all users from Firebase Auth
        const studentsSnapshot = await firebase_config_1.default.auth().listUsers();
        console.log('Total users found:', studentsSnapshot.users.length);
        // Filter students based on classId if provided
        let students = studentsSnapshot.users.filter((user) => {
            const studentClaims = user.customClaims;
            if (!studentClaims) {
                return false;
            }
            // Must be a student
            if (studentClaims.role !== app_config_1.ROLES.STUDENT) {
                return false;
            }
            // If classId is provided, filter by it
            if (classId) {
                return studentClaims.classId === classId;
            }
            // If no classId, return all students
            return true;
        });
        console.log('Filtered students:', students.length);
        // Get student analytics from Firestore
        const analyticsPromises = students.map(async (student) => {
            const entriesSnapshot = await firebase_config_1.default.firestore()
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
    }
    catch (error) {
        console.error("Error getting students:", error);
        res.status(500).json({
            message: "Failed to get students",
            details: error instanceof Error ? error.message : "Unknown error"
        });
    }
};
exports.getStudents = getStudents;
// Alternative: Use Firebase built-in email (simpler and more reliable)
const sendWelcomeEmailViaFirebase = async (email, name, districtName) => {
    try {
        // Generate password reset link (automatically sends email)
        const passwordResetLink = await firebase_config_1.default.auth().generatePasswordResetLink(email, {
            url: `${process.env.FRONTEND_URL}/login?message=password-set`, // Redirect after password reset
            handleCodeInApp: false,
        });
        console.log(`✅ Firebase password reset email sent to ${email}`);
        return { success: true, link: passwordResetLink };
    }
    catch (error) {
        console.error("❌ Firebase email failed:", error);
        return { success: false, error };
    }
};
// Enhanced: Use Firebase Extensions for custom welcome emails
const sendCustomWelcomeEmail = async (email, name, districtName, passwordResetLink) => {
    try {
        // Add document to trigger email extension
        await firebase_config_1.default.firestore().collection('mail').add({
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
    }
    catch (error) {
        console.error("❌ Custom email failed:", error);
        return { success: false, error };
    }
};
// =============================================================================
// RESOURCE MANAGEMENT FUNCTIONS
// =============================================================================
// Create Resource
const createResource = async (req, res) => {
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
        const resourceRef = await firebase_config_1.default.firestore().collection('resources').add(resourceData);
        console.log('✅ Resource created successfully:', resourceRef.id);
        res.status(201).json({
            message: "Resource created successfully",
            resourceId: resourceRef.id,
            resource: { id: resourceRef.id, ...resourceData }
        });
    }
    catch (error) {
        console.error("Error creating resource:", error);
        res.status(500).json({
            error: "Failed to create resource",
            details: error instanceof Error ? error.message : "Unknown error"
        });
    }
};
exports.createResource = createResource;
// Get Resources
const getResources = async (req, res) => {
    try {
        const { status = 'active', limit = 50, offset = 0 } = req.query;
        console.log('📚 Super Admin getting resources:', { status, limit, offset });
        let query = firebase_config_1.default.firestore().collection('resources').orderBy('createdAt', 'desc');
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
    }
    catch (error) {
        console.error("Error getting resources:", error);
        res.status(500).json({
            error: "Failed to get resources",
            details: error instanceof Error ? error.message : "Unknown error"
        });
    }
};
exports.getResources = getResources;
// Update Resource
const updateResource = async (req, res) => {
    try {
        const { resourceId } = req.params;
        const updateData = req.body;
        console.log('📚 Super Admin updating resource:', resourceId, updateData);
        // Check if resource exists
        const resourceDoc = await firebase_config_1.default.firestore().collection('resources').doc(resourceId).get();
        if (!resourceDoc.exists) {
            return res.status(404).json({ error: "Resource not found" });
        }
        // Update resource
        const updatedData = {
            ...updateData,
            updatedAt: new Date()
        };
        await firebase_config_1.default.firestore().collection('resources').doc(resourceId).update(updatedData);
        console.log('✅ Resource updated successfully');
        res.status(200).json({
            message: "Resource updated successfully",
            resourceId
        });
    }
    catch (error) {
        console.error("Error updating resource:", error);
        res.status(500).json({
            error: "Failed to update resource",
            details: error instanceof Error ? error.message : "Unknown error"
        });
    }
};
exports.updateResource = updateResource;
// Delete Resource
const deleteResource = async (req, res) => {
    try {
        const { resourceId } = req.params;
        console.log('📚 Super Admin deleting resource:', resourceId);
        // Check if resource exists
        const resourceDoc = await firebase_config_1.default.firestore().collection('resources').doc(resourceId).get();
        if (!resourceDoc.exists) {
            return res.status(404).json({ error: "Resource not found" });
        }
        // Soft delete - mark as archived
        await firebase_config_1.default.firestore().collection('resources').doc(resourceId).update({
            status: 'archived',
            updatedAt: new Date()
        });
        // Also archive any assignments of this resource
        const assignmentsSnapshot = await firebase_config_1.default.firestore()
            .collection('resource_assignments')
            .where('resourceId', '==', resourceId)
            .where('status', '==', 'active')
            .get();
        const batch = firebase_config_1.default.firestore().batch();
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
    }
    catch (error) {
        console.error("Error deleting resource:", error);
        res.status(500).json({
            error: "Failed to delete resource",
            details: error instanceof Error ? error.message : "Unknown error"
        });
    }
};
exports.deleteResource = deleteResource;
// Assign Resource
const assignResource = async (req, res) => {
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
        const resourceDoc = await firebase_config_1.default.firestore().collection('resources').doc(resourceId).get();
        if (!resourceDoc.exists) {
            return res.status(404).json({ error: "Resource not found" });
        }
        const resourceData = resourceDoc.data();
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
        const assignmentRef = await firebase_config_1.default.firestore().collection('resource_assignments').add(assignmentData);
        console.log('✅ Resource assigned successfully:', assignmentRef.id);
        res.status(201).json({
            message: "Resource assigned successfully",
            assignmentId: assignmentRef.id,
            assignment: { id: assignmentRef.id, ...assignmentData }
        });
    }
    catch (error) {
        console.error("Error assigning resource:", error);
        res.status(500).json({
            error: "Failed to assign resource",
            details: error instanceof Error ? error.message : "Unknown error"
        });
    }
};
exports.assignResource = assignResource;
// Get Resource Assignments
const getResourceAssignments = async (req, res) => {
    try {
        const { resourceId, assignedTo, targetType, targetId, status = 'active' } = req.query;
        console.log('📚 Super Admin getting resource assignments:', {
            resourceId,
            assignedTo,
            targetType,
            targetId,
            status
        });
        let query = firebase_config_1.default.firestore().collection('resource_assignments').orderBy('assignedAt', 'desc');
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
    }
    catch (error) {
        console.error("Error getting resource assignments:", error);
        res.status(500).json({
            error: "Failed to get resource assignments",
            details: error instanceof Error ? error.message : "Unknown error"
        });
    }
};
exports.getResourceAssignments = getResourceAssignments;
// Get classes for a school
const getClasses = async (req, res) => {
    try {
        const schoolId = req.query.schoolId;
        console.log("🔍 getClasses called with schoolId:", schoolId);
        if (!schoolId) {
            return res.status(400).json({ message: "School ID is required" });
        }
        // Get classes from Firestore with simple ordering
        console.log("📚 Querying classes for schoolId:", schoolId);
        const querySnapshot = await firebase_config_1.default
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
    }
    catch (error) {
        console.error("Error getting classes:", error);
        res.status(500).json({
            message: "Failed to get classes",
            details: error instanceof Error ? error.message : "Unknown error"
        });
    }
};
exports.getClasses = getClasses;
// Get district analytics
const getDistrictAnalytics = async (req, res) => {
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
        const analyticsSnapshot = await firebase_config_1.default.firestore()
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
    }
    catch (error) {
        console.error('Error getting district analytics:', error);
        return res.status(500).json({
            error: "Failed to get district analytics data",
            details: error instanceof Error ? error.message : "Unknown error"
        });
    }
};
exports.getDistrictAnalytics = getDistrictAnalytics;
// Get district historical analytics
const getDistrictHistoricalAnalytics = async (req, res) => {
    try {
        const { districtId } = req.params;
        console.log('🏛️ Super Admin getting district historical analytics:', districtId);
        if (!districtId) {
            return res.status(400).json({
                error: "Invalid request",
                details: "District ID is required"
            });
        }
        const db = firebase_config_1.default.firestore();
        // Get last 30 days of analyzed data reports
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const historicalSnapshot = await db.collection('analyzedData')
            .where('timestamp', '>=', firebase_config_1.default.firestore.Timestamp.fromDate(thirtyDaysAgo))
            .orderBy('timestamp', 'asc')
            .get();
        if (historicalSnapshot.empty) {
            return res.status(200).json({
                data: [],
                message: "No historical data found for the last 30 days"
            });
        }
        const historicalData = historicalSnapshot.docs.map(doc => {
            const data = doc.data();
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
    }
    catch (error) {
        console.error('Error getting district historical analytics:', error);
        return res.status(500).json({
            error: "Failed to get district historical analytics data",
            details: error instanceof Error ? error.message : "Unknown error"
        });
    }
};
exports.getDistrictHistoricalAnalytics = getDistrictHistoricalAnalytics;
// Get school analytics
const getSchoolAnalytics = async (req, res) => {
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
        const analyticsSnapshot = await firebase_config_1.default.firestore()
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
            .filter(([_, classData]) => classData.schoolId === schoolId)
            .reduce((acc, [classId, classData]) => {
            acc[classId] = classData;
            return acc;
        }, {});
        // Get students in this school
        const studentStats = Object.entries(latestAnalytics.studentStats || {})
            .filter(([_, studentData]) => studentData.schoolId === schoolId)
            .reduce((acc, [studentId, studentData]) => {
            acc[studentId] = studentData;
            return acc;
        }, {});
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
    }
    catch (error) {
        console.error('Error getting school analytics:', error);
        return res.status(500).json({
            error: "Failed to get school analytics data",
            details: error instanceof Error ? error.message : "Unknown error"
        });
    }
};
exports.getSchoolAnalytics = getSchoolAnalytics;
// Get school historical analytics
const getSchoolHistoricalAnalytics = async (req, res) => {
    try {
        const { schoolId } = req.params;
        console.log('🏫 Super Admin getting school historical analytics:', schoolId);
        if (!schoolId) {
            return res.status(400).json({
                error: "Invalid request",
                details: "School ID is required"
            });
        }
        const db = firebase_config_1.default.firestore();
        // Get last 30 days of analyzed data reports
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const historicalSnapshot = await db.collection('analyzedData')
            .where('timestamp', '>=', firebase_config_1.default.firestore.Timestamp.fromDate(thirtyDaysAgo))
            .orderBy('timestamp', 'asc')
            .get();
        if (historicalSnapshot.empty) {
            return res.status(200).json({
                data: [],
                message: "No historical data found for the last 30 days"
            });
        }
        const historicalData = historicalSnapshot.docs.map(doc => {
            const data = doc.data();
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
    }
    catch (error) {
        console.error('Error getting school historical analytics:', error);
        return res.status(500).json({
            error: "Failed to get school historical analytics data",
            details: error instanceof Error ? error.message : "Unknown error"
        });
    }
};
exports.getSchoolHistoricalAnalytics = getSchoolHistoricalAnalytics;
// Get class analytics
const getClassAnalytics = async (req, res) => {
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
        const analyticsSnapshot = await firebase_config_1.default.firestore()
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
            .filter(([_, studentData]) => studentData.classId === classId)
            .reduce((acc, [studentId, studentData]) => {
            acc[studentId] = studentData;
            return acc;
        }, {});
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
    }
    catch (error) {
        console.error('Error getting class analytics:', error);
        return res.status(500).json({
            error: "Failed to get class analytics data",
            details: error instanceof Error ? error.message : "Unknown error"
        });
    }
};
exports.getClassAnalytics = getClassAnalytics;
// Get class historical analytics
const getClassHistoricalAnalytics = async (req, res) => {
    try {
        const { classId } = req.params;
        console.log('👨‍🏫 Super Admin getting class historical analytics:', classId);
        if (!classId) {
            return res.status(400).json({
                error: "Invalid request",
                details: "Class ID is required"
            });
        }
        const db = firebase_config_1.default.firestore();
        // Get last 30 days of analyzed data reports
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const historicalSnapshot = await db.collection('analyzedData')
            .where('timestamp', '>=', firebase_config_1.default.firestore.Timestamp.fromDate(thirtyDaysAgo))
            .orderBy('timestamp', 'asc')
            .get();
        if (historicalSnapshot.empty) {
            return res.status(200).json({
                data: [],
                message: "No historical data found for the last 30 days"
            });
        }
        const historicalData = historicalSnapshot.docs.map(doc => {
            const data = doc.data();
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
    }
    catch (error) {
        console.error('Error getting class historical analytics:', error);
        return res.status(500).json({
            error: "Failed to get class historical analytics data",
            details: error instanceof Error ? error.message : "Unknown error"
        });
    }
};
exports.getClassHistoricalAnalytics = getClassHistoricalAnalytics;
//# sourceMappingURL=super-admin.controller.js.map