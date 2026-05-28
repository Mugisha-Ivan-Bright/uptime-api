import type { PrismaClient } from "@uptime/db"
import { AppError, ErrorCodes } from "../lib/errors.js"

export async function getOrgBySlug(prisma: PrismaClient, slug: string) {
  const org = await prisma.organization.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, plan: true },
  })
  if (!org) {
    throw new AppError("Organization not found", 404, "NOT_FOUND", ErrorCodes.NOT_FOUND)
  }
  return org
}

export async function getOrgMe(prisma: PrismaClient, orgId: string, userId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { id: true, name: true, slug: true, plan: true, createdAt: true },
  })
  if (!org) {
    throw new AppError("Organization not found", 404, "NOT_FOUND", ErrorCodes.NOT_FOUND)
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true, createdAt: true },
  })

  const monitorCount = await prisma.monitor.count({ where: { orgId } })
  const totalIncidents = await prisma.incident.count({ where: { orgId } })
  const openIncidents = await prisma.incident.count({
    where: { orgId, resolvedAt: null },
  })

  return {
    org,
    user,
    monitors: monitorCount,
    incidents: { open: openIncidents, total: totalIncidents },
  }
}

export async function updateOrgName(prisma: PrismaClient, orgId: string, name: string) {
  const org = await prisma.organization.update({
    where: { id: orgId },
    data: { name },
    select: { id: true, name: true, slug: true, plan: true, createdAt: true },
  })
  return org
}
