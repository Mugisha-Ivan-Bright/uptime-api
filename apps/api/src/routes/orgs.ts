import type { FastifyInstance } from "fastify"
import { getOrgBySlug, getOrgMe, updateOrgName } from "../services/org.service.js"
import { AppError, errorResponse } from "../lib/errors.js"

const updateOrgSchema = {
  type: "object",
  required: ["name"],
  properties: {
    name: { type: "string", maxLength: 100 },
  },
}

export default async function orgRoutes(fastify: FastifyInstance) {
  fastify.get("/api/v1/orgs/:slug/public", {
    schema: { tags: ["Organizations"], summary: "Public org lookup", params: { type: "object", properties: { slug: { type: "string" } } } },
  }, async (req, reply) => {
    const { slug } = req.params as { slug: string }
    try {
      const org = await getOrgBySlug(fastify.prisma, slug)
      return org
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

  fastify.get("/api/v1/orgs/me", {
    preHandler: [fastify.authenticate],
    schema: { tags: ["Organizations"], summary: "Get my org + user info" },
  }, async (req, reply) => {
    try {
      const result = await getOrgMe(fastify.prisma, req.authContext.orgId, req.authContext.userId!)
      return result
    } catch (err) {
      return reply.status(500).send(
        errorResponse(500, "FETCH_FAILED", (err as Error).message, undefined)
      )
    }
  })

  fastify.patch("/api/v1/orgs/me", {
    preHandler: [fastify.authenticate],
    schema: { tags: ["Organizations"], summary: "Update org name", body: updateOrgSchema },
  }, async (req, reply) => {
    const body = req.body as { name: string }
    try {
      const org = await updateOrgName(fastify.prisma, req.authContext.orgId, body.name)
      return org
    } catch (err) {
      return reply.status(500).send(
        errorResponse(500, "UPDATE_FAILED", (err as Error).message, undefined)
      )
    }
  })
}
