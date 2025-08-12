import { z } from "zod";

export const mailValidator = z.object({
  firstname: z.string().min(1, "First name is required"),
  lastname: z.string().min(1, "Last name is required"),
  institutionName: z.string().min(1, "Institution name is required"),
  workEmail: z.string().email(),
  phone: z.string().min(1, "Phone number is required"),
  role: z.string().min(1, "Role is required"),
  numberOfStudents: z.string().min(1, "Number of students is required"),
  message: z.string().optional(),
});

export type TMailValidator = z.infer<typeof mailValidator>;
