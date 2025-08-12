import { z } from "zod";

export const createDiaryEntrySchema = z.object({
  content: z.string().min(1, "Content is required"),
  emotion: z.string().min(1, "Emotion is required"),
  title: z.string().min(1, "Title is required"),
});

export const updateDiaryEntrySchema = z.object({
  content: z.string().optional(),
  emotion: z.string().optional(),
  title: z.string().optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: "At least one field must be provided for update"
});

export const updateProfileSchema = z.object({
  displayName: z.string().min(1, "Display name is required").optional(),
  photoURL: z.string().url("Invalid photo URL").optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: "At least one field must be provided for update"
}); 