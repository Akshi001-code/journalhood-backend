import { ROLES } from "../config/app.config";
type RoleHierarchy = {
    [key in ROLES]: ROLES[];
};
export declare const ROLE_HIERARCHY: RoleHierarchy;
export declare const canManageRole: (managerRole: ROLES, targetRole: ROLES) => boolean;
export declare const getManageableRoles: (role: ROLES) => ROLES[];
export declare const getImmediateSubordinateRole: (role: ROLES) => ROLES | null;
export declare const getImmediateSuperiorRole: (role: ROLES) => ROLES | null;
export interface HierarchicalUserClaims {
    role: ROLES;
    parentId: string | undefined;
    districtId: string;
    districtName: string;
    schoolId: string;
    schoolName: string;
    classId?: string;
    className?: string;
    gradeId?: string;
    gradeName?: string;
    division?: string;
    teacherId?: string;
    teacherName?: string;
    teacherIncharge?: string;
}
export declare const createHierarchicalClaims: (role: ROLES, parentId: string | undefined, additionalClaims?: Partial<HierarchicalUserClaims>) => HierarchicalUserClaims;
export {};
