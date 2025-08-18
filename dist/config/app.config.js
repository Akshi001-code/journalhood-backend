"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSuperAdmin = exports.DEFAULT_PASSWORDS = exports.ROLES = void 0;
const firebase_config_1 = __importDefault(require("./firebase.config"));
const dotenv_1 = require("dotenv");
(0, dotenv_1.configDotenv)();
var ROLES;
(function (ROLES) {
    ROLES["SUPER_ADMIN"] = "super-admin";
    ROLES["DISTRICT_ADMIN"] = "district-admin";
    ROLES["SCHOOL_ADMIN"] = "school-admin";
    ROLES["TEACHER"] = "teacher";
    ROLES["STUDENT"] = "student";
})(ROLES || (exports.ROLES = ROLES = {}));
exports.DEFAULT_PASSWORDS = {
    DISTRICT_ADMIN: process.env.DISTRICT_ADMIN_PASSWORD || "password123",
    SCHOOL_ADMIN: process.env.SCHOOL_ADMIN_PASSWORD || "password123",
    TEACHER: process.env.TEACHER_PASSWORD || "password123",
    STUDENT: process.env.STUDENT_PASSWORD || "password123",
};
const createSuperAdmin = async () => {
    try {
        const user = await firebase_config_1.default.auth().createUser({
            displayName: "Super Admin",
            email: process.env.ADMIN_EMAIL || "admin@journalhood.com",
            password: process.env.ADMIN_PASSWORD || "password123",
            emailVerified: false,
        });
        await firebase_config_1.default.auth().setCustomUserClaims(user.uid, {
            role: ROLES.SUPER_ADMIN,
        });
        console.log("Super Admin Created Successfully");
    }
    catch (error) {
        if (error?.errorInfo.code === "auth/email-already-exists")
            console.log("Super Admin Already Exits");
    }
};
exports.createSuperAdmin = createSuperAdmin;
//# sourceMappingURL=app.config.js.map