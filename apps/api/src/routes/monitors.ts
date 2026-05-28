import type { FastifyInstance } from "fastify"
import { createMonitor, getMonitorsByOrg, getMonitorById, deactivateMonitor } from "../services/monitor.service.js"
import { assertCanCreateMonitor } from "../services/plan.service.js"
import { AppError, errorResponse } from "../lib/errors.js"

const createMonitorSchema = {
  type: "object",
  required: ["name", "url", "regions"],
  properties: {
    name: { type: "string", maxLength: 100 },
    url: { type: "string", maxLength: 2048 },
    type: { type: "string", enum: ["http"], default: "http" },
    intervalSeconds: { type: "integer", default: 60 },
    regions: { type: "array", items: { type: "string", maxLength: 63 }, minItems: 1 },
    httpMethod: { type: "string", enum: ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"], default: "GET" },
    expectedStatus: { type: "integer", default: 200 },
    keywordContains: { type: "string", maxLength: 1000 },
    sslCheckEnabled: { type: "boolean", default: false },
    timeoutMs: { type: "integer", default: 10000 },
  },
}

export default async function monitorRoutes(fastify: FastifyInstance) {
  fastify.post("/api/v1/monitors", {
    preHandler: [fastify.authenticate],
    schema: { tags: ["Monitors"], summary: "Create a monitor", body: createMonitorSchema },
  }, async (req, reply) => {
    const body = req.body as Record<string, unknown>
    const intervalSeconds = (body.intervalSeconds as number) ?? 60
    const regions = body.regions as string[]
    try {
      await assertCanCreateMonitor(fastify.prisma, req.authContext.orgId, req.authContext.plan, intervalSeconds, regions)
      const monitor = await createMonitor(fastify.prisma, {
        orgId: req.authContext.orgId,
        name: body.name as string,
        url: body.url as string,
        type: body.type as string | undefined,
        intervalSeconds: body.intervalSeconds as number | undefined,
        regions: body.regions as string[],
        httpMethod: body.httpMethod as string | undefined,
        expectedStatus: body.expectedStatus as number | undefined,
        keywordContains: body.keywordContains as string | undefined,
        sslCheckEnabled: body.sslCheckEnabled as boolean | undefined,
        timeoutMs: body.timeoutMs as number | undefined,
      })
      return reply.status(201).send(monitor)
    } catch (err) {
      if (err instanceof AppError) {
        return reply.status(err.statusCode).send(
          errorResponse(err.statusCode, err.error, err.message, err.code)
        )
      }
      return reply.status(400).send(
        errorResponse(400, "CREATE_FAILED", (err as Error).message)
      )
    }
  })

  fastify.get("/api/v1/monitors", {
    preHandler: [fastify.authenticate],
    schema: { tags: ["Monitors"], summary: "List monitors" },
  }, async (req, reply) => {
    try {
      const monitors = await getMonitorsByOrg(fastify.prisma, req.authContext.orgId)
      return monitors
    } catch (err) {
      return reply.status(500).send(
        errorResponse(500, "FETCH_FAILED", (err as Error).message, undefined)
      )
    }
  })

  fastify.get("/api/v1/monitors/:id", {
    preHandler: [fastify.authenticate],
    schema: { tags: ["Monitors"], summary: "Get monitor detail", params: { type: "object", properties: { id: { type: "string" } } } },
  }, async (req, reply) => {
    const { id } = req.params as { id: string }
    try {
      const monitor = await getMonitorById(fastify.prisma, id, req.authContext.orgId)
      if (!monitor) {
        return reply.status(404).send(
          errorResponse(404, "NOT_FOUND", "Monitor not found")
        )
      }
      return monitor
    } catch (err) {
      return reply.status(500).send(
        errorResponse(500, "FETCH_FAILED", (err as Error).message, undefined)
      )
    }
  })

  fastify.delete("/api/v1/monitors/:id", {
    preHandler: [fastify.authenticate],
    schema: { tags: ["Monitors"], summary: "Deactivate monitor", params: { type: "object", properties: { id: { type: "string" } } } },
  }, async (req, reply) => {
    const { id } = req.params as { id: string }
    try {
      await deactivateMonitor(fastify.prisma, id, req.authContext.orgId)
      return { message: "monitor deactivated" }
    } catch (err) {
      if (err instanceof AppError) {
        return reply.status(err.statusCode).send(
          errorResponse(err.statusCode, err.error, err.message, err.code)
        )
      }
      return reply.status(500).send(
        errorResponse(500, "DEACTIVATE_FAILED", (err as Error).message, undefined)
      )
    }
  })
}
