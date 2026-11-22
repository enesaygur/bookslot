import { AppointmentStatus } from "@prisma/client";
import { AppError } from "../errors/AppError";
import { prisma } from "../lib/prisma";
import { toLocalDate } from "../lib/timezone";
import { CreateAppointmentInput } from "../schemas/appointmentSchema";
import type { AvailabilityQuery } from "../schemas/availabilitySchema";
import { getAvailability } from "./availabilityService";
import { bookAppointment } from "./appointmentService";
import { startCheckout, releaseFailedCheckout } from "./paymentService";

export async function findPublicBusiness(slug: string) {
  const business = await prisma.business.findUnique({
    where: { slug: slug.toLowerCase() },
    select: {
      name: true,
      slug: true,
      timezone: true,
      services: {
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          description: true,
          durationMinutes: true,
          priceCents: true,
          depositCents: true,
        },
        orderBy: { createdAt: "asc" },
      },
      members: {
        where: { workingIntervals: { some: {} } },
        select: { id: true, user: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!business) {
    throw new AppError(404, "Business not found", "NOT_FOUND");
  }

  return {
    name: business.name,
    slug: business.slug,
    timezone: business.timezone,
    services: business.services,
    members: business.members.map((member) => ({
      id: member.id,
      name: member.user.name,
    })),
  };
}

const MAX_DAYS_AHEAD = 90;
const MS_PER_DAY = 86_400_000;
const MAX_ACTIVE_PER_CUSTOMER = 3;

async function findBusinessBySlug(slug: string) {
  const business = await prisma.business.findUnique({
    where: { slug: slug.toLowerCase() },
    select: {
      id: true,
      timezone: true,
    },
  });

  if (!business) {
    throw new AppError(404, "Business not found", "NOT_FOUND");
  }

  return business;
}

export function assertWithinHorizon(date: string, timeZone: string, now: Date) {
  const lastBookableDate = toLocalDate(
    new Date(now.getTime() + MAX_DAYS_AHEAD * MS_PER_DAY),
    timeZone,
  );

  if (date > lastBookableDate) {
    throw new AppError(
      400,
      `Bookings open ${MAX_DAYS_AHEAD} days ahead`,
      "DATE_TOO_FAR",
    );
  }
}

export async function getPublicAvailability(
  slug: string,
  query: AvailabilityQuery,
  now: Date = new Date(),
) {
  const business = await findBusinessBySlug(slug);
  assertWithinHorizon(query.date, business.timezone, now);

  return getAvailability(business.id, query, now);
}

export async function bookPublicAppointment(
  slug: string,
  input: CreateAppointmentInput,
  context: { ip: string },
  now: Date = new Date(),
) {
  const business = await findBusinessBySlug(slug);

  const startsAt = new Date(input.startsAt);
  assertWithinHorizon(toLocalDate(startsAt, business.timezone), business.timezone, now);

  const activeCount = await prisma.appointment.count({
    where: {
      businessId: business.id,
      customerEmail: input.customerEmail,
      status: { not: AppointmentStatus.CANCELLED },
      startsAt: { gt: now },
    },
  });
  if (activeCount >= MAX_ACTIVE_PER_CUSTOMER) {
    throw new AppError(429, "Too many upcoming appointments", "TOO_MANY_APPOINTMENTS");
  }

  const result = await bookAppointment(business.id, input, now, { collectDeposit: true });

  const summary = {
    id: result.appointment.id,
    startsAt: result.appointment.startsAt,
    endsAt: result.appointment.endsAt,
    status: result.appointment.status,
    priceCents: result.appointment.priceCents,
    manageToken: result.manageToken,
  };

  if (!result.payment) {
    return summary;
  }

  try {
    const checkout = await startCheckout(result.appointment.id, context.ip);
    return {
      ...summary,
      payment: {
        amountCents: result.payment.amountCents,
        pageUrl: checkout.paymentPageUrl,
        expiresAt: result.appointment.holdExpiresAt,
      },
    };
  } catch (err) {
    await releaseFailedCheckout(
      result.appointment.id,
      result.payment.id,
      err instanceof Error ? err.message : "checkout failed",
    );
    throw err;
  }
}
