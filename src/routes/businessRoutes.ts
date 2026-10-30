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
  rename,
} from "../controllers/businessController";
import { authMiddleware } from "../middleware/authMiddleware";
import { requireRole } from "../middleware/requireRole";
import { MemberRole } from "@prisma/client";
import { sendInvite } from "../controllers/inviteController";
import { createInviteSchema } from "../schemas/inviteSchema";

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
  rename,
);
router.post(
  "/:businessId/invites",
  requireRole(MemberRole.OWNER),
  validate(createInviteSchema),
  sendInvite,
);

export default router;
