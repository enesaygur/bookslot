import { Router } from "express";
import {
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  verifyEmailSchema,
} from "../schemas/authSchema";
import {
  loginLimiter,
  registerLimiter,
  resendLimiter,
  refreshLimiter,
} from "../middleware/rateLimit";
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

router.post("/register", registerLimiter, validate(registerSchema), register);
router.post("/verify-email", validate(verifyEmailSchema), verifyEmail);
router.post(
  "/resend-verification",
  resendLimiter,
  validate(resendVerificationSchema),
  resendVerification,
);
router.post("/login", loginLimiter, validate(loginSchema), login);
router.get("/me", authMiddleware, me);
router.post("/refresh", refreshLimiter, refresh);
router.post("/logout", logout);

export default router;
