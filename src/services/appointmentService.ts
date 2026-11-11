import { AppointmentStatus, type Appointment } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../errors/AppError";
import { toLocalDate } from "../lib/timezone";
import { overlappingActive } from "../lib/appointmentWhere";
import { isOverlapViolation } from "../lib/dbErrors";
import { assertMemberInBusiness } from "./memberService";
import { computeDayAvailability } from "./availabilityService";
import type { CreateAppointmentInput } from "../schemas/appointmentSchema";

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
  cancelledAt: true,
  createdAt: true,
} as const;

function slotUnavailable() {
  return new AppError(409, "Slot is not available", "SLOT_UNAVAILABLE");
}

function isOffered(slots: { start: Date }[], startsAt: Date) {
  return slots.some((slot) => slot.start.getTime() === startsAt.getTime());
}

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
  const endsAt = new Date(startsAt.getTime() + service.durationMinutes * MS_PER_MINUTE);

  const slots = await computeDayAvailability({
    memberId: input.memberId,
    date: toLocalDate(startsAt, business.timezone),
    durationMinutes: service.durationMinutes,
    timeZone: business.timezone,
    now,
  });
  if (!isOffered(slots, startsAt)) throw slotUnavailable();

  try {
    return await prisma.$transaction(async (tx) => {
      const conflict = await tx.appointment.findFirst({
        where: overlappingActive(input.memberId, startsAt, endsAt),
        select: { id: true },
      });
      if (conflict) throw slotUnavailable();

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
    if (isOverlapViolation(err)) throw slotUnavailable();
    throw err;
  }
}

export async function cancelAppointment(appointment: Appointment, now: Date = new Date()) {
  if (appointment.status === AppointmentStatus.CANCELLED) {
    return prisma.appointment.findUniqueOrThrow({
      where: { id: appointment.id },
      select: appointmentSelect,
    });
  }

  if (appointment.startsAt <= now) {
    throw new AppError(409, "Past appointments cannot be cancelled", "APPOINTMENT_IN_PAST");
  }

  return prisma.appointment.update({
    where: { id: appointment.id },
    data: { status: AppointmentStatus.CANCELLED, cancelledAt: now },
    select: appointmentSelect,
  });
}

export async function rescheduleAppointment(
  appointment: Appointment,
  startsAtIso: string,
  now: Date = new Date(),
) {
  if (appointment.status === AppointmentStatus.CANCELLED) {
    throw new AppError(409, "Cancelled appointments cannot be rescheduled", "APPOINTMENT_CANCELLED");
  }
  if (appointment.startsAt <= now) {
    throw new AppError(409, "Past appointments cannot be rescheduled", "APPOINTMENT_IN_PAST");
  }

  const business = await prisma.business.findUniqueOrThrow({
    where: { id: appointment.businessId },
    select: { timezone: true },
  });

  const durationMs = appointment.endsAt.getTime() - appointment.startsAt.getTime();
  const startsAt = new Date(startsAtIso);
  const endsAt = new Date(startsAt.getTime() + durationMs);

  const slots = await computeDayAvailability({
    memberId: appointment.memberId,
    date: toLocalDate(startsAt, business.timezone),
    durationMinutes: durationMs / MS_PER_MINUTE,
    timeZone: business.timezone,
    now,
    excludeAppointmentId: appointment.id,
  });
  if (!isOffered(slots, startsAt)) throw slotUnavailable();

  try {
    return await prisma.$transaction(async (tx) => {
      const conflict = await tx.appointment.findFirst({
        where: overlappingActive(appointment.memberId, startsAt, endsAt, appointment.id),
        select: { id: true },
      });
      if (conflict) throw slotUnavailable();

      return tx.appointment.update({
        where: { id: appointment.id },
        data: { startsAt, endsAt },
        select: appointmentSelect,
      });
    });
  } catch (err) {
    if (isOverlapViolation(err)) throw slotUnavailable();
    throw err;
  }
}