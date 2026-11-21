import { Service } from "@prisma/client";
import { prisma } from "../lib/prisma";
import {
  CreateServiceInput,
  UpdateServiceInput,
} from "../schemas/serviceSchema";
import { AppError } from "../errors/AppError";

const serviceSelect = {
  id: true,
  name: true,
  description: true,
  durationMinutes: true,
  priceCents: true,
  depositCents: true,
  isActive: true,
  createdAt: true,
} as const;

export async function findServices(businessId: string) {
  return await prisma.service.findMany({
    where: { businessId },
    select: serviceSelect,
    orderBy: { createdAt: "asc" },
  });
}

export async function addService(
  businessId: string,
  input: CreateServiceInput,
) {
  return await prisma.service.create({
    data: { ...input, businessId },
    select: serviceSelect,
  });
}

export async function editService(service: Service, input: UpdateServiceInput) {
  const price = input.priceCents ?? service.priceCents;
  const deposit = input.depositCents ?? service.depositCents;

  if (deposit > price) {
    throw new AppError(400, "Deposit cannot exceed price", "INVALID_DEPOSIT");
  }

  return await prisma.service.update({
    where: { id: service.id },
    data: input,
    select: serviceSelect,
  });
}

export async function archiveService(serviceId: string) {
  return await prisma.service.update({
    where: { id: serviceId },
    data: { isActive: false },
    select: serviceSelect,
  });
}
