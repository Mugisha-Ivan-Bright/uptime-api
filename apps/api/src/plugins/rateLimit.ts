import type { FastifyInstance } from "fastify"
import fp from "fastify-plugin"
import rateLimit from "@fastify/rate-limit"
import { getRedis } from "./redis.js"
async function rateLimitPlugin(fastify: FastifyInstance) {
  const redis = getRedis()

  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
    redis,
    errorResponseBuilder: (_request, context) => {
      return {
        error: "RATE_LIMIT_EXCEEDED",
        message: `Rate limit exceeded. Max ${context.max} requests per ${context.after}`,
        statusCode: 429,
        code: "RATE_LIMIT_EXCEEDED",
      }
    },
    keyGenerator: (request) => {
      return request.ip
    },
  })
}

export default fp(rateLimitPlugin, { name: "rate-limit" })
