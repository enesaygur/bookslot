import { start } from "node:repl";
import { AppError } from "../errors/AppError";
import { prisma } from "../lib/prisma";
import { CreateAppointmentInput } from "../schemas/appointmentSchema";
import { assertMemberInBusiness } from "./memberService";
import { getAvailability } from "./availabilityService";
import { toLocalDate } from "../lib/timezone";
import { overlappingActive } from "../lib/appointmentWhere";
import { isOverlapViolation } from "../lib/dbErrors";

const MS_PER_MINUTE = 60_000;

const appointmentSelect = {
  id: true,
  memberId: true,
  serviceId: true,
  startsAt: true,
  endsAt: true,
  status: true,
  priceCents: true,
  customerName: true,
  customerEmail: true,
  customerPhone: true,
  notes: true,
  createdAt: true,
} as const;

export async function bookAppointment(
  businessId: string,
  input: CreateAppointmentInput,
  now: Date = new Date(),
) {
  await assertMemberInBusiness(businessId, input.memberId);

  const service = await prisma.service.findFirst({
    where: { id: input.serviceId, businessId, isActive: true },
    select: { durationMinutes: true, priceCents: true },
  });

  if (!service) {
    throw new AppError(404, "Service not found", "NOT_FOUND");
  }

  const business = await prisma.business.findUniqueOrThrow({
    where: { id: businessId },
    select: { timezone: true },
  });

  const startsAt = new Date(input.startsAt);
  const endsAt = new Date(
    startsAt.getTime() + service.durationMinutes * MS_PER_MINUTE,
  );

  const availability = await getAvailability(
    businessId,
    {
      date: toLocalDate(startsAt, business.timezone),
      serviceId: input.serviceId,
      memberId: input.memberId,
    },
    now,
  );

  const isOffered = availability.slots.some(
    (slot) => slot.start === startsAt.toISOString(),
  );

  if (!isOffered) {
    throw new AppError(409, "Slot is not available", "SLOT_UNAVAILABLE");
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const conflict = await tx.appointment.findFirst({
        where: overlappingActive(input.memberId, startsAt, endsAt),
        select: { id: true },
      });
      if (conflict) {
        throw new AppError(409, "Slot is not available", "SLOT_UNAVAILABLE");
      }

      return tx.appointment.create({
        data: {
          businessId,
          memberId: input.memberId,
          serviceId: input.serviceId,
          startsAt,
          endsAt,
          priceCents: service.priceCents,
          customerName: input.customerName,
          customerEmail: input.customerEmail,
          customerPhone: input.customerPhone,
          notes: input.notes,
        },
        select: appointmentSelect,
      });
    });
  } catch (err) {
    if (isOverlapViolation(err)) {
      throw new AppError(409, "Slot is not available", "SLOT_UNAVAILABLE");
    }
    throw err;
  }
}
