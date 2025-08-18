import { z } from "zod";
export declare const createDiaryEntrySchema: z.ZodObject<{
    content: z.ZodString;
    emotion: z.ZodString;
    title: z.ZodString;
}, "strip", z.ZodTypeAny, {
    title?: string;
    content?: string;
    emotion?: string;
}, {
    title?: string;
    content?: string;
    emotion?: string;
}>;
export declare const updateDiaryEntrySchema: z.ZodEffects<z.ZodObject<{
    content: z.ZodOptional<z.ZodString>;
    emotion: z.ZodOptional<z.ZodString>;
    title: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    title?: string;
    content?: string;
    emotion?: string;
}, {
    title?: string;
    content?: string;
    emotion?: string;
}>, {
    title?: string;
    content?: string;
    emotion?: string;
}, {
    title?: string;
    content?: string;
    emotion?: string;
}>;
export declare const updateProfileSchema: z.ZodEffects<z.ZodObject<{
    displayName: z.ZodOptional<z.ZodString>;
    photoURL: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    displayName?: string;
    photoURL?: string;
}, {
    displayName?: string;
    photoURL?: string;
}>, {
    displayName?: string;
    photoURL?: string;
}, {
    displayName?: string;
    photoURL?: string;
}>;
