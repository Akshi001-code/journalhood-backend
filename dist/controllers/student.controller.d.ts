import { Request, Response } from "express";
export declare const getDiaryEntries: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const createDiaryEntry: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateDiaryEntry: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const deleteDiaryEntry: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getStudentProfile: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateStudentProfile: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getDiaryBackupEntries: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
