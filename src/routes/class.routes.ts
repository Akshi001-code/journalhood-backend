import { Router } from "express";
import { createClass, getClasses, updateClass, deleteClass, assignTeacher } from "../controllers/class.controller";
import { verifyToken } from "../utils/verifyToken";
import { verifyRole } from "../utils/verifyRole";
import { ROLES } from "../config/app.config";
import { zValidator } from "../utils/zValidator";
import { createClassSchema, updateClassSchema, classParamSchema } from "../validators/school-admin.validator";

const router = Router();

// Apply auth middleware to all routes
router.use(verifyToken);
router.use(verifyRole([ROLES.SCHOOL_ADMIN, ROLES.SUPER_ADMIN, ROLES.DISTRICT_ADMIN]));

// Class routes
router.post("/", zValidator({ schema: createClassSchema, type: "body" }), createClass);
router.get("/", getClasses);
router.put("/:classId", 
  zValidator({ schema: classParamSchema, type: "params" }), 
  zValidator({ schema: updateClassSchema, type: "body" }), 
  updateClass
);
router.delete("/:classId", zValidator({ schema: classParamSchema, type: "params" }), deleteClass);
router.post("/:classId/assign-teacher", zValidator({ schema: classParamSchema, type: "params" }), assignTeacher);

export default router; 