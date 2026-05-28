import type { PrismaClient } from "@uptime/db"
import { PLANS, type PlanName } from "../config/plans.js"
import { AppError, ErrorCodes } from "../lib/errors.js"

export async function assertCanCreateMonitor(
  prisma: PrismaClient,
  orgId: string,
  plan: string,
  intervalSeconds: number,
  regions: string[]
): Promise<void> {
  const limits = PLANS[plan as PlanName] ?? PLANS.hobby

  const count = await prisma.monitor.count({ where: { orgId, isActive: true } })
  if (count >= limits.maxMonitors) {
    throw new AppError("Monitor limit reached for your plan. Upgrade to add more.", 403, "FORBIDDEN", ErrorCodes.MONITOR_LIMIT_REACHED)
  }

  if (intervalSeconds < limits.minIntervalSeconds) {
    throw new AppError("Check interval too short for your plan.", 403, "FORBIDDEN", ErrorCodes.INTERVAL_TOO_SHORT)
  }

  if (regions.length > limits.maxRegions) {
    throw new AppError("Too many regions for your plan.", 403, "FORBIDDEN", ErrorCodes.REGION_LIMIT_REACHED)
  }
}

export async function assertCanCreateAlertChannel(
  _prisma: PrismaClient,
  _orgId: string,
  plan: string,
  channelType: string
): Promise<void> {
  const limits = PLANS[plan as PlanName] ?? PLANS.hobby

  if (!limits.alertChannels.includes(channelType as typeof limits.alertChannels[number])) {
    throw new AppError("Alert channel type not available on your plan.", 403, "FORBIDDEN", ErrorCodes.CHANNEL_NOT_ON_PLAN)
  }
}

export function getPlanLimits(plan: string) {
  return PLANS[plan as PlanName] ?? PLANS.hobby
}
