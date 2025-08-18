// @ts-nocheck
import { z } from "zod";
import { DEFAULT_PASSWORDS, ROLES } from "../config/app.config";

// phoneRegex
const phoneRegex: RegExp = new RegExp(
  /^([+]?[\s0-9]+)?(\d{3}|[(]?[0-9]+[)])?([-]?[\s]?[0-9])+$/
);

// addGradesAndDivisionsValidator
export const addGradesAndDivisionsValidator = z.object({
  gradeId: z.string().min(1, "Grade is required"),
  divisionCount: z.number().min(1, "At least one division is required"),
  divisionNames: z
    .array(z.string())
    .min(1, "At least one division is required"),
});

// updateGradesAndDivisionsValidator
export const updateGradesAndDivisionsValidator =
  addGradesAndDivisionsValidator.omit({
    gradeId: true,
  });

// gradeIdParam
export const gradeIdParam = z.object({
  gradeId: z.string().min(1, "Grade is required"),
});

export const createTeacherValidator = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email(),
  phone: z.string().regex(phoneRegex, {
    message: "Invalid phone number",
  }).optional(),
  gradeId: z.string().optional(),
  gradeName: z.string().optional(),
  division: z.string().optional(),
});

export const updateTeacherValidator = createTeacherValidator.omit({
  password: true,
  role: true,
});

export const teacherIdParam = z.object({
  uid: z.string().min(1, "Teacher id is required"),
});

// types
export type TAddGradesAndDivisions = z.infer<
  typeof addGradesAndDivisionsValidator
>;
export type TGradeIdParam = z.infer<typeof gradeIdParam>;
export type TUpdateGradesAndDivisions = z.infer<
  typeof updateGradesAndDivisionsValidator
>;
export type TCreateTeacher = z.infer<typeof createTeacherValidator>;
export type TUpdateTeacher = z.infer<typeof updateTeacherValidator>;
export type TTeacherIdParam = z.infer<typeof teacherIdParam>;

// Class Management
export const createClassSchema = z.object({
  gradeName: z.string().min(1, "Grade name is required"),
  division: z.string().min(1, "Division is required").max(1, "Division must be a single letter"),
  maxStudents: z.number().min(1, "Maximum students must be at least 1").max(50, "Maximum students cannot exceed 50"),
  schoolId: z.string().min(1, "School ID is required"),
})

export const updateClassSchema = createClassSchema.partial().extend({
  teacherId: z.string().optional(),
  teacherName: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
})

export const classParamSchema = z.object({
  classId: z.string().min(1, "Class ID is required"),
})

export type TCreateClass = z.infer<typeof createClassSchema>
export type TUpdateClass = z.infer<typeof updateClassSchema>
export type TClassParam = z.infer<typeof classParamSchema>
