import { AppError } from "../errors/AppError";
import { prisma } from "../lib/prisma";

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
