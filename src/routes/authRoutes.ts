import { Router } from "express";
import { registerSchema } from "../schemas/authSchema";
import { register } from "../controllers/authController";
import { validate } from "../middleware/validate";

const router = Router();

router.post("/register", validate(registerSchema), register);

export default router;
