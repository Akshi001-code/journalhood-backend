"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createHierarchicalClaims = exports.getImmediateSuperiorRole = exports.getImmediateSubordinateRole = exports.getManageableRoles = exports.canManageRole = exports.ROLE_HIERARCHY = void 0;
const app_config_1 = require("../config/app.config");
// Define the role hierarchy
exports.ROLE_HIERARCHY = {
    [app_config_1.ROLES.SUPER_ADMIN]: [app_config_1.ROLES.DISTRICT_ADMIN, app_config_1.ROLES.SCHOOL_ADMIN, app_config_1.ROLES.TEACHER, app_config_1.ROLES.STUDENT],
    [app_config_1.ROLES.DISTRICT_ADMIN]: [app_config_1.ROLES.SCHOOL_ADMIN, app_config_1.ROLES.TEACHER, app_config_1.ROLES.STUDENT],
    [app_config_1.ROLES.SCHOOL_ADMIN]: [app_config_1.ROLES.TEACHER, app_config_1.ROLES.STUDENT],
    [app_config_1.ROLES.TEACHER]: [app_config_1.ROLES.STUDENT],
    [app_config_1.ROLES.STUDENT]: [],
};
// Check if a role can manage another role
const canManageRole = (managerRole, targetRole) => {
    return exports.ROLE_HIERARCHY[managerRole]?.includes(targetRole) ?? false;
};
exports.canManageRole = canManageRole;
// Get all manageable roles for a given role
const getManageableRoles = (role) => {
    return exports.ROLE_HIERARCHY[role];
};
exports.getManageableRoles = getManageableRoles;
// Get the immediate subordinate role
const getImmediateSubordinateRole = (role) => {
    const manageable = exports.ROLE_HIERARCHY[role];
    return manageable.length > 0 ? manageable[0] : null;
};
exports.getImmediateSubordinateRole = getImmediateSubordinateRole;
// Get the immediate superior role
const getImmediateSuperiorRole = (role) => {
    const entries = Object.entries(exports.ROLE_HIERARCHY);
    const entry = entries.find(([_, subordinates]) => subordinates.includes(role));
    return entry ? entry[0] : null;
};
exports.getImmediateSuperiorRole = getImmediateSuperiorRole;
// Helper to create hierarchical claims
const createHierarchicalClaims = (role, parentId, additionalClaims = {}) => {
    // Ensure required fields are present based on role
    if (role === app_config_1.ROLES.TEACHER) {
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
exports.createHierarchicalClaims = createHierarchicalClaims;
//# sourceMappingURL=roleHierarchy.js.map