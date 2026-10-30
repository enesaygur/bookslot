import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { validate } from "../middleware/validate";
import { accept } from "../controllers/inviteController";
import { acceptInviteSchema } from "../schemas/inviteSchema";

const router = Router();

router.use(authMiddleware);

router.post("/accept", validate(acceptInviteSchema), accept);

export default router;
