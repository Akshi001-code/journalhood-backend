"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDiaryBackupEntries = exports.updateStudentProfile = exports.getStudentProfile = exports.deleteDiaryEntry = exports.updateDiaryEntry = exports.createDiaryEntry = exports.getDiaryEntries = void 0;
const firebase_config_1 = __importDefault(require("../config/firebase.config"));
// Get student's diary entries
const getDiaryEntries = async (req, res) => {
    try {
        const user = req.user;
        if (!user?.uid) {
            return res.status(401).json({
                error: "Unauthorized - No user found",
            });
        }
        const uid = user.uid; // Store uid to ensure it's not undefined
        const entriesSnapshot = await firebase_config_1.default.firestore()
            .collection('diaryEntries') // Changed from diaryEntriesBackup
            .doc(uid)
            .collection('entries')
            .orderBy('timestamp', 'desc')
            .get();
        const entries = entriesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate(),
        }));
        return res.status(200).json(entries);
    }
    catch (error) {
        console.error("Error getting diary entries:", error);
        return res.status(500).json({
            error: "Internal Server Error",
        });
    }
};
exports.getDiaryEntries = getDiaryEntries;
// Create a new diary entry
const createDiaryEntry = async (req, res) => {
    try {
        const user = req.user;
        if (!user?.uid) {
            return res.status(401).json({
                error: "Unauthorized - No user found",
            });
        }
        const { content, emotion, title } = req.body;
        if (!content || !emotion || !title) {
            return res.status(400).json({
                error: "Missing required fields",
            });
        }
        const uid = user.uid; // Store uid to ensure it's not undefined
        // Parse content as JSON if it's a string
        let parsedContent;
        try {
            parsedContent = typeof content === 'string' ? JSON.parse(content) : content;
        }
        catch (error) {
            console.error("Error parsing content:", error);
            return res.status(400).json({
                error: "Invalid content format - must be a valid JSON string or array",
            });
        }
        const entryData = {
            title: title,
            emotion: emotion,
            content: parsedContent,
            timestamp: firebase_config_1.default.firestore.FieldValue.serverTimestamp(),
        };
        // Save to main diaryEntries collection
        const mainDocRef = await firebase_config_1.default.firestore()
            .collection('diaryEntries')
            .doc(uid)
            .collection('entries')
            .add(entryData);
        // Also save to backup collection for analysis
        const backupDocRef = await firebase_config_1.default.firestore()
            .collection('diaryEntriesBackup')
            .doc(uid)
            .collection('entries')
            .doc(mainDocRef.id) // Use same ID as main entry
            .set(entryData);
        const entryDoc = await mainDocRef.get();
        const entry = {
            id: entryDoc.id,
            ...entryDoc.data(),
            timestamp: entryDoc.data()?.timestamp?.toDate(),
        };
        return res.status(201).json(entry);
    }
    catch (error) {
        console.error("Error creating diary entry:", error);
        return res.status(500).json({
            error: "Internal Server Error",
        });
    }
};
exports.createDiaryEntry = createDiaryEntry;
// Update a diary entry
const updateDiaryEntry = async (req, res) => {
    try {
        const user = req.user;
        if (!user?.uid) {
            return res.status(401).json({
                error: "Unauthorized - No user found",
            });
        }
        const { entryId } = req.params;
        const { content, emotion, title } = req.body;
        if (!content && !emotion && !title) {
            return res.status(400).json({
                error: "No fields to update",
            });
        }
        if (!entryId) {
            return res.status(400).json({
                error: "Entry ID is required",
            });
        }
        const uid = user.uid;
        // Get refs to both collections
        const mainEntryRef = firebase_config_1.default.firestore()
            .collection('diaryEntries')
            .doc(uid)
            .collection('entries')
            .doc(entryId);
        const backupEntryRef = firebase_config_1.default.firestore()
            .collection('diaryEntriesBackup')
            .doc(uid)
            .collection('entries')
            .doc(entryId);
        // Check if entry exists in main collection
        const mainEntryDoc = await mainEntryRef.get();
        if (!mainEntryDoc.exists) {
            return res.status(404).json({
                error: "Entry not found",
            });
        }
        const updateData = {
            timestamp: firebase_config_1.default.firestore.FieldValue.serverTimestamp(),
        };
        if (content) {
            try {
                updateData.content = typeof content === 'string' ? JSON.parse(content) : content;
            }
            catch (error) {
                console.error("Error parsing content:", error);
                return res.status(400).json({
                    error: "Invalid content format - must be a valid JSON string or array",
                });
            }
        }
        if (emotion)
            updateData.emotion = emotion;
        if (title)
            updateData.title = title;
        // Update both collections
        await Promise.all([
            mainEntryRef.update(updateData),
            backupEntryRef.update(updateData)
        ]);
        const updatedDoc = await mainEntryRef.get();
        const updatedEntry = {
            id: updatedDoc.id,
            ...updatedDoc.data(),
            timestamp: updatedDoc.data()?.timestamp?.toDate(),
        };
        return res.status(200).json(updatedEntry);
    }
    catch (error) {
        console.error("Error updating diary entry:", error);
        return res.status(500).json({
            error: "Internal Server Error",
        });
    }
};
exports.updateDiaryEntry = updateDiaryEntry;
// Delete a diary entry
const deleteDiaryEntry = async (req, res) => {
    try {
        const user = req.user;
        if (!user?.uid) {
            return res.status(401).json({
                error: "Unauthorized - No user found",
            });
        }
        const { entryId } = req.params;
        if (!entryId) {
            return res.status(400).json({
                error: "Entry ID is required",
            });
        }
        const uid = user.uid;
        // Delete from both collections
        await Promise.all([
            firebase_config_1.default.firestore()
                .collection('diaryEntries')
                .doc(uid)
                .collection('entries')
                .doc(entryId)
                .delete(),
            firebase_config_1.default.firestore()
                .collection('diaryEntriesBackup')
                .doc(uid)
                .collection('entries')
                .doc(entryId)
                .delete()
        ]);
        return res.status(200).json({
            message: "Entry deleted successfully",
        });
    }
    catch (error) {
        console.error("Error deleting diary entry:", error);
        return res.status(500).json({
            error: "Internal Server Error",
        });
    }
};
exports.deleteDiaryEntry = deleteDiaryEntry;
// Get student profile
const getStudentProfile = async (req, res) => {
    try {
        const user = req.user;
        if (!user?.uid) {
            return res.status(401).json({
                error: "Unauthorized - No user found",
            });
        }
        const userRecord = await firebase_config_1.default.auth().getUser(user.uid);
        const userDoc = await firebase_config_1.default.firestore().collection('users').doc(user.uid).get();
        const profile = {
            id: userRecord.uid,
            email: userRecord.email,
            displayName: userRecord.displayName,
            photoURL: userRecord.photoURL,
            schoolId: userRecord.customClaims?.schoolId,
            schoolName: userRecord.customClaims?.schoolName,
            gradeId: userRecord.customClaims?.gradeId,
            gradeName: userRecord.customClaims?.gradeName,
            division: userRecord.customClaims?.division,
            ...userDoc.data(),
        };
        return res.status(200).json(profile);
    }
    catch (error) {
        console.error("Error getting student profile:", error);
        return res.status(500).json({
            error: "Internal Server Error",
        });
    }
};
exports.getStudentProfile = getStudentProfile;
// Update student profile
const updateStudentProfile = async (req, res) => {
    try {
        const user = req.user;
        if (!user?.uid) {
            return res.status(401).json({
                error: "Unauthorized - No user found",
            });
        }
        const { displayName, photoURL } = req.body;
        const updateData = {};
        if (displayName) {
            await firebase_config_1.default.auth().updateUser(user.uid, { displayName });
            updateData.displayName = displayName;
        }
        if (photoURL) {
            await firebase_config_1.default.auth().updateUser(user.uid, { photoURL });
            updateData.photoURL = photoURL;
        }
        if (Object.keys(updateData).length > 0) {
            await firebase_config_1.default.firestore().collection('users').doc(user.uid).set(updateData, { merge: true });
        }
        return res.status(200).json({
            message: "Profile updated successfully",
            updates: updateData,
        });
    }
    catch (error) {
        console.error("Error updating student profile:", error);
        return res.status(500).json({
            error: "Internal Server Error",
        });
    }
};
exports.updateStudentProfile = updateStudentProfile;
// Get diary backup entries
const getDiaryBackupEntries = async (req, res) => {
    try {
        // First check if the diaryEntriesBackup collection exists and has any documents
        const backupDocsSnapshot = await firebase_config_1.default.firestore()
            .collection('diaryEntriesBackup')
            .listDocuments();
        console.log(`Found ${backupDocsSnapshot.length} documents in diaryEntriesBackup collection`);
        console.log('Document IDs:', backupDocsSnapshot.map(doc => doc.id));
        // Try to directly access the entries subcollection for the known user ID
        const userId = '58ldfxyKcjafn57hbheEaz1Oq5z2';
        console.log(`\nTrying to access entries for known user: ${userId}`);
        const entriesRef = firebase_config_1.default.firestore()
            .collection('diaryEntriesBackup')
            .doc(userId)
            .collection('entries')
            .orderBy('timestamp', 'desc');
        // Get the actual entries
        const entriesSnapshot = await entriesRef.get();
        console.log('Number of entries found:', entriesSnapshot.docs.length);
        let allEntries = [];
        const studentData = {};
        // Get user data
        const userDoc = await firebase_config_1.default.firestore()
            .collection('users')
            .doc(userId)
            .get();
        const userData = userDoc.exists ? userDoc.data() : null;
        // Create student data with defaults for missing fields
        studentData[userId] = {
            id: userId,
            name: 'Anonymous Student',
            email: '',
            role: 'student',
            schoolId: '',
            schoolName: '',
            gradeId: '',
            gradeName: '',
            division: ''
        };
        // Process entries if we found any
        if (entriesSnapshot.docs.length > 0) {
            const studentEntries = entriesSnapshot.docs.map(doc => {
                const entryData = doc.data();
                // Convert Firestore Timestamp to ISO string for better JSON serialization
                const timestamp = entryData.timestamp?.toDate?.() || new Date();
                return {
                    id: doc.id,
                    studentId: userId,
                    student: studentData[userId],
                    title: entryData.title || 'Untitled Entry',
                    content: entryData.content || [],
                    emotion: entryData.emotion || 'Unknown',
                    timestamp: timestamp.toISOString()
                };
            });
            allEntries = [...allEntries, ...studentEntries];
        }
        console.log(`\nFinal counts:`);
        console.log(`Total entries found: ${allEntries.length}`);
        console.log(`Total students processed: ${Object.keys(studentData).length}`);
        // No need to sort since we used orderBy in the query
        return res.status(200).json({
            entries: allEntries,
            students: Object.values(studentData),
            totalEntries: allEntries.length,
            totalStudents: Object.keys(studentData).length
        });
    }
    catch (error) {
        console.error("Error getting diary backup entries:", error);
        console.error("Error details:", error?.message || 'Unknown error');
        if (error?.stack)
            console.error("Stack trace:", error.stack);
        return res.status(500).json({
            error: "Internal Server Error",
            message: error?.message || 'Unknown error'
        });
    }
};
exports.getDiaryBackupEntries = getDiaryBackupEntries;
//# sourceMappingURL=student.controller.js.map