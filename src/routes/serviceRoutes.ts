import { Router } from "express";
import { requireRole } from "../middleware/requireRole";
import { MemberRole } from "@prisma/client";
import {
  createService,
  deleteService,
  getService,
  listServices,
  updateService,
} from "../controllers/serviceController";
import { validate } from "../middleware/validate";
import {
  createServiceSchema,
  updateServiceSchema,
} from "../schemas/serviceSchema";
import { requireService } from "../middleware/requireService";

const router = Router({ mergeParams: true });

const anyMember = requireRole(MemberRole.OWNER, MemberRole.STAFF);
const ownerOnly = requireRole(MemberRole.OWNER);

router.get("/", anyMember, listServices);
router.post("/", ownerOnly, validate(createServiceSchema), createService);
router.get("/:serviceId", anyMember, requireService, getService);
router.patch(
  "/:serviceId",
  ownerOnly,
  requireService,
  validate(updateServiceSchema),
  updateService,
);
router.delete("/:serviceId", ownerOnly, requireService, deleteService);

export default router;
