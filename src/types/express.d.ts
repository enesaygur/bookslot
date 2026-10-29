import { MemberRole } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      member?: { id: string; role: MemberRole; businessId: string };
    }
  }
}

export {};
