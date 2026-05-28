import type { FastifyInstance } from "fastify"
import { createAlertChannel, getAlertChannels, deleteAlertChannel } from "../services/alertChannel.service.js"
import { assertCanCreateAlertChannel } from "../services/plan.service.js"
import { AppError, errorResponse } from "../lib/errors.js"

const createAlertChannelSchema = {
  type: "object",
  required: ["type", "config", "notifyOn"],
  properties: {
    type: { type: "string", enum: ["email", "slack", "pagerduty", "webhook"] },
    config: { type: "object" },
    notifyOn: {
      type: "array",
      minItems: 1,
      items: { type: "string", enum: ["down", "recovered", "ssl_expiry"] },
    },
  },
}

export default async function alertRoutes(fastify: FastifyInstance) {
  fastify.get("/api/v1/alerts", {
    preHandler: [fastify.authenticate],
    schema: { tags: ["Alerts"], summary: "List alert channels" },
  }, async (req, reply) => {
    try {
      const channels = await getAlertChannels(fastify.prisma, req.authContext.orgId)
      return channels
    } catch (err) {
      return reply.status(500).send(
        errorResponse(500, "FETCH_FAILED", (err as Error).message)
      )
    }
  })

  fastify.post("/api/v1/alerts", {
    preHandler: [fastify.authenticate],
    schema: { tags: ["Alerts"], summary: "Create alert channel", body: createAlertChannelSchema },
  }, async (req, reply) => {
    const body = req.body as { type: string; config: Record<string, unknown>; notifyOn: string[] }
    try {
      await assertCanCreateAlertChannel(fastify.prisma, req.authContext.orgId, req.authContext.plan, body.type)
      const channel = await createAlertChannel(fastify.prisma, req.authContext.orgId, body)
      return reply.status(201).send(channel)
    } catch (err) {
      if (err instanceof AppError) {
        return reply.status(err.statusCode).send(
          errorResponse(err.statusCode, err.error, err.message, err.code)
        )
      }
      return reply.status(500).send(
        errorResponse(500, "CREATE_FAILED", (err as Error).message, undefined)
      )
    }
  })

  fastify.delete("/api/v1/alerts/:id", {
    preHandler: [fastify.authenticate],
    schema: { tags: ["Alerts"], summary: "Delete alert channel", params: { type: "object", properties: { id: { type: "string" } } } },
  }, async (req, reply) => {
    const { id } = req.params as { id: string }
    try {
      await deleteAlertChannel(fastify.prisma, id, req.authContext.orgId)
      return { message: "alert channel deleted" }
    } catch (err) {
      if (err instanceof AppError) {
        return reply.status(err.statusCode).send(
          errorResponse(err.statusCode, err.error, err.message, err.code)
        )
      }
      return reply.status(500).send(
        errorResponse(500, "DELETE_FAILED", (err as Error).message, undefined)
      )
    }
  })
}
