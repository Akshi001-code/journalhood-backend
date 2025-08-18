export declare enum ROLES {
    SUPER_ADMIN = "super-admin",
    DISTRICT_ADMIN = "district-admin",
    SCHOOL_ADMIN = "school-admin",
    TEACHER = "teacher",
    STUDENT = "student"
}
export declare const DEFAULT_PASSWORDS: {
    DISTRICT_ADMIN: string;
    SCHOOL_ADMIN: string;
    TEACHER: string;
    STUDENT: string;
};
export declare const createSuperAdmin: () => Promise<void>;
