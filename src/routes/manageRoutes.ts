import { Router } from "express";
import { requireManageToken } from "../middleware/requireManageToken";
import {
  cancelManagedAppointment,
  rescheduleManagedAppointment,
  showManagedAppointment,
} from "../controllers/manageController";
import { validate } from "../middleware/validate";
import { rescheduleAppointmentSchema } from "../schemas/appointmentSchema";

const router = Router();

router.use(requireManageToken);

router.get("/appointment", showManagedAppointment);
router.post("/appointment/cancel", cancelManagedAppointment);
router.patch(
  "/appointment",
  validate(rescheduleAppointmentSchema),
  rescheduleManagedAppointment,
);

export default router;
