import type { FastifyInstance } from "fastify"
import {
  getIncidentsByOrg,
  getIncidentById,
  acknowledgeIncident,
} from "../services/incident.service.js"
import { AppError, errorResponse } from "../lib/errors.js"

const acknowledgeSchema = {
  type: "object",
  required: ["acknowledgedBy"],
  properties: {
    acknowledgedBy: { type: "string", maxLength: 1000 },
  },
}

export default async function incidentRoutes(fastify: FastifyInstance) {
  fastify.get("/api/v1/incidents", {
    preHandler: [fastify.authenticate],
    schema: { tags: ["Incidents"], summary: "List incidents" },
  }, async (req, reply) => {
    try {
      const incidents = await getIncidentsByOrg(fastify.prisma, req.authContext.orgId)
      return incidents
    } catch (err) {
      return reply.status(500).send(
        errorResponse(500, "FETCH_FAILED", (err as Error).message, undefined)
      )
    }
  })

  fastify.get("/api/v1/incidents/:id", {
    preHandler: [fastify.authenticate],
    schema: { tags: ["Incidents"], summary: "Get incident detail", params: { type: "object", properties: { id: { type: "string" } } } },
  }, async (req, reply) => {
    const { id } = req.params as { id: string }
    try {
      const incident = await getIncidentById(fastify.prisma, id)

      if (!incident || incident.orgId !== req.authContext.orgId) {
        return reply.status(404).send(
          errorResponse(404, "NOT_FOUND", "Incident not found")
        )
      }

      const checkResults = await fastify.prisma.checkResult.findMany({
        where: {
          monitorId: incident.monitorId,
          checkedAt: {
            gte: incident.startedAt,
            lte: incident.resolvedAt ?? new Date(),
          },
        },
        orderBy: { checkedAt: "desc" },
      })

      return { ...incident, checkResults }
    } catch (err) {
      return reply.status(500).send(
        errorResponse(500, "FETCH_FAILED", (err as Error).message, undefined)
      )
    }
  })

  fastify.post("/api/v1/incidents/:id/acknowledge", {
    preHandler: [fastify.authenticate],
    schema: { tags: ["Incidents"], summary: "Acknowledge incident", params: { type: "object", properties: { id: { type: "string" } } }, body: acknowledgeSchema },
  }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = req.body as { acknowledgedBy: string }

    try {
      const incident = await acknowledgeIncident(fastify.prisma, id, body.acknowledgedBy, req.authContext.orgId)
      return incident
    } catch (err) {
      if (err instanceof AppError) {
        return reply.status(err.statusCode).send(
          errorResponse(err.statusCode, err.error, err.message, err.code)
        )
      }
      return reply.status(500).send(
        errorResponse(500, "ACKNOWLEDGE_FAILED", (err as Error).message, undefined)
      )
    }
  })
}
