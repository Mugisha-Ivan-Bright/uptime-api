import type { PrismaClient } from "@uptime/db"
import type { StatusPageData, MonitorSummary, ActiveIncident, RecentIncident } from "@uptime/types"
import { getDailyUptimeBars, getUptimePct } from "./uptime.service.js"
import { AppError, ErrorCodes } from "../lib/errors.js"

type CheckStatus = "up" | "down" | "degraded" | "timed_out"

export async function getStatusPageData(
  prisma: PrismaClient,
  orgSlug: string
): Promise<StatusPageData> {
  const org = await prisma.organization.findUnique({
    where: { slug: orgSlug },
    select: { id: true, name: true, slug: true },
  })

  if (!org) {
    throw new AppError("Organization not found", 404, "NOT_FOUND", ErrorCodes.NOT_FOUND)
  }

  const monitors = await prisma.monitor.findMany({
    where: { orgId: org.id, isActive: true },
  })

  const monitorSummaries: MonitorSummary[] = []
  let hasActiveIncident = false
  let anyNotUp = false
  let hasCheckData = false

  for (const m of monitors) {
    const latest = await prisma.checkResult.findFirst({
      where: { monitorId: m.id },
      orderBy: { checkedAt: "desc" },
    })

    const currentStatus: MonitorSummary["currentStatus"] = latest
      ? (latest.status as CheckStatus)
      : "unknown"

    if (currentStatus !== "unknown") hasCheckData = true

    const openInc = await prisma.incident.findFirst({
      where: { monitorId: m.id, resolvedAt: null },
    })

    let activeIncident: ActiveIncident | null = null
    if (openInc) {
      hasActiveIncident = true
      activeIncident = {
        id: openInc.id,
        startedAt: openInc.startedAt.toISOString(),
        cause: openInc.cause,
        affectedRegions: openInc.affectedRegions,
      }
    }

    if (currentStatus !== "up") anyNotUp = true

    const [uptimeBars, uptimePct90d] = await Promise.all([
      getDailyUptimeBars(prisma, m.id, 90),
      getUptimePct(prisma, m.id, 90),
    ])

    monitorSummaries.push({
      id: m.id,
      name: m.name,
      url: m.url,
      currentStatus,
      uptimePct90d,
      uptimeBars,
      activeIncident,
    })
  }

  let overallStatus: StatusPageData["overallStatus"]
  if (hasActiveIncident) {
    overallStatus = "outage"
  } else if (anyNotUp) {
    overallStatus = "degraded"
  } else if (!hasCheckData) {
    overallStatus = "unknown"
  } else {
    overallStatus = "operational"
  }

  const recentIncidentsRaw = await prisma.incident.findMany({
    where: {
      orgId: org.id,
      resolvedAt: { not: null },
    },
    orderBy: { startedAt: "desc" },
    take: 10,
    include: {
      monitor: { select: { name: true } },
    },
  })

  const recentIncidents: RecentIncident[] = recentIncidentsRaw.map((inc) => {
    const durationMs = inc.resolvedAt
      ? inc.resolvedAt.getTime() - inc.startedAt.getTime()
      : null
    return {
      id: inc.id,
      monitorId: inc.monitorId,
      monitorName: inc.monitor.name,
      startedAt: inc.startedAt.toISOString(),
      resolvedAt: inc.resolvedAt?.toISOString() ?? null,
      durationMinutes: durationMs !== null ? Math.round(durationMs / 60000) : null,
      cause: inc.cause,
      affectedRegions: inc.affectedRegions,
    }
  })

  return {
    org: {
      id: org.id,
      name: org.name,
      slug: org.slug,
    },
    overallStatus,
    monitors: monitorSummaries,
    recentIncidents,
    generatedAt: new Date().toISOString(),
  }
}

export async function getPaginatedIncidents(
  prisma: PrismaClient,
  orgSlug: string,
  page: number,
  limit: number
) {
  const org = await prisma.organization.findUnique({
    where: { slug: orgSlug },
    select: { id: true },
  })

  if (!org) {
    throw new AppError("Organization not found", 404, "NOT_FOUND", ErrorCodes.NOT_FOUND)
  }

  const skip = (page - 1) * limit

  const [incidents, total] = await Promise.all([
    prisma.incident.findMany({
      where: { orgId: org.id },
      orderBy: { startedAt: "desc" },
      skip,
      take: limit,
      include: {
        monitor: { select: { name: true } },
      },
    }),
    prisma.incident.count({
      where: { orgId: org.id },
    }),
  ])

  return {
    incidents: incidents.map((inc) => ({
      id: inc.id,
      monitorId: inc.monitorId,
      monitorName: inc.monitor.name,
      startedAt: inc.startedAt.toISOString(),
      resolvedAt: inc.resolvedAt?.toISOString() ?? null,
      durationMinutes: inc.resolvedAt
        ? Math.round((inc.resolvedAt.getTime() - inc.startedAt.getTime()) / 60000)
        : null,
      cause: inc.cause,
      affectedRegions: inc.affectedRegions,
    })),
    total,
    page,
    limit,
  }
}
