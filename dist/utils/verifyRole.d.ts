import { Request, Response, NextFunction } from "express";
export declare const verifyRole: (allowedRoles: string[]) => (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
