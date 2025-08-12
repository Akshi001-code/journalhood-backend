import { DecodedIdToken } from "firebase-admin/auth";
import { ROLES } from "./config/app.config";

// Define our custom claims interface
interface CustomClaims {
  role: ROLES;
  districtId?: string;
  districtName?: string;
  schoolId?: string;
  schoolName?: string;
  classId?: string;
  className?: string;
  gradeId?: string;
  teacherId?: string;
  teacherName?: string;
}

// Resource Management Types
interface Resource {
  id: string;
  title: string;
  description?: string;
  url: string;
  type: 'link'; // future: 'file', 'video', etc.
  createdBy: string; // uid of creator
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'archived';
}

interface ResourceAssignment {
  id: string;
  resourceId: string;
  resourceTitle: string; // denormalized for efficiency
  resourceUrl: string; // denormalized for efficiency
  assignedBy: string; // uid of assigner
  assignedByRole: ROLES;
  assignedTo: string; // uid of recipient
  assignedToRole: ROLES;
  targetType: 'district' | 'school' | 'class' | 'student';
  targetId: string; // districtId, schoolId, classId, or studentId
  targetName?: string; // denormalized name
  assignedAt: Date;
  status: 'active' | 'archived';
  viewedAt?: Date; // when recipient first viewed
}

declare global {
  // DotEnv
  namespace NodeJS {
    interface ProcessEnv {
      // PORT
      PORT: string;

      // FRONTEND URL
      FRONTEND_URL?: string;

      // ADMIN CONFIG
      ADMIN_EMAIL: string;
      ADMIN_PASSWORD: string;

      // NODEMAILER CONFIG
      EMAIL: string;
      EMAIL_PASSWORD: string;

      // DEFAULT PASSWORDS
      DISTRICT_ADMIN_PASSWORD: string;
      SCHOOL_ADMIN_PASSWORD: string;
      TEACHER_PASSWORD: string;
      STUDENT_PASSWORD: string;

      // FIREBASE SERVICE ACCOUNT (optional - for production)
      FIREBASE_PROJECT_ID?: string;
      FIREBASE_PRIVATE_KEY?: string;
      FIREBASE_CLIENT_EMAIL?: string;
    }
  }

  // Request
  namespace Express {
    interface Request {
      user?: DecodedIdToken & {
        role: ROLES;
        customClaims: CustomClaims;
      };
    }
  }
}
