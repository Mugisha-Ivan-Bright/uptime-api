import { Queue } from "bullmq"
import { getRedis } from "../plugins/redis.js"
import { logger } from "../lib/logger.js"

export const monitorQueue = new Queue("monitor-checks", {
  connection: getRedis(),
})

logger.info("BullMQ queue 'monitor-checks' defined")
