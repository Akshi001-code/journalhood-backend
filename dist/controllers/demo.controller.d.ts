import { Request, Response } from "express";
export declare const createDemoRequest: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getDemoRequests: (_req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getInboxEmails: (_req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
