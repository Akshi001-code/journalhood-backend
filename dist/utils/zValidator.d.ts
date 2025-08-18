import { ZodSchema } from "zod";
import { Request, Response, NextFunction } from "express";
type ReturnType = "params" | "query" | "body";
interface zValidatorProps {
    schema: ZodSchema;
    type: ReturnType;
}
export declare const zValidator: ({ schema, type }: zValidatorProps) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
export {};
