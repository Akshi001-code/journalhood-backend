// @ts-nocheck
import { Request, Response } from "express";
import { TCreateClass, TUpdateClass, TClassParam } from "../validators/school-admin.validator";
import admin from "../config/firebase.config";
import { Timestamp } from "firebase-admin/firestore";
import { ROLES } from "../config/app.config";

// Helper function to ensure school exists
const ensureSchoolExists = async (schoolId: string): Promise<boolean> => {
  try {
    console.log("🔍 ensureSchoolExists called with schoolId:", schoolId);
    
    // Check if school exists
    let schoolDoc = await admin.firestore().collection("schools").doc(schoolId).get();
    console.log("📋 School document exists:", schoolDoc.exists);
    
    if (!schoolDoc.exists) {
      console.log("🏫 School document not found, trying to create from user claims...");
      // If school doesn't exist, try to get the school admin user info and create the school
      const userRecord = await admin.auth().getUser(schoolId);
      const customClaims = userRecord.customClaims || {};
      console.log("👤 User claims:", customClaims);
      
      if (customClaims.role === 'school-admin') {
        // Create school document for this school admin
        await admin.firestore().collection("schools").doc(schoolId).set({
          name: customClaims.schoolName || userRecord.displayName || 'Unknown School',
          districtId: customClaims.districtId || '',
          adminId: schoolId,
          adminName: userRecord.displayName || '',
          adminEmail: userRecord.email || '',
          status: "active",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`Auto-created school document for school admin: ${schoolId}`);
        return true;
      }
      console.log("❌ User is not a school admin, returning false");
      return false;
    }
    console.log("✅ School document exists, returning true");
    return true;
  } catch (error) {
    console.error("Error in ensureSchoolExists:", error);
    return false;
  }
};

// Create a new class
export const createClass = async (req: Request, res: Response) => {
  try {
    const { gradeName, division, maxStudents, schoolId } = req.body as TCreateClass;

    // Ensure school exists
    const schoolExists = await ensureSchoolExists(schoolId);
    if (!schoolExists) {
      return res.status(404).json({ message: "School not found" });
    }

    // Check if class with same grade and division already exists
    const existingClass = await admin
      .firestore()
      .collection("classes")
      .where("schoolId", "==", schoolId)
      .where("gradeName", "==", gradeName)
      .where("division", "==", division)
      .get();

    if (!existingClass.empty) {
      return res.status(400).json({ 
        message: `Class with grade ${gradeName} and division ${division} already exists` 
      });
    }

    // Create class in Firestore
    const docRef = await admin.firestore().collection("classes").add({
      gradeName,
      division,
      maxStudents,
      schoolId,
      studentCount: 0,
      status: "active",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(201).json({
      message: "Class created successfully",
      classId: docRef.id,
    });
  } catch (error) {
    console.error("Error creating class:", error);
    res.status(500).json({ message: "Failed to create class. Please try again." });
  }
};

interface FirestoreClassData {
  gradeName?: string;
  division?: string;
  teacherId?: string;
  teacherName?: string;
  studentCount?: number;
  maxStudents?: number;
  status?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// Get all classes for a school
export const getClasses = async (req: Request, res: Response) => {
  try {
    const schoolId = req.query.schoolId as string;
    console.log("🔍 getClasses called with schoolId:", schoolId);
    
    if (!schoolId) {
      return res.status(400).json({ message: "School ID is required" });
    }

    // Check user has access to this school
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: "Unauthorized - User not found" });
    }

    // Get user's role and claims
    const userRole = user.role;
    const userClaims = user.customClaims || {};

    console.log("👤 User access check:", {
      role: userRole,
      requestedSchool: schoolId,
      userSchoolId: userClaims.schoolId,
      userDistrictId: userClaims.districtId
    });

    // Verify user has access to this school
    if (userRole === ROLES.SCHOOL_ADMIN && userClaims.schoolId !== schoolId) {
      return res.status(403).json({ message: "Unauthorized - Invalid school access" });
    }

    // For district admin, verify the school belongs to their district
    if (userRole === ROLES.DISTRICT_ADMIN) {
      // Get school's district
      const schoolDoc = await admin.firestore().collection("schools").doc(schoolId).get();
      const schoolData = schoolDoc.data();
      if (!schoolData || schoolData.districtId !== userClaims.districtId) {
        return res.status(403).json({ message: "Unauthorized - School not in your district" });
      }
    }

    // Ensure school exists
    const schoolExists = await ensureSchoolExists(schoolId);
    console.log("🏫 School exists:", schoolExists);
    if (!schoolExists) {
      return res.status(404).json({ message: "School not found" });
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
      const data = doc.data() as FirestoreClassData;
      const defaultClass = {
        id: doc.id,
        gradeName: '',
        division: '',
        teacherId: '',
        teacherName: '',
        studentCount: 0,
        maxStudents: 25,
        status: 'active' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      return {
        ...defaultClass,
        id: doc.id,
        gradeName: data.gradeName || defaultClass.gradeName,
        division: data.division || defaultClass.division,
        teacherId: data.teacherId || defaultClass.teacherId,
        teacherName: data.teacherName || defaultClass.teacherName,
        studentCount: typeof data.studentCount === 'number' ? data.studentCount : defaultClass.studentCount,
        maxStudents: typeof data.maxStudents === 'number' ? data.maxStudents : defaultClass.maxStudents,
        status: data.status || defaultClass.status,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : defaultClass.createdAt,
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : defaultClass.updatedAt
      };
    });

    // Set cache headers for 1 minute
    res.set('Cache-Control', 'public, max-age=60');

    res.status(200).json({ 
      classes,
      total: classes.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error getting classes:", error);
    res.status(500).json({ 
      message: "Failed to get classes. Please try again.",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

// Update a class
export const updateClass = async (req: Request, res: Response) => {
  try {
    const { classId } = req.params as TClassParam;
    const updateData = req.body as TUpdateClass;

    // Validate class exists
    const classDoc = await admin.firestore().collection("classes").doc(classId).get();
    if (!classDoc.exists) {
      return res.status(404).json({ message: "Class not found" });
    }

    // If updating grade/division, check for conflicts
    if (updateData.gradeName && updateData.division) {
      const classData = classDoc.data();
      if (!classData || !classData.schoolId) {
        return res.status(500).json({ message: "Failed to get class data" });
      }

      const existingClass = await admin
        .firestore()
        .collection("classes")
        .where("schoolId", "==", classData.schoolId)
        .where("gradeName", "==", updateData.gradeName)
        .where("division", "==", updateData.division)
        .get();

      if (!existingClass.empty && existingClass.docs[0].id !== classId) {
        return res.status(400).json({ 
          message: `Class with grade ${updateData.gradeName} and division ${updateData.division} already exists` 
        });
      }
    }

    // Update class in Firestore
    await admin.firestore().collection("classes").doc(classId).update({
      ...updateData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(200).json({ message: "Class updated successfully" });
  } catch (error) {
    console.error("Error updating class:", error);
    res.status(500).json({ message: "Failed to update class. Please try again." });
  }
};

interface ClassData {
  teacherId?: string;
  studentCount: number;
  gradeName: string;
  division: string;
}

interface TeacherCustomClaims {
  gradeId?: string;
  gradeName?: string;
  division?: string;
  role?: string;
}

// Delete a class
export const deleteClass = async (req: Request, res: Response) => {
  try {
    const { classId } = req.params as TClassParam;

    // Validate class exists
    const classRef = admin.firestore().collection("classes").doc(classId);
    const classDoc = await classRef.get();
    
    if (!classDoc.exists) {
      return res.status(404).json({ message: "Class not found" });
    }

    const classData = classDoc.data() as ClassData | undefined;
    if (!classData) {
      return res.status(500).json({ message: "Failed to get class data" });
    }

    // Check if class has students
    if (typeof classData.studentCount === 'number' && classData.studentCount > 0) {
      return res.status(400).json({ 
        message: "Cannot delete class with enrolled students. Please remove all students first." 
      });
    }

    // If class has a teacher assigned, update teacher's custom claims
    const teacherId = classData.teacherId;
    if (teacherId) {
      try {
        const teacher = await admin.auth().getUser(teacherId);
        const customClaims = (teacher.customClaims || {}) as TeacherCustomClaims;
        
        // Only update if this is the teacher's current class
        if (customClaims.gradeId === classId) {
          await admin.auth().setCustomUserClaims(teacherId, {
            ...customClaims,
            gradeId: '',
            gradeName: '',
            division: ''
          });
        }
      } catch (error) {
        console.error("Error updating teacher claims:", error);
        // Continue with deletion even if updating teacher fails
      }
    }

    // Delete class from Firestore
    await classRef.delete();

    res.status(200).json({ message: "Class deleted successfully" });
  } catch (error) {
    console.error("Error deleting class:", error);
    if (error instanceof Error) {
      res.status(500).json({ message: error.message || "Failed to delete class. Please try again." });
    } else {
      res.status(500).json({ message: "Failed to delete class. Please try again." });
    }
  }
};

// Assign teacher to class
export const assignTeacher = async (req: Request, res: Response) => {
  try {
    const { classId } = req.params as TClassParam;
    const { teacherId, teacherName } = req.body;

    if (!teacherId || !teacherName) {
      return res.status(400).json({ message: "Teacher ID and name are required" });
    }

    // Validate class exists
    const classDoc = await admin.firestore().collection("classes").doc(classId).get();
    if (!classDoc.exists) {
      return res.status(404).json({ message: "Class not found" });
    }

    // Get class data
    const classData = classDoc.data() as { 
      teacherId?: string; 
      gradeName: string; 
      division: string;
      schoolId: string;
    } | undefined;
    
    if (!classData) {
      return res.status(500).json({ message: "Failed to get class data" });
    }

    // Validate teacher exists and get their data
    const teacherDoc = await admin.auth().getUser(teacherId).catch(() => {
      return null;
    });
    
    if (!teacherDoc) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    // Check if teacher is already assigned to another class
    const existingTeacherClass = await admin.firestore()
      .collection("classes")
      .where("teacherId", "==", teacherId)
      .get();

    if (!existingTeacherClass.empty && existingTeacherClass.docs[0].id !== classId) {
      return res.status(400).json({ 
        message: "This teacher is already assigned to another class. A teacher can only be assigned to one class." 
      });
    }

    // Check if class already has a different teacher
    if (classData.teacherId && classData.teacherId !== teacherId) {
      return res.status(400).json({ 
        message: "This class already has a teacher assigned. A class can only have one teacher." 
      });
    }

    // Update teacher's custom claims with class information
    const currentClaims = teacherDoc.customClaims || {};
    await admin.auth().setCustomUserClaims(teacherId, {
      ...currentClaims,
      gradeId: classId, // Using classId as gradeId since it's unique
      gradeName: classData.gradeName,
      division: classData.division,
      schoolId: classData.schoolId,
      role: 'teacher'
    });

    // Update class with teacher information
    await admin.firestore().collection("classes").doc(classId).update({
      teacherId,
      teacherName,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(200).json({ 
      message: "Teacher assigned to class successfully",
      teacherClaims: {
        gradeId: classId,
        gradeName: classData.gradeName,
        division: classData.division
      }
    });
  } catch (error) {
    console.error("Error assigning teacher:", error);
    res.status(500).json({ message: "Failed to assign teacher. Please try again." });
  }
}; 