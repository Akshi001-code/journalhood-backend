import { ZodError, ZodSchema } from "zod";
import { Request, Response, NextFunction } from "express";

type ReturnType = "params" | "query" | "body";

interface zValidatorProps {
  schema: ZodSchema;
  type: ReturnType;
}

export const zValidator = ({ schema, type }: zValidatorProps) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await schema.parse(req[type]);
      req[type] = data;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json(error.errors);
      }
    }
  };
};
