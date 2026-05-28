import type { PrismaClient } from "@uptime/db"
import { AppError, ErrorCodes } from "../lib/errors.js"

const VALID_TYPES = ["email", "slack", "pagerduty", "webhook"] as const
const VALID_EVENTS = ["down", "recovered", "ssl_expiry"] as const

const CONFIG_SCHEMAS: Record<string, string[]> = {
  email: ["recipient"],
  slack: ["webhookUrl"],
  pagerduty: ["routingKey"],
  webhook: ["url", "secret"],
}

export async function createAlertChannel(
  prisma: PrismaClient,
  orgId: string,
  input: { type: string; config: Record<string, unknown>; notifyOn: string[] }
) {
  if (!VALID_TYPES.includes(input.type as typeof VALID_TYPES[number])) {
    throw new AppError(`Invalid type: ${input.type}. Must be one of: ${VALID_TYPES.join(", ")}`, 400, "VALIDATION_ERROR", undefined)
  }

  for (const event of input.notifyOn) {
    if (!VALID_EVENTS.includes(event as typeof VALID_EVENTS[number])) {
      throw new AppError(`Invalid notifyOn event: ${event}`, 400, "VALIDATION_ERROR", undefined)
    }
  }

  const requiredFields = CONFIG_SCHEMAS[input.type]
  for (const field of requiredFields) {
    if (!input.config[field]) {
      throw new AppError(`Missing required config field: ${field} for type ${input.type}`, 400, "VALIDATION_ERROR", undefined)
    }
  }

  return prisma.alertChannel.create({
    data: {
      id: crypto.randomUUID(),
      orgId,
      type: input.type,
      config: input.config,
      notifyOn: input.notifyOn,
    },
  })
}

export async function getAlertChannels(
  prisma: PrismaClient,
  orgId: string
) {
  return prisma.alertChannel.findMany({
    where: { orgId },
  })
}

export async function deleteAlertChannel(
  prisma: PrismaClient,
  id: string,
  orgId: string
): Promise<void> {
  const channel = await prisma.alertChannel.findUnique({ where: { id } })
  if (!channel || channel.orgId !== orgId) {
    throw new AppError("Alert channel not found", 404, "NOT_FOUND", ErrorCodes.NOT_FOUND)
  }

  await prisma.alertChannel.delete({ where: { id } })
}
