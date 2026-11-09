import { Router } from "express";
import { requireRole } from "../middleware/requireRole";
import { MemberRole } from "@prisma/client";
import { createAppointmentSchema } from "../schemas/appointmentSchema";
import { validate } from "../middleware/validate";
import { createAppointment } from "../controllers/appointmentController";

const router = Router({ mergeParams: true });

const anyMember = requireRole(MemberRole.OWNER, MemberRole.STAFF);

router.post(
  "/",
  anyMember,
  validate(createAppointmentSchema),
  createAppointment,
);

export default router;
