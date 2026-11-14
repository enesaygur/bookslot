import { Router } from "express";
import { getPublicBusiness } from "../controllers/publicController";

const router = Router();
router.get("/:slug", getPublicBusiness);

export default router;
