import type { PrismaClient } from "@uptime/db"
import type Redis from "ioredis"
import { openIncident, resolveIncident, getOpenIncident } from "./incident.service.js"
import { fanoutAlerts } from "./alert.service.js"
import { broadcast } from "../routes/ws.js"
import { logger } from "../lib/logger.js"

export async function evaluateQuorum(
  prisma: PrismaClient,
  monitorId: string,
  orgId: string,
  redis?: Redis
): Promise<void> {
  const ninetySecondsAgo = new Date(Date.now() - 90 * 1000)

  const recentResults = await prisma.checkResult.findMany({
    where: {
      monitorId,
      checkedAt: { gte: ninetySecondsAgo },
    },
    orderBy: { checkedAt: "desc" },
  })

  if (recentResults.length === 0) {
    return
  }

  const latestPerRegion = new Map<string, typeof recentResults[number]>()
  for (const r of recentResults) {
    if (!latestPerRegion.has(r.region)) {
      latestPerRegion.set(r.region, r)
    }
  }

  let downCount = 0
  const affectedRegions: string[] = []
  let rootRegion = ""
  let cause = ""

  for (const [region, result] of latestPerRegion) {
    if (result.status !== "up") {
      downCount++
      affectedRegions.push(region)
      if (!rootRegion) {
        rootRegion = region
        cause = result.errorMessage ?? `Region ${region} reported ${result.status}`
      }
    }
  }

  const openInc = await getOpenIncident(prisma, monitorId)

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { slug: true },
  })
  const orgSlug = org?.slug

  if (downCount >= 2 && !openInc) {
    logger.info({ monitorId, downCount, affectedRegions }, "Quorum threshold met, opening incident")

    const incident = await openIncident(prisma, {
      monitorId,
      orgId,
      rootRegion,
      affectedRegions,
      cause,
    }, redis, orgSlug)

    broadcast("incident_opened", {
      id: incident.id,
      monitorId,
      orgId,
      cause,
      affectedRegions,
      startedAt: incident.startedAt.toISOString(),
    })

    await fanoutAlerts(prisma, monitorId, orgId, "down", incident)
    return
  }

  if (downCount === 0 && openInc) {
    logger.info({ monitorId }, "All regions up, resolving incident")

    const resolved = await resolveIncident(prisma, monitorId, redis, orgSlug)
    if (resolved) {
      broadcast("incident_resolved", {
        id: resolved.id,
        monitorId,
        orgId,
        resolvedAt: resolved.resolvedAt?.toISOString(),
      })
      await fanoutAlerts(prisma, monitorId, orgId, "recovered", resolved)
    }
    return
  }

  logger.debug({ monitorId, downCount, hasOpenIncident: !!openInc }, "No quorum action needed")
}
