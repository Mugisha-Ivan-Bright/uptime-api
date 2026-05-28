import type { PrismaClient } from "@uptime/db"
import type { AlertPayload } from "@uptime/types"
import { Resend } from "resend"
import { env } from "../config/env.js"
import { getRedis } from "../plugins/redis.js"
import { logger } from "../lib/logger.js"

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null

type AlertEvent = "down" | "recovered" | "ssl_expiry"

function buildPayload(
  event: AlertEvent,
  monitorName: string,
  monitorUrl: string,
  incident: { id: string; startedAt: Date; resolvedAt?: Date | null; affectedRegions: string[]; cause: string },
  sslExpiryDays?: number
): AlertPayload {
  return {
    event,
    monitorName,
    monitorUrl,
    incidentId: incident.id,
    startedAt: incident.startedAt.toISOString(),
    resolvedAt: incident.resolvedAt?.toISOString(),
    affectedRegions: incident.affectedRegions,
    cause: incident.cause,
    sslExpiryDays,
  }
}

async function emailAdapter(config: Record<string, unknown>, payload: AlertPayload): Promise<void> {
  if (!resend) {
    logger.warn("RESEND_API_KEY not configured, skipping email alert")
    return
  }
  let subject: string
  if (payload.event === "ssl_expiry") {
    subject = `SSL certificate expiring: ${payload.monitorUrl} (${payload.sslExpiryDays} days)`
  } else if (payload.event === "down") {
    subject = `Monitor down: ${payload.monitorUrl}`
  } else {
    subject = `Monitor recovered: ${payload.monitorUrl}`
  }

  const body = [
    `Event: ${payload.event}`,
    `Monitor: ${payload.monitorName}`,
    `URL: ${payload.monitorUrl}`,
    `Incident: ${payload.incidentId}`,
    `Started: ${payload.startedAt}`,
    payload.resolvedAt ? `Resolved: ${payload.resolvedAt}` : null,
    `Regions: ${payload.affectedRegions.join(", ")}`,
    `Cause: ${payload.cause}`,
    payload.sslExpiryDays !== undefined ? `SSL expiry: ${payload.sslExpiryDays} days` : null,
  ].filter(Boolean).join("\n")

  await resend.emails.send({
    from: "uptime@notifications.local",
    to: config.recipient as string,
    subject,
    text: body,
  })
}

async function slackAdapter(config: Record<string, unknown>, payload: AlertPayload): Promise<void> {
  const text = `${payload.event}: ${payload.monitorUrl} — ${payload.cause}`
  await fetch(config.webhookUrl as string, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  })
}

async function pagerdutyAdapter(config: Record<string, unknown>, payload: AlertPayload): Promise<void> {
  let eventAction: string
  if (payload.event === "down" || payload.event === "ssl_expiry") {
    eventAction = "trigger"
  } else {
    eventAction = "resolve"
  }

  await fetch("https://events.pagerduty.com/v2/enqueue", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      routing_key: config.routingKey,
      event_action: eventAction,
      payload: {
        summary: `${payload.event}: ${payload.monitorUrl} — ${payload.cause}`,
        source: payload.monitorUrl,
        severity: payload.event === "ssl_expiry" ? "warning" : "critical",
      },
    }),
  })
}

async function webhookAdapter(config: Record<string, unknown>, payload: AlertPayload): Promise<void> {
  await fetch(config.url as string, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Uptime-Secret": config.secret as string,
    },
    body: JSON.stringify(payload),
  })
}

export async function fanoutAlerts(
  prisma: PrismaClient,
  monitorId: string,
  orgId: string,
  event: AlertEvent,
  incident: { id: string; startedAt: Date; resolvedAt?: Date | null; affectedRegions: string[]; cause: string },
  sslExpiryDays?: number
): Promise<void> {
  const channels = await prisma.alertChannel.findMany({
    where: {
      orgId,
      notifyOn: { has: event },
    },
  })

  if (channels.length === 0) {
    logger.info({ orgId, monitorId, event }, "No alert channels configured for this event")
    return
  }

  const monitor = await prisma.monitor.findUnique({ where: { id: monitorId } })
  const monitorName = monitor?.name ?? ""
  const monitorUrl = monitor?.url ?? ""

  const redis = getRedis()
  const payload = buildPayload(event, monitorName, monitorUrl, incident, sslExpiryDays)

  const results = await Promise.allSettled(
    channels.map(async (channel) => {
      const idempotencyKey = `alert:${monitorId}:${event}:${channel.id}:${incident.id}`

      const set = await redis.set(idempotencyKey, "1", "EX", 300, "NX")
      if (set !== "OK") {
        logger.info({ key: idempotencyKey }, "alert already sent, skipping")
        return
      }

      logger.info({ channelType: channel.type, monitorId, event }, "[adapter] sending alert")

      switch (channel.type) {
        case "email":
          await emailAdapter(channel.config as Record<string, unknown>, payload)
          break
        case "slack":
          await slackAdapter(channel.config as Record<string, unknown>, payload)
          break
        case "pagerduty":
          await pagerdutyAdapter(channel.config as Record<string, unknown>, payload)
          break
        case "webhook":
          await webhookAdapter(channel.config as Record<string, unknown>, payload)
          break
        default:
          logger.warn({ channelType: channel.type }, "Unknown alert channel type")
      }
    })
  )

  for (const result of results) {
    if (result.status === "rejected") {
      logger.error({ err: result.reason }, "Alert adapter failed")
    }
  }
}
