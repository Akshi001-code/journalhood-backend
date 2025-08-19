import { Router } from "express";
import { verifyToken } from "../utils/verifyToken";
import { verifyRole } from "../utils/verifyRole";
import { ROLES } from "../config/app.config";
import { zValidator } from "../utils/zValidator";
import {
  createTeacherValidator,
  teacherIdParam,
  updateTeacherValidator,
} from "../validators/school-admin.validator";
import {
  createTeacher,
  deleteTeacher,
  getTeachers,
  getTeacher,
  updateTeacher,
  suspendOrUnsuspendTeacher,
} from "../controllers/school-admin.controller";
import {
  getTeacherAnalytics,
  getDashboard,
  getTeacherInfo,
  createStudent,
  getStudents,
  getAssignedResources,
  getResourceDetails,
  shareResourceWithStudents,
  getSharedResources,
  getDeliveredResources,
} from "../controllers/teachers.controller";

const router: Router = Router();

// Apply auth middleware to all routes
router.use(verifyToken);

// Teacher management routes (school admin only)
router.post(
  "/",
  verifyRole([ROLES.SCHOOL_ADMIN]),
  zValidator({ schema: createTeacherValidator, type: "body" }),
  createTeacher
);

router.get(
  "/",
  verifyRole([ROLES.SCHOOL_ADMIN, ROLES.DISTRICT_ADMIN]),
  getTeachers
);

// NOTE: Parameterized routes moved to the bottom to avoid intercepting specific paths

// Teacher dashboard routes (teacher only)
router.get(
  "/dashboard",
  verifyRole([ROLES.TEACHER]),
  getDashboard
);

router.get(
  "/info",
  verifyRole([ROLES.SCHOOL_ADMIN, ROLES.DISTRICT_ADMIN, ROLES.TEACHER]),
  getTeacherInfo
);

router.get(
  "/analytics/me",
  verifyRole([ROLES.TEACHER]),
  getTeacherAnalytics
);

router.get(
  "/analytics/class",
  verifyRole([ROLES.TEACHER]),
  require("../controllers/teachers.controller").getTeacherClassAnalytics
);

// Students in teacher's class
router.get(
  "/students",
  verifyRole([ROLES.TEACHER]),
  getStudents
);

router.post(
  "/students",
  verifyRole([ROLES.TEACHER]),
  createStudent
);

// Resource routes (teacher only)
router.get(
  "/resources/assigned",
  verifyRole([ROLES.TEACHER]),
  getAssignedResources
);

router.get(
  "/resources/details/:resourceId",
  verifyRole([ROLES.TEACHER]),
  getResourceDetails
);

router.post(
  "/resources/share",
  verifyRole([ROLES.TEACHER]),
  shareResourceWithStudents
);

router.get(
  "/resources/shared",
  verifyRole([ROLES.TEACHER]),
  getSharedResources
);

router.get(
  "/resources/delivered",
  verifyRole([ROLES.TEACHER]),
  getDeliveredResources
);

// Admin actions on specific teacher (keep last)
router.get(
  "/:uid",
  verifyRole([ROLES.SCHOOL_ADMIN, ROLES.DISTRICT_ADMIN]),
  zValidator({ schema: teacherIdParam, type: "params" }),
  getTeacher
);

router.put(
  "/:uid",
  verifyRole([ROLES.SCHOOL_ADMIN]),
  zValidator({ schema: teacherIdParam, type: "params" }),
  zValidator({ schema: updateTeacherValidator, type: "body" }),
  updateTeacher
);

router.delete(
  "/:uid",
  verifyRole([ROLES.SCHOOL_ADMIN]),
  zValidator({ schema: teacherIdParam, type: "params" }),
  deleteTeacher
);

router.put(
  "/:uid/status",
  verifyRole([ROLES.SCHOOL_ADMIN]),
  zValidator({ schema: teacherIdParam, type: "params" }),
  suspendOrUnsuspendTeacher
);
export { router as teacherRoutes };
