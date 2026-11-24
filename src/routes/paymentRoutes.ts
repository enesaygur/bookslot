import express, { Router } from "express";
import { paymentCallbackLimiter } from "../middleware/rateLimit";
import { iyzicoCallback } from "../controllers/paymentController";

const router = Router();

router.post(
  "/iyzico/callback",
  paymentCallbackLimiter,
  express.urlencoded({ extended: false }),
  iyzicoCallback,
);

export default router;
