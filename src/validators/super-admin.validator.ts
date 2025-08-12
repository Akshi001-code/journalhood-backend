import { z } from "zod";
import { DEFAULT_PASSWORDS, ROLES } from "../config/app.config";

// phoneRegex
const phoneRegex: RegExp = new RegExp(
  /^([+]?[\s0-9]+)?(\d{3}|[(]?[0-9]+[)])?([-]?[\s]?[0-9])+$/
);

// createDistrictAdminValidator
export const createDistrictAdminValidator = z.object({
  email: z.string().email(),
  name: z.string().min(1, "Name is required"),
  phone: z.string()
    .optional()
    .refine((val) => {
      if (!val || val === "") return true; // Allow empty or undefined
      return phoneRegex.test(val);
    }, {
      message: "Invalid phone number",
    }),
  districtId: z.string().min(1, "District ID is required"),
  password: z
    .string()
    .optional()
    .transform((_) => DEFAULT_PASSWORDS.DISTRICT_ADMIN),
  role: z
    .string()
    .optional()
    .transform((_) => ROLES.DISTRICT_ADMIN),
});

// createMutlipleDistrictAdminsValidator
export const createMutlipleDistrictAdminsValidator = z
  .array(createDistrictAdminValidator)
  .min(1, "At least one district admin is required");

// updateDistrictAdminValidator
export const updateDistrictAdminValidator = createDistrictAdminValidator.omit({
  password: true,
  role: true,
});

// districtAdminParam
export const districtAdminParam = z.object({
  uid: z.string().min(1, "District admin id is required"),
});

// createDistrictValidator
export const createDistrictValidator = z.object({
  name: z.string().min(1, "District name is required"),
  country: z.string().min(1, "Country is required"),
});

// updateDistrictValidator
export const updateDistrictValidator = createDistrictValidator;

// districtParam
export const districtParam = z.object({
  id: z.string().min(1, "District id is required"),
});

// School Management Validators

// createSchoolValidator for super admin
export const createSchoolBySuperAdminValidator = z.object({
  name: z.string().min(1, "School name is required"),
  address: z.string().optional(),
  zipCode: z.string().optional(),
  districtId: z.string().optional(),
  adminName: z.string().optional(),
  adminEmail: z.string().email().optional().or(z.literal("")),
  contactPhone: z.string().optional(),
});

// Resource Management Validators
export const createResourceValidator = z.object({
  title: z.string().min(1, "Resource title is required"),
  description: z.string().optional(),
  url: z.string().url("Please provide a valid URL"),
  type: z.literal("link"), // Future: z.enum(["link", "file", "video"])
  category: z.enum(["depression", "bullying", "introvert", "language_problem"], {
    required_error: "Category is required",
    invalid_type_error: "Invalid category selected"
  }),
});

export const updateResourceValidator = z.object({
  title: z.string().min(1, "Resource title is required").optional(),
  description: z.string().optional(),
  url: z.string().url("Please provide a valid URL").optional(),
  status: z.enum(["active", "archived"]).optional(),
  category: z.enum(["depression", "bullying", "introvert", "language_problem"]).optional(),
});

export const assignResourceValidator = z.object({
  resourceId: z.string().min(1, "Resource ID is required"),
  assignedTo: z.string().min(1, "Assigned to user ID is required"),
  assignedToRole: z.enum(["district-admin", "school-admin", "teacher"]),
  targetType: z.enum(["district", "school", "class"]),
  targetId: z.string().min(1, "Target ID is required"),
  targetName: z.string().optional(),
});

// updateSchoolValidator for super admin
export const updateSchoolBySuperAdminValidator = z.object({
  name: z.string().min(1, "School name is required").optional(),
  address: z.string().optional(),
  zipCode: z.string().optional(),
});

// schoolParam
export const schoolParam = z.object({
  id: z.string().min(1, "School id is required"),
});

// assignSchoolToDistrictValidator
export const assignSchoolToDistrictValidator = z.object({
  schoolId: z.string().min(1, "School ID is required"),
  districtId: z.string().min(1, "District ID is required"),
});

// unassignSchoolFromDistrictValidator
export const unassignSchoolFromDistrictValidator = z.object({
  schoolId: z.string().min(1, "School ID is required"),
});

export type TCreateDistrictAdmin = z.infer<typeof createDistrictAdminValidator>;
export type TDistrictAdminParam = z.infer<typeof districtAdminParam>;
export type TUpdateDistrictAdmin = z.infer<typeof updateDistrictAdminValidator>;
export type TMultipleDistrictAdminCreationSchema = z.infer<
  typeof createMutlipleDistrictAdminsValidator
>;
export type TCreateDistrict = z.infer<typeof createDistrictValidator>;
export type TUpdateDistrict = z.infer<typeof updateDistrictValidator>;
export type TDistrictParam = z.infer<typeof districtParam>;

// School Management Types
export type TCreateSchoolBySuperAdmin = z.infer<typeof createSchoolBySuperAdminValidator>;
export type TUpdateSchoolBySuperAdmin = z.infer<typeof updateSchoolBySuperAdminValidator>;
export type TSchoolParam = z.infer<typeof schoolParam>;
export type TAssignSchoolToDistrict = z.infer<typeof assignSchoolToDistrictValidator>;
export type TUnassignSchoolFromDistrict = z.infer<typeof unassignSchoolFromDistrictValidator>;
