import type Redis from "ioredis"
import type { PrismaClient } from "@uptime/db"
import type { StatusPageData } from "@uptime/types"
import { getStatusPageData } from "./statusPage.service.js"
import { logger } from "../lib/logger.js"

const CACHE_TTL = 120

export async function getCachedStatusPage(
  redis: Redis,
  prisma: PrismaClient,
  orgSlug: string
): Promise<StatusPageData> {
  const cacheKey = `status-page:${orgSlug}`

  const cached = await redis.get(cacheKey)
  if (cached) {
    logger.info({ slug: orgSlug }, "status page cache hit")
    return JSON.parse(cached) as StatusPageData
  }

  logger.info({ slug: orgSlug }, "status page cache miss")
  const data = await getStatusPageData(prisma, orgSlug)
  await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(data))
  return data
}

export async function invalidateStatusPageCache(
  redis: Redis,
  orgSlug: string
): Promise<void> {
  const cacheKey = `status-page:${orgSlug}`
  await redis.del(cacheKey)
  logger.info({ slug: orgSlug }, "status page cache invalidated")
}
