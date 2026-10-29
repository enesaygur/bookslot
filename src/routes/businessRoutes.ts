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

export default router;
