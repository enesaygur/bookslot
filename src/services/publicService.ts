import { AppError } from "../errors/AppError";
import { prisma } from "../lib/prisma";
import { toLocalDate } from "../lib/timezone";
import type { AvailabilityQuery } from "../schemas/availabilitySchema";
import { getAvailability } from "./availabilityService";

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

export async function getPublicAvailability(
  slug: string,
  query: AvailabilityQuery,
  now: Date = new Date(),
) {
  const business = await findBusinessBySlug(slug);

  const lastBookableDate = toLocalDate(
    new Date(now.getTime() + MAX_DAYS_AHEAD * MS_PER_DAY),
    business.timezone,
  );

  if (query.date > lastBookableDate) {
    throw new AppError(
      400,
      `Bookings open ${MAX_DAYS_AHEAD} days ahead`,
      "DATE_TOO_FAR",
    );
  }
  return getAvailability(business.id, query, now);
}
