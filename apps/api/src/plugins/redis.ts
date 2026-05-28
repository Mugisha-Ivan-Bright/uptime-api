import Redis from "ioredis"
import type { FastifyInstance } from "fastify"
import fp from "fastify-plugin"
import { env } from "../config/env.js"
import { logger } from "../lib/logger.js"

declare module "fastify" {
  interface FastifyInstance {
    redis: Redis
  }
}

let redisInstance: Redis | null = null

export function getRedis(): Redis {
  if (!redisInstance) {
    redisInstance = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
    })
  }
  return redisInstance
}

async function redisPlugin(fastify: FastifyInstance) {
  const redis = getRedis()

  try {
    await redis.ping()
    logger.info("Redis connected")
  } catch (err) {
    logger.warn(err, "Failed to connect to Redis - continuing without Redis (some features may be limited)")
    // Don't exit in development - allow the server to start
    if (env.NODE_ENV !== "development") {
      logger.error(err, "Failed to connect to Redis")
      process.exit(1)
    }
  }

  fastify.decorate("redis", redis)

  fastify.addHook("onClose", async () => {
    if (redis) {
      await redis.disconnect()
      logger.info("Redis disconnected")
    }
  })
}

export default fp(redisPlugin, { name: "redis" })
