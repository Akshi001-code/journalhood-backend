import { Request, Response } from "express";
export declare const createClass: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getClasses: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateClass: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const deleteClass: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const assignTeacher: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
