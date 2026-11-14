import { Router } from "express";
import {
  getPublicBusiness,
  showPublicAvailability,
} from "../controllers/publicController";
import { validateQuery } from "../middleware/validateQuery";
import { availabilityQuerySchema } from "../schemas/availabilitySchema";

const router = Router();

router.get("/:slug", getPublicBusiness);
router.get(
  "/:slug/availability",
  validateQuery(availabilityQuerySchema),
  showPublicAvailability,
);

export default router;
