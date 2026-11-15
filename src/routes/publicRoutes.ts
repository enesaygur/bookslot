import { Router } from "express";
import {
  createPublicAppointment,
  getPublicBusiness,
  showPublicAvailability,
} from "../controllers/publicController";
import {
  publicBookingLimiter,
  publicReadLimiter,
} from "../middleware/rateLimit";
import { validateQuery } from "../middleware/validateQuery";
import { availabilityQuerySchema } from "../schemas/availabilitySchema";
import { validate } from "../middleware/validate";
import { createAppointmentSchema } from "../schemas/appointmentSchema";

const router = Router();

router.get("/:slug", publicReadLimiter, getPublicBusiness);
router.get(
  "/:slug/availability",
  publicReadLimiter,
  validateQuery(availabilityQuerySchema),
  showPublicAvailability,
);
router.post(
  "/:slug/appointments",
  publicBookingLimiter,
  validate(createAppointmentSchema),
  createPublicAppointment,
);

export default router;
