import type { FastifyInstance } from "fastify"
import { getCachedStatusPage } from "../services/statusPageCache.service.js"
import { getStatusPageData, getPaginatedIncidents } from "../services/statusPage.service.js"
import { errorResponse } from "../lib/errors.js"
import { AppError } from "../lib/errors.js"

const paginatedIncidentsQuery = {
  type: "object",
  properties: {
    page: { type: "string", pattern: "^[0-9]+$", default: "1" },
    limit: { type: "string", pattern: "^[0-9]+$", default: "20" },
  },
}

export default async function statusPageRoutes(fastify: FastifyInstance) {
  fastify.get("/api/v1/status/:slug", {
    schema: { tags: ["Status Page"], summary: "Get status page data", params: { type: "object", properties: { slug: { type: "string" } } } },
  }, async (req, reply) => {
    const { slug } = req.params as { slug: string }
    try {
      const data = await getCachedStatusPage(fastify.redis, fastify.prisma, slug)
      return data
    } catch (err) {
      if (err instanceof AppError) {
        return reply.status(err.statusCode).send(
          errorResponse(err.statusCode, err.error, err.message, err.code)
        )
      }
      return reply.status(500).send(
        errorResponse(500, "FETCH_FAILED", (err as Error).message, undefined)
      )
    }
  })

  fastify.get("/api/v1/status/:slug/monitors/:monitorId", {
    schema: { tags: ["Status Page"], summary: "Get single monitor on status page", params: { type: "object", properties: { slug: { type: "string" }, monitorId: { type: "string" } } } },
  }, async (req, reply) => {
    const { slug, monitorId } = req.params as { slug: string; monitorId: string }
    try {
      const data = await getStatusPageData(fastify.prisma, slug)
      const monitor = data.monitors.find((m) => m.id === monitorId)
      if (!monitor) {
        return reply.status(404).send(
          errorResponse(404, "NOT_FOUND", "Monitor not found")
        )
      }
      return monitor
    } catch (err) {
      if (err instanceof AppError) {
        return reply.status(err.statusCode).send(
          errorResponse(err.statusCode, err.error, err.message, err.code)
        )
      }
      return reply.status(500).send(
        errorResponse(500, "FETCH_FAILED", (err as Error).message, undefined)
      )
    }
  })

  fastify.get("/api/v1/status/:slug/incidents", {
    schema: { querystring: paginatedIncidentsQuery },
  }, async (req, reply) => {
    const { slug } = req.params as { slug: string }
    const query = req.query as { page?: string; limit?: string }
    const page = Math.max(1, parseInt(query.page ?? "1", 10) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? "20", 10) || 20))

    try {
      const result = await getPaginatedIncidents(fastify.prisma, slug, page, limit)
      return result
    } catch (err) {
      if (err instanceof AppError) {
        return reply.status(err.statusCode).send(
          errorResponse(err.statusCode, err.error, err.message, err.code)
        )
      }
      return reply.status(500).send(
        errorResponse(500, "FETCH_FAILED", (err as Error).message, undefined)
      )
    }
  })
}
