import { Router } from "express";
import { zValidator } from "../utils/zValidator";
import { mailValidator } from "../validators/main.validator";
import { mailController } from "../controllers/mail.controller";

const router: Router = Router();

router.post(
  "/",
  zValidator({
    schema: mailValidator,
    type: "body",
  }),
  mailController
);

export { router as mailRoutes };
