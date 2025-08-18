// @ts-nocheck
import { z } from "zod";
import { DEFAULT_PASSWORDS, ROLES } from "../config/app.config";

// Phone number regex that allows:
// - Optional + at start
// - 10-15 digits
// - Optional spaces, hyphens, or parentheses between numbers
const phoneRegex = /^\+?[\d\s-()]{10,15}$/;

// createSchoolAdminValidator
export const createSchoolAdminValidator = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  phone: z.string().regex(phoneRegex, "Phone number must be 10-15 digits with optional +, spaces, hyphens, or parentheses").optional(),
  districtId: z.string(),
  schoolId: z.string(),
});

// updateSchoolAdminValidator
export const updateSchoolAdminValidator = z.object({
  email: z.string().email().optional(),
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  districtId: z.string().optional(),
});

// schoolAdminParam
export const schoolAdminParam = z.object({
  uid: z.string(),
});

// School Validators
export const createSchoolValidator = z.object({
  name: z.string().min(2),
  districtId: z.string(),
});

export const updateSchoolValidator = z.object({
  name: z.string().min(2).optional(),
  adminId: z.string().optional(),
  status: z.enum(["active", "suspended"]).optional(),
});

export const schoolParam = z.object({
  schoolId: z.string(),
});

// Schools query validator
export const schoolsQueryValidator = z.object({
  districtId: z.string(),
});

export type TCreateSchoolAdmin = z.infer<typeof createSchoolAdminValidator>;
export type TSchoolAdminParam = z.infer<typeof schoolAdminParam>;
export type TUpdateSchoolAdmin = z.infer<typeof updateSchoolAdminValidator>;
export type TSchoolsQuery = z.infer<typeof schoolsQueryValidator>;
