import { Router } from "express";
import { requireRole } from "../middleware/requireRole";
import { MemberRole } from "@prisma/client";
import { listMembers, removeMember } from "../controllers/memberController";
import {
  getWorkingHours,
  putWorkingHours,
} from "../controllers/workingHoursController";
import { requireSelfOrOwner } from "../middleware/requireSelfOrOwner";
import { validate } from "../middleware/validate";
import { replaceWorkingHoursSchema } from "../schemas/workingHoursSchema";
import {
  createTimeOff,
  deleteTimeOff,
  listTimeOff,
} from "../controllers/timeOffController";
import { createTimeOffSchema } from "../schemas/timeOffSchema";

const router = Router({ mergeParams: true });

const anyMember = requireRole(MemberRole.OWNER, MemberRole.STAFF);
const ownerOnly = requireRole(MemberRole.OWNER);

router.get("/", anyMember, listMembers);
router.delete("/:memberId", ownerOnly, removeMember);
router.get("/:memberId/working-hours", anyMember, getWorkingHours);
router.put(
  "/:memberId/working-hours",
  anyMember,
  requireSelfOrOwner,
  validate(replaceWorkingHoursSchema),
  putWorkingHours,
);
router.get("/:memberId/time-off", anyMember, listTimeOff);
router.post(
  "/:memberId/time-off",
  anyMember,
  requireSelfOrOwner,
  validate(createTimeOffSchema),
  createTimeOff,
);
router.delete(
  "/:memberId/time-off/:timeOffId",
  anyMember,
  requireSelfOrOwner,
  deleteTimeOff,
);
export default router;
