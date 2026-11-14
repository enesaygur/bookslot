import { Router } from "express";
import {
  createPublicAppointment,
  getPublicBusiness,
  showPublicAvailability,
} from "../controllers/publicController";
import { validateQuery } from "../middleware/validateQuery";
import { availabilityQuerySchema } from "../schemas/availabilitySchema";
import { validate } from "../middleware/validate";
import { createAppointmentSchema } from "../schemas/appointmentSchema";

const router = Router();

router.get("/:slug", getPublicBusiness);
router.get(
  "/:slug/availability",
  validateQuery(availabilityQuerySchema),
  showPublicAvailability,
);
router.post(
  "/:slug/appointments",
  validate(createAppointmentSchema),
  createPublicAppointment,
);

export default router;
