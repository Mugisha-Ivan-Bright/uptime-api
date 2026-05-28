import { Worker } from "bullmq"
import { getPrisma } from "../plugins/prisma.js"
import { getRedis } from "../plugins/redis.js"
import { PLANS } from "../config/plans.js"
import { logger } from "../lib/logger.js"

let worker: Worker | null = null

export function startRetentionWorker(): Worker {
  const prisma = getPrisma()

  worker = new Worker(
    "data-retention",
    async (job) => {
      logger.info("Starting data retention job")

      // Get all organizations
      const orgs = await prisma.organization.findMany({
        select: { id: true, plan: true },
      })

      let totalDeleted = 0

      for (const org of orgs) {
        const limits = PLANS[org.plan as keyof typeof PLANS] ?? PLANS.hobby
        const retentionDays = limits.dataRetentionDays
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

        // Delete old check results for this organization
        const deleted = await prisma.checkResult.deleteMany({
          where: {
            monitor: {
              orgId: org.id,
            },
            checkedAt: {
              lt: cutoffDate,
            },
          },
        })

        const count = deleted.count
        totalDeleted += count

        if (count > 0) {
          logger.info(
            {
              orgId: org.id,
              plan: org.plan,
              deletedCount: count,
              retentionDays,
              cutoffDate: cutoffDate.toISOString(),
            },
            "Deleted old check results"
          )
        }
      }

      logger.info({ totalDeleted: totalDeleted }, "Data retention job completed")
      return { totalDeleted }
    },
    {
      connection: getRedis(),
    }
  )

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id }, "Retention job completed")
  })

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "Retention job failed")
  })

  logger.info("BullMQ worker 'data-retention' started")

  return worker
}

export async function stopRetentionWorker(): Promise<void> {
  if (worker) {
    await worker.close()
    logger.info("BullMQ worker 'data-retention' stopped")
  }
}