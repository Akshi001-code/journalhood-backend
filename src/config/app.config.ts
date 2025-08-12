import { UserRecord } from "firebase-admin/auth";
import admin from "./firebase.config";
import { configDotenv } from "dotenv";

configDotenv();

export enum ROLES {
  SUPER_ADMIN = "super-admin",
  DISTRICT_ADMIN = "district-admin",
  SCHOOL_ADMIN = "school-admin",
  TEACHER = "teacher",
  STUDENT = "student",
}

export const DEFAULT_PASSWORDS = {
  DISTRICT_ADMIN: process.env.DISTRICT_ADMIN_PASSWORD || "password123",
  SCHOOL_ADMIN: process.env.SCHOOL_ADMIN_PASSWORD || "password123",
  TEACHER: process.env.TEACHER_PASSWORD || "password123",
  STUDENT: process.env.STUDENT_PASSWORD || "password123",
};

export const createSuperAdmin = async () => {
  try {
    const user: UserRecord = await admin.auth().createUser({
      displayName: "Super Admin",
      email: process.env.ADMIN_EMAIL || "admin@journalhood.com",
      password: process.env.ADMIN_PASSWORD || "password123",
      emailVerified: false,
    });

    await admin.auth().setCustomUserClaims(user.uid, {
      role: ROLES.SUPER_ADMIN,
    });

    console.log("Super Admin Created Successfully");
  } catch (error: any) {
    if (error?.errorInfo.code === "auth/email-already-exists")
      console.log("Super Admin Already Exits");
  }
};
