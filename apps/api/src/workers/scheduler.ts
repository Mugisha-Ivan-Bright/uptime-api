import type { PrismaClient } from "@uptime/db"
import type { Queue } from "bullmq"
import { logger } from "../lib/logger.js"

let schedulerInterval: ReturnType<typeof setInterval> | null = null

export async function startScheduler(prisma: PrismaClient, queue: Queue): Promise<void> {
  const monitors = await prisma.monitor.findMany({
    where: { isActive: true },
  })

  logger.info({ count: monitors.length }, "Scheduler starting, found active monitors")

  for (const monitor of monitors) {
    for (const region of monitor.regions) {
      const jobKey = `monitor:${monitor.id}:${region}`

      const existing = await queue.getRepeatableJobs()
      const alreadyExists = existing.some((j) => j.key === jobKey)

      if (alreadyExists) {
        logger.info({ jobKey }, "Repeatable job already exists, skipping")
        continue
      }

      await queue.add(
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

      logger.info({ jobKey, interval: monitor.intervalSeconds }, "Scheduled repeatable job")
    }
  }

  logger.info("Scheduler initialization complete")
}

export async function stopScheduler(queue?: Queue): Promise<void> {
  if (queue) {
    await queue.drain()
    await queue.close()
    logger.info("Scheduler queue drained and closed")
  }
  if (schedulerInterval) {
    clearInterval(schedulerInterval)
    schedulerInterval = null
  }
  logger.info("Scheduler stopped")
}
