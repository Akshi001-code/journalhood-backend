// @ts-nocheck
import { Request, Response } from "express";
import admin from "../config/firebase.config";

// Get student's diary entries
export const getDiaryEntries = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user?.uid) {
      return res.status(401).json({
        error: "Unauthorized - No user found",
      });
    }

    const uid = user.uid; // Store uid to ensure it's not undefined
    const entriesSnapshot = await admin.firestore()
      .collection('diaryEntries')  // Changed from diaryEntriesBackup
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
  } catch (error) {
    console.error("Error getting diary entries:", error);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

// Create a new diary entry
export const createDiaryEntry = async (req: Request, res: Response) => {
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
    } catch (error) {
      console.error("Error parsing content:", error);
      return res.status(400).json({
        error: "Invalid content format - must be a valid JSON string or array",
      });
    }

    const entryData = {
      title: title as string,
      emotion: emotion as string,
      content: parsedContent,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Save to main diaryEntries collection
    const mainDocRef = await admin.firestore()
      .collection('diaryEntries')
      .doc(uid)
      .collection('entries')
      .add(entryData);

    // Also save to backup collection for analysis
    const backupDocRef = await admin.firestore()
      .collection('diaryEntriesBackup')
      .doc(uid)
      .collection('entries')
      .doc(mainDocRef.id)  // Use same ID as main entry
      .set(entryData);

    const entryDoc = await mainDocRef.get();
    const entry = {
      id: entryDoc.id,
      ...entryDoc.data(),
      timestamp: entryDoc.data()?.timestamp?.toDate(),
    };

    return res.status(201).json(entry);
  } catch (error) {
    console.error("Error creating diary entry:", error);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

// Update a diary entry
export const updateDiaryEntry = async (req: Request, res: Response) => {
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
    const mainEntryRef = admin.firestore()
      .collection('diaryEntries')
      .doc(uid)
      .collection('entries')
      .doc(entryId as string);

    const backupEntryRef = admin.firestore()
      .collection('diaryEntriesBackup')
      .doc(uid)
      .collection('entries')
      .doc(entryId as string);

    // Check if entry exists in main collection
    const mainEntryDoc = await mainEntryRef.get();
    if (!mainEntryDoc.exists) {
      return res.status(404).json({
        error: "Entry not found",
      });
    }

    const updateData: any = {
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (content) {
      try {
        updateData.content = typeof content === 'string' ? JSON.parse(content) : content;
      } catch (error) {
        console.error("Error parsing content:", error);
        return res.status(400).json({
          error: "Invalid content format - must be a valid JSON string or array",
        });
      }
    }
    if (emotion) updateData.emotion = emotion as string;
    if (title) updateData.title = title as string;

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
  } catch (error) {
    console.error("Error updating diary entry:", error);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

// Delete a diary entry
export const deleteDiaryEntry = async (req: Request, res: Response) => {
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
      admin.firestore()
        .collection('diaryEntries')
        .doc(uid)
        .collection('entries')
        .doc(entryId as string)
        .delete(),
      admin.firestore()
        .collection('diaryEntriesBackup')
        .doc(uid)
        .collection('entries')
        .doc(entryId as string)
        .delete()
    ]);

    return res.status(200).json({
      message: "Entry deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting diary entry:", error);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

// Get student profile
export const getStudentProfile = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user?.uid) {
      return res.status(401).json({
        error: "Unauthorized - No user found",
      });
    }

    const userRecord = await admin.auth().getUser(user.uid);
    const userDoc = await admin.firestore().collection('users').doc(user.uid).get();

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
  } catch (error) {
    console.error("Error getting student profile:", error);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

// Update student profile
export const updateStudentProfile = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user?.uid) {
      return res.status(401).json({
        error: "Unauthorized - No user found",
      });
    }

    const { displayName, photoURL } = req.body;
    const updateData: any = {};

    if (displayName) {
      await admin.auth().updateUser(user.uid, { displayName });
      updateData.displayName = displayName;
    }

    if (photoURL) {
      await admin.auth().updateUser(user.uid, { photoURL });
      updateData.photoURL = photoURL;
    }

    if (Object.keys(updateData).length > 0) {
      await admin.firestore().collection('users').doc(user.uid).set(updateData, { merge: true });
    }

    return res.status(200).json({
      message: "Profile updated successfully",
      updates: updateData,
    });
  } catch (error) {
    console.error("Error updating student profile:", error);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

interface StudentData {
  id: string;
  name: string;
  email: string;
  role: string;
  schoolId?: string;
  schoolName?: string;
  gradeId?: string;
  gradeName?: string;
  division?: string;
}

interface DiaryEntry {
  id: string;
  studentId: string;
  student?: StudentData;
  title: string;
  content: any[];
  emotion: string;
  timestamp: string;
}

// Get diary backup entries
export const getDiaryBackupEntries = async (req: Request, res: Response) => {
  try {
    // First check if the diaryEntriesBackup collection exists and has any documents
    const backupDocsSnapshot = await admin.firestore()
      .collection('diaryEntriesBackup')
      .listDocuments();

    console.log(`Found ${backupDocsSnapshot.length} documents in diaryEntriesBackup collection`);
    console.log('Document IDs:', backupDocsSnapshot.map(doc => doc.id));

    // Try to directly access the entries subcollection for the known user ID
    const userId = '58ldfxyKcjafn57hbheEaz1Oq5z2';
    console.log(`\nTrying to access entries for known user: ${userId}`);

    const entriesRef = admin.firestore()
      .collection('diaryEntriesBackup')
      .doc(userId)
      .collection('entries')
      .orderBy('timestamp', 'desc');

    // Get the actual entries
    const entriesSnapshot = await entriesRef.get();
    console.log('Number of entries found:', entriesSnapshot.docs.length);

    let allEntries: DiaryEntry[] = [];
    const studentData: { [key: string]: StudentData } = {};

    // Get user data
    const userDoc = await admin.firestore()
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
        } as DiaryEntry;
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

  } catch (error: any) {
    console.error("Error getting diary backup entries:", error);
    console.error("Error details:", error?.message || 'Unknown error');
    if (error?.stack) console.error("Stack trace:", error.stack);
    return res.status(500).json({
      error: "Internal Server Error",
      message: error?.message || 'Unknown error'
    });
  }
}; 