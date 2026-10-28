import { Router } from "express";
import {
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  verifyEmailSchema,
} from "../schemas/authSchema";
import {
  register,
  verifyEmail,
  resendVerification,
  login,
  me,
  refresh,
  logout,
} from "../controllers/authController";
import { validate } from "../middleware/validate";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

router.post("/register", validate(registerSchema), register);
router.post("/verify-email", validate(verifyEmailSchema), verifyEmail);
router.post(
  "/resend-verification",
  validate(resendVerificationSchema),
  resendVerification,
);
router.post("/login", validate(loginSchema), login);
router.get("/me", authMiddleware, me);
router.post("/refresh", refresh);
router.post("/logout", logout);

export default router;
