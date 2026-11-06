import { Router } from "express";
import { validate } from "../middleware/validate";
import {
  createBusinessSchema,
  updateBusinessSchema,
} from "../schemas/businessSchema";
import {
  create,
  getOne,
  listMine,
  update,
} from "../controllers/businessController";
import { authMiddleware } from "../middleware/authMiddleware";
import { requireRole } from "../middleware/requireRole";
import { MemberRole } from "@prisma/client";
import { sendInvite } from "../controllers/inviteController";
import { createInviteSchema } from "../schemas/inviteSchema";
import { listMembers, removeMember } from "../controllers/memberController";
import serviceRouter from "./serviceRoutes";
import memberRouter from "./memberRoutes";
import { availabilityQuerySchema } from "../schemas/availabilitySchema";
import { showAvailability } from "../controllers/availabilityController";
import { validateQuery } from "../middleware/validateQuery";

const router = Router();

router.use(authMiddleware);

router.post("/", validate(createBusinessSchema), create);
router.get("/", listMine);
router.get(
  "/:businessId",
  requireRole(MemberRole.OWNER, MemberRole.STAFF),
  getOne,
);
router.patch(
  "/:businessId",
  requireRole(MemberRole.OWNER),
  validate(updateBusinessSchema),
  update,
);
router.post(
  "/:businessId/invites",
  requireRole(MemberRole.OWNER),
  validate(createInviteSchema),
  sendInvite,
);
router.get(
  "/:businessId/members",
  requireRole(MemberRole.OWNER, MemberRole.STAFF),
  listMembers,
);
router.delete(
  "/:businessId/members/:memberId",
  requireRole(MemberRole.OWNER),
  removeMember,
);

router.get(
  "/:businessId/availability",
  requireRole(MemberRole.OWNER, MemberRole.STAFF),
  validateQuery(availabilityQuerySchema),
  showAvailability,
);

router.use("/:businessId/services", serviceRouter);
router.use("/:businessId/members", memberRouter);

export default router;
