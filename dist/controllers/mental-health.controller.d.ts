import { Request, Response } from "express";
export declare const analyzeAllStudentJournals: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getFlaggedStudentsReport: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const analyzeMentalHealth: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getMentalHealthAnalysis: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getDistrictFlaggedStudents: (req: any, res: any) => Promise<any>;
export declare const getSchoolFlaggedStudents: (req: any, res: any) => Promise<any>;
export declare const getTeacherFlaggedStudents: (req: any, res: any) => Promise<any>;
