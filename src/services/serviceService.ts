import { prisma } from "../lib/prisma";
import {
  CreateServiceInput,
  UpdateServiceInput,
} from "../schemas/serviceSchema";

const serviceSelect = {
  id: true,
  name: true,
  description: true,
  durationMinutes: true,
  priceCents: true,
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

export async function editService(
  serviceId: string,
  input: UpdateServiceInput,
) {
  return await prisma.service.update({
    where: { id: serviceId },
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
