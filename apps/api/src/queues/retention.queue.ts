import { Queue } from "bullmq"
import { getRedis } from "../plugins/redis.js"

let retentionQueue: Queue | null = null

export function getRetentionQueue(): Queue {
  if (!retentionQueue) {
    retentionQueue = new Queue("data-retention", {
      connection: getRedis(),
    })
  }
  return retentionQueue
}