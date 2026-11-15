import { Appointment, AppointmentStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { formatLocalTime, toLocalDate } from "../lib/timezone";
import { assertWithinHorizon } from "./publicService";
import { rescheduleAppointment } from "./appointmentService";

export async function describeManagedAppointments(
  appointment: {
    id: string;
  },
  now: Date = new Date(),
) {
  const row = await prisma.appointment.findUniqueOrThrow({
    where: { id: appointment.id },
    select: {
      id: true,
      startsAt: true,
      endsAt: true,
      status: true,
      priceCents: true,
      customerName: true,
      service: { select: { name: true } },
      member: { select: { user: { select: { name: true } } } },
      business: { select: { name: true, timezone: true } },
    },
  });

  const timeZone = row.business.timezone;

  return {
    id: row.id,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    status: row.status,
    priceCents: row.priceCents,
    customerName: row.customerName,
    serviceName: row.service.name,
    memberName: row.member.user.name,
    businessName: row.business.name,
    timeZone,
    localDate: toLocalDate(row.startsAt, timeZone),
    localStart: formatLocalTime(row.startsAt, timeZone),
    canModify: row.status !== AppointmentStatus.CANCELLED && row.startsAt > now,
  };
}

export async function rescheduleManaged(
  appointment: Appointment,
  startsAtIso: string,
  now: Date = new Date(),
) {
  const business = await prisma.business.findUniqueOrThrow({
    where: { id: appointment.businessId },
    select: { timezone: true },
  });

  assertWithinHorizon(
    toLocalDate(new Date(startsAtIso), business.timezone),
    business.timezone,
    now,
  );

  return rescheduleAppointment(appointment, startsAtIso, now);
}
