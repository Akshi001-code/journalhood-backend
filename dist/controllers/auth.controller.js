"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrentUser = void 0;
const firebase_config_1 = __importDefault(require("../config/firebase.config"));
// Get current user with role information
const getCurrentUser = async (req, res) => {
    try {
        const user = req.user; // This comes from verifyToken middleware
        if (!user?.uid) {
            return res.status(401).json({
                error: "Unauthorized - No user found",
            });
        }
        // Get user record from Firebase Admin to get custom claims and other info
        const userRecord = await firebase_config_1.default.auth().getUser(user.uid);
        // Format user data according to your User interface
        const userData = {
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
            const classesSnapshot = await firebase_config_1.default.firestore()
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
    }
    catch (error) {
        console.error("Error getting current user:", error);
        return res.status(500).json({
            error: "Internal Server Error",
        });
    }
};
exports.getCurrentUser = getCurrentUser;
//# sourceMappingURL=auth.controller.js.map