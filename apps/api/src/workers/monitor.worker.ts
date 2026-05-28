import { Worker } from "bullmq"
import type { MonitorJob } from "@uptime/types"
import { getRedis } from "../plugins/redis.js"
import { getPrisma } from "../plugins/prisma.js"
import { runCheck } from "../services/checker.service.js"
import { saveCheckResult } from "../services/checkResult.service.js"
import { evaluateQuorum } from "../services/quorum.service.js"
import { fanoutAlerts } from "../services/alert.service.js"
import { broadcast } from "../routes/ws.js"
import { logger } from "../lib/logger.js"

let worker: Worker | null = null

export function startMonitorWorker(): Worker {
  const prisma = getPrisma()
  const redis = getRedis()

  worker = new Worker(
    "monitor-checks",
    async (job) => {
      const monitorJob = job.data as MonitorJob

      logger.info({ jobId: job.id, monitorId: monitorJob.monitorId }, "Processing monitor check")

      const result = await runCheck(monitorJob)

      await saveCheckResult(prisma, result)

      broadcast("check_result", {
        monitorId: monitorJob.monitorId,
        region: monitorJob.region,
        status: result.status,
        responseTimeMs: result.responseTimeMs,
      })

      if (result.sslExpiryDays !== undefined && result.sslExpiryDays !== null && result.sslExpiryDays <= 14) {
        const pseudoIncident = {
          id: `ssl-${monitorJob.monitorId}-${Date.now()}`,
          startedAt: new Date(),
          affectedRegions: [monitorJob.region],
          cause: `SSL certificate expires in ${result.sslExpiryDays} days`,
        }
        await fanoutAlerts(prisma, monitorJob.monitorId, monitorJob.orgId, "ssl_expiry", pseudoIncident, result.sslExpiryDays)
      }

      await evaluateQuorum(prisma, monitorJob.monitorId, monitorJob.orgId, redis)

      logger.info(
        {
          jobId: job.id,
          monitorId: monitorJob.monitorId,
          region: monitorJob.region,
          status: result.status,
          responseTimeMs: result.responseTimeMs,
        },
        "Monitor check complete"
      )

      return result
    },
    {
      connection: redis,
      concurrency: 5,
    }
  )

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id }, "Job completed")
  })

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "Job failed")
  })

  logger.info("BullMQ worker 'monitor-checks' started with concurrency 5")

  return worker
}

export async function stopMonitorWorker(): Promise<void> {
  if (worker) {
    await worker.close()
    logger.info("BullMQ worker 'monitor-checks' stopped")
  }
}
