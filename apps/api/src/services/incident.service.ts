import type { PrismaClient } from "@uptime/db"
import type Redis from "ioredis"
import type { IncidentOpenedPayload } from "@uptime/types"
import { AppError, ErrorCodes } from "../lib/errors.js"
import { invalidateStatusPageCache } from "./statusPageCache.service.js"

export async function openIncident(
  prisma: PrismaClient,
  payload: IncidentOpenedPayload,
  redis?: Redis,
  orgSlug?: string
) {
  const existing = await prisma.incident.findFirst({
    where: {
      monitorId: payload.monitorId,
      resolvedAt: null,
    },
  })

  if (existing) {
    return existing
  }

  const incident = await prisma.incident.create({
    data: {
      id: crypto.randomUUID(),
      monitorId: payload.monitorId,
      orgId: payload.orgId,
      rootRegion: payload.rootRegion,
      affectedRegions: payload.affectedRegions,
      cause: payload.cause,
      startedAt: new Date(),
    },
  })

  if (redis && orgSlug) {
    await invalidateStatusPageCache(redis, orgSlug)
  }

  return incident
}

export async function resolveIncident(
  prisma: PrismaClient,
  monitorId: string,
  redis?: Redis,
  orgSlug?: string
) {
  const incident = await prisma.incident.findFirst({
    where: {
      monitorId,
      resolvedAt: null,
    },
  })

  if (!incident) {
    return null
  }

  const resolved = await prisma.incident.update({
    where: { id: incident.id },
    data: { resolvedAt: new Date() },
  })

  if (redis && orgSlug) {
    await invalidateStatusPageCache(redis, orgSlug)
  }

  return resolved
}

export async function getOpenIncident(
  prisma: PrismaClient,
  monitorId: string
) {
  return prisma.incident.findFirst({
    where: {
      monitorId,
      resolvedAt: null,
    },
  })
}

export async function getIncidentsByOrg(
  prisma: PrismaClient,
  orgId: string
) {
  return prisma.incident.findMany({
    where: { orgId },
    orderBy: { startedAt: "desc" },
    include: {
      monitor: { select: { name: true } },
    },
  })
}

export async function getIncidentById(
  prisma: PrismaClient,
  id: string
) {
  return prisma.incident.findUnique({
    where: { id },
    include: {
      monitor: { select: { name: true, url: true } },
    },
  })
}

export async function acknowledgeIncident(
  prisma: PrismaClient,
  id: string,
  acknowledgedBy: string,
  orgId?: string
) {
  const incident = await prisma.incident.findUnique({ where: { id } })
  if (!incident || (orgId && incident.orgId !== orgId)) {
    throw new AppError("Incident not found", 404, "NOT_FOUND", ErrorCodes.NOT_FOUND)
  }

  return prisma.incident.update({
    where: { id },
    data: {
      acknowledgedAt: new Date(),
      acknowledgedBy,
    },
  })
}
