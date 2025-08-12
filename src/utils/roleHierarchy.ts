import { ROLES } from "../config/app.config";

// Define the role hierarchy type
type RoleHierarchy = {
  [key in ROLES]: ROLES[];
};

// Define the role hierarchy
export const ROLE_HIERARCHY: RoleHierarchy = {
  [ROLES.SUPER_ADMIN]: [ROLES.DISTRICT_ADMIN, ROLES.SCHOOL_ADMIN, ROLES.TEACHER, ROLES.STUDENT],
  [ROLES.DISTRICT_ADMIN]: [ROLES.SCHOOL_ADMIN, ROLES.TEACHER, ROLES.STUDENT],
  [ROLES.SCHOOL_ADMIN]: [ROLES.TEACHER, ROLES.STUDENT],
  [ROLES.TEACHER]: [ROLES.STUDENT],
  [ROLES.STUDENT]: [],
};

// Check if a role can manage another role
export const canManageRole = (managerRole: ROLES, targetRole: ROLES): boolean => {
  return ROLE_HIERARCHY[managerRole]?.includes(targetRole) ?? false;
};

// Get all manageable roles for a given role
export const getManageableRoles = (role: ROLES): ROLES[] => {
  return ROLE_HIERARCHY[role];
};

// Get the immediate subordinate role
export const getImmediateSubordinateRole = (role: ROLES): ROLES | null => {
  const manageable = ROLE_HIERARCHY[role];
  return manageable.length > 0 ? manageable[0] : null;
};

// Get the immediate superior role
export const getImmediateSuperiorRole = (role: ROLES): ROLES | null => {
  const entries = Object.entries(ROLE_HIERARCHY) as [ROLES, ROLES[]][];
  const entry = entries.find(([_, subordinates]) => 
    subordinates.includes(role)
  );
  return entry ? entry[0] : null;
};

// Interface for user claims with parent reference
export interface HierarchicalUserClaims {
  role: ROLES;
  parentId: string | undefined;  // ID of the user who created this user
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
  teacherIncharge?: string;  // ID of the teacher in charge of this student
}

// Helper to create hierarchical claims
export const createHierarchicalClaims = (
  role: ROLES,
  parentId: string | undefined,
  additionalClaims: Partial<HierarchicalUserClaims> = {}
): HierarchicalUserClaims => {
  // Ensure required fields are present based on role
  if (role === ROLES.TEACHER) {
    if (!additionalClaims.schoolId || !additionalClaims.districtId) {
      throw new Error('Teacher claims must include schoolId and districtId');
    }
  }

  return {
    role,
    parentId,
    districtId: additionalClaims.districtId || '',
    districtName: additionalClaims.districtName || '',
    schoolId: additionalClaims.schoolId || '',
    schoolName: additionalClaims.schoolName || '',
    ...additionalClaims,
  };
}; 