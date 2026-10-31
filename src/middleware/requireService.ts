import { RequestHandler } from "express";
import { prisma } from "../lib/prisma";
import { AppError } from "../errors/AppError";

export const requireService: RequestHandler = async (req, _res, next) => {
  const service = await prisma.service.findFirst({
    where: {
      id: req.params.serviceId as string,
      businessId: req.member!.businessId,
    },
  });

  if (!service) {
    throw new AppError(404, "Service not found", "NOT_FOUND");
  }

  req.service = service;
  next();
};
