import { Router } from "express";
import {
  registerSchema,
  resendVerificationSchema,
  verifyEmailSchema,
} from "../schemas/authSchema";
import {
  register,
  verifyEmail,
  resendVerification,
} from "../controllers/authController";
import { validate } from "../middleware/validate";

const router = Router();

router.post("/register", validate(registerSchema), register);
router.post("/verify-email", validate(verifyEmailSchema), verifyEmail);
router.post(
  "/resend-verification",
  validate(resendVerificationSchema),
  resendVerification,
);

export default router;
