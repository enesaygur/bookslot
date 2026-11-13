import { Router } from "express";
import { MemberRole } from "@prisma/client";
import { validate } from "../middleware/validate";
import { requireRole } from "../middleware/requireRole";
import { requireAppointment } from "../middleware/requireAppointment";
import { requireOwnerOrAssignee } from "../middleware/requireOwnerOrAssignee";
import {
  createAppointmentSchema,
  listAppointmentsQuerySchema,
  rescheduleAppointmentSchema,
} from "../schemas/appointmentSchema";
import {
  createAppointment,
  cancel,
  reschedule,
  listAppointments,
} from "../controllers/appointmentController";
import { validateQuery } from "../middleware/validateQuery";

const router = Router({ mergeParams: true });

const anyMember = requireRole(MemberRole.OWNER, MemberRole.STAFF);

router.post(
  "/",
  anyMember,
  validate(createAppointmentSchema),
  createAppointment,
);
router.post(
  "/:appointmentId/cancel",
  anyMember,
  requireAppointment,
  requireOwnerOrAssignee,
  cancel,
);
router.patch(
  "/:appointmentId",
  anyMember,
  requireAppointment,
  requireOwnerOrAssignee,
  validate(rescheduleAppointmentSchema),
  reschedule,
);
router.get(
  "/",
  anyMember,
  validateQuery(listAppointmentsQuerySchema),
  listAppointments,
);

export default router;
