import type { PrismaClient } from "@uptime/db"
import { monitorQueue } from "../queues/monitor.queue.js"
import { AppError, ErrorCodes } from "../lib/errors.js"

type MonitorStatus = "up" | "down" | "degraded" | "timed_out" | "unknown"

interface MonitorWithStatus {
  id: string
  orgId: string
  name: string
  url: string
  type: string
  intervalSeconds: number
  regions: string[]
  httpMethod: string
  expectedStatus: number
  keywordContains: string | null
  sslCheckEnabled: boolean
  timeoutMs: number
  isActive: boolean
  createdAt: Date
  status: MonitorStatus
}

interface MonitorDetail extends MonitorWithStatus {
  checkResults: Array<{
    id: string
    region: string
    checkedAt: Date
    status: string
    responseTimeMs: number
    statusCode: number | null
    errorMessage: string | null
    sslExpiryDays: number | null
  }>
}

type CreateMonitorInput = {
  orgId: string
  name: string
  url: string
  type?: string
  intervalSeconds?: number
  regions: string[]
  httpMethod?: string
  expectedStatus?: number
  keywordContains?: string
  sslCheckEnabled?: boolean
  timeoutMs?: number
}

async function deriveStatus(prisma: PrismaClient, monitorId: string): Promise<MonitorStatus> {
  const latest = await prisma.checkResult.findFirst({
    where: { monitorId },
    orderBy: { checkedAt: "desc" },
  })

  if (!latest) {
    return "unknown"
  }

  return latest.status as MonitorStatus
}

export async function createMonitor(prisma: PrismaClient, input: CreateMonitorInput) {
  const monitor = await prisma.monitor.create({
    data: {
      id: crypto.randomUUID(),
      orgId: input.orgId,
      name: input.name,
      url: input.url,
      type: input.type ?? "http",
      intervalSeconds: input.intervalSeconds ?? 60,
      regions: input.regions,
      httpMethod: input.httpMethod ?? "GET",
      expectedStatus: input.expectedStatus ?? 200,
      keywordContains: input.keywordContains ?? null,
      sslCheckEnabled: input.sslCheckEnabled ?? false,
      timeoutMs: input.timeoutMs ?? 10000,
      isActive: true,
    },
  })

  for (const region of monitor.regions) {
    const jobKey = `monitor:${monitor.id}:${region}`
    await monitorQueue.add(
      jobKey,
      {
        monitorId: monitor.id,
        orgId: monitor.orgId,
        url: monitor.url,
        httpMethod: monitor.httpMethod,
        expectedStatus: monitor.expectedStatus,
        keywordContains: monitor.keywordContains,
        timeoutMs: monitor.timeoutMs,
        region,
        sslCheckEnabled: monitor.sslCheckEnabled,
      },
      {
        repeat: {
          every: monitor.intervalSeconds * 1000,
        },
        jobId: jobKey,
      }
    )
  }

  return monitor
}

export async function getMonitorsByOrg(prisma: PrismaClient, orgId: string): Promise<MonitorWithStatus[]> {
  const monitors = await prisma.monitor.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
  })

  const result: MonitorWithStatus[] = []
  for (const m of monitors) {
    const status = await deriveStatus(prisma, m.id)
    result.push({ ...m, status })
  }

  return result
}

export async function getMonitorById(prisma: PrismaClient, id: string, orgId?: string): Promise<MonitorDetail | null> {
  const monitor = await prisma.monitor.findUnique({ where: { id } })
  if (!monitor) return null
  if (orgId && monitor.orgId !== orgId) return null

  const status = await deriveStatus(prisma, id)

  const checkResults = await prisma.checkResult.findMany({
    where: { monitorId: id },
    orderBy: { checkedAt: "desc" },
    take: 10,
  })

  return {
    ...monitor,
    status,
    checkResults: checkResults.map((cr) => ({
      id: cr.id,
      region: cr.region,
      checkedAt: cr.checkedAt,
      status: cr.status,
      responseTimeMs: cr.responseTimeMs,
      statusCode: cr.statusCode,
      errorMessage: cr.errorMessage,
      sslExpiryDays: cr.sslExpiryDays,
    })),
  }
}

export async function deactivateMonitor(prisma: PrismaClient, id: string, orgId?: string): Promise<void> {
  const monitor = await prisma.monitor.findUnique({ where: { id } })
  if (!monitor || (orgId && monitor.orgId !== orgId)) {
    throw new AppError("Monitor not found", 404, "NOT_FOUND", ErrorCodes.NOT_FOUND)
  }

  await prisma.monitor.update({
    where: { id },
    data: { isActive: false },
  })

  for (const region of monitor.regions) {
    const jobKey = `monitor:${monitor.id}:${region}`
    const repeatableJobs = await monitorQueue.getRepeatableJobs()
    for (const job of repeatableJobs) {
      if (job.key === jobKey) {
        await monitorQueue.removeRepeatableByKey(jobKey)
      }
    }
  }
}
