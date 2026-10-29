import { Router } from "express";
import { validate } from "../middleware/validate";
import { createBusinessSchema } from "../schemas/businessSchema";
import { create, listMine } from "../controllers/businessController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

router.use(authMiddleware);

router.post("/", validate(createBusinessSchema), create);
router.get("/", listMine);

export default router;
