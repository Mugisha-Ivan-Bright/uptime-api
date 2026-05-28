import Fastify from "fastify"
import cors from "@fastify/cors"
import { env } from "./config/env.js"
import { logger } from "./lib/logger.js"

import prismaPlugin from "./plugins/prisma.js"
import redisPlugin from "./plugins/redis.js"
import authPlugin from "./plugins/auth.js"
import rateLimitPlugin from "./plugins/rateLimit.js"
import versioningPlugin from "./plugins/versioning.js"
import swaggerPlugin from "./plugins/swagger.js"
import websocket from "@fastify/websocket"

import authRoutes from "./routes/auth.js"
import monitorRoutes from "./routes/monitors.js"
import incidentRoutes from "./routes/incidents.js"
import orgRoutes from "./routes/orgs.js"
import alertRoutes from "./routes/alerts.js"
import statusPageRoutes from "./routes/statusPage.js"
import billingRoutes from "./routes/billing.js"
import wsRoutes from "./routes/ws.js"

import { registerErrorHandler } from "./lib/errors.js"
import { startMonitorWorker, stopMonitorWorker } from "./workers/monitor.worker.js"
import { startScheduler, stopScheduler } from "./workers/scheduler.js"
import { monitorQueue } from "./queues/monitor.queue.js"
import { startRetentionWorker, stopRetentionWorker } from "./workers/retention.worker.js"
import { getRetentionQueue } from "./queues/retention.queue.js"

async function main() {
  const fastify = Fastify({
    logger: false,
  })

  await fastify.register(cors)

  await fastify.register(prismaPlugin)
  await fastify.register(redisPlugin)
  await fastify.register(rateLimitPlugin)
  await fastify.register(versioningPlugin)
  await fastify.register(websocket)

  registerErrorHandler(fastify)

  await fastify.register(authPlugin)
  await fastify.register(swaggerPlugin)

    await fastify.register(authRoutes)
    await fastify.register(monitorRoutes)
    await fastify.register(incidentRoutes)
    await fastify.register(orgRoutes)
    await fastify.register(alertRoutes)
    await fastify.register(statusPageRoutes)
    await fastify.register(billingRoutes)
    await fastify.register(wsRoutes)

  fastify.get("/health", {
    schema: { tags: ["Health"], summary: "Health check" },
  }, async (_req, reply) => {
    let dbStatus: string = "ok"
    let redisStatus: string = "ok"
    let queueStatus: string = "ok"

    try {
      await fastify.prisma.$queryRaw`SELECT 1`
    } catch (err) {
      logger.error({ err }, "Health check: database check failed")
      dbStatus = "error"
    }

    try {
      const pong = await fastify.redis.ping()
      if (pong !== "PONG") {
        redisStatus = "error"
      }
    } catch (err) {
      logger.error({ err }, "Health check: redis check failed")
      redisStatus = "error"
    }

    try {
      await monitorQueue.getJobCounts()
    } catch (err) {
      logger.error({ err }, "Health check: queue check failed")
      queueStatus = "error"
    }

    const overallStatus = (dbStatus === "ok" && redisStatus === "ok" && queueStatus === "ok") ? "ok" : "degraded"

    return reply.status(200).send({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      dependencies: {
        database: dbStatus,
        redis: redisStatus,
        queue: queueStatus,
      },
    })
  })

   await fastify.listen({ port: env.PORT, host: "0.0.0.0" })
   logger.info({ port: env.PORT }, "Server listening")

   startMonitorWorker()
   await startScheduler(fastify.prisma, monitorQueue)
   startRetentionWorker()

   const shutdown = async (signal: string) => {
     logger.info({ signal }, "Shutdown signal received")
     await stopMonitorWorker()
     await stopScheduler(monitorQueue)
     await stopRetentionWorker()

     await fastify.close()
     process.exit(0)
   }

  process.on("SIGINT", () => shutdown("SIGINT"))
  process.on("SIGTERM", () => shutdown("SIGTERM"))
}

main().catch((err) => {
  logger.error(err, "Failed to start server")
  process.exit(1)
})
