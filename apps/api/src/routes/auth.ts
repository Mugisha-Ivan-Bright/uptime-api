import type { FastifyInstance } from "fastify"
import { registerOrg, loginUser, createApiKey, revokeApiKey } from "../services/auth.service.js"
import { AppError, errorResponse } from "../lib/errors.js"

const registerSchema = {
  type: "object",
  required: ["orgName", "slug", "email", "password"],
  properties: {
    orgName: { type: "string", maxLength: 100 },
    slug: { type: "string", maxLength: 63, pattern: "^[a-z0-9-]+$" },
    email: { type: "string", maxLength: 255, pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$" },
    password: { type: "string", minLength: 8, maxLength: 128 },
  },
}

const loginSchema = {
  type: "object",
  required: ["email", "password"],
  properties: {
    email: { type: "string", maxLength: 255 },
    password: { type: "string", maxLength: 128 },
  },
}

const createApiKeySchema = {
  type: "object",
  required: ["name"],
  properties: {
    name: { type: "string", maxLength: 100 },
  },
}

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.post("/api/v1/auth/register", {
    schema: { tags: ["Auth"], summary: "Register organization + user", body: registerSchema },
    config: { rateLimit: { max: 5, timeWindow: "1 minute" } },
  }, async (req, reply) => {
    const body = req.body as { orgName: string; slug: string; email: string; password: string }
    try {
      const result = await registerOrg(fastify.prisma, body)
      return reply.status(201).send({
        token: result.token,
        user: { id: result.user.id, email: result.user.email, role: result.user.role },
        org: { id: result.org.id, name: result.org.name, slug: result.org.slug, plan: result.org.plan },
      })
    } catch (err) {
      if (err instanceof AppError) {
        return reply.status(err.statusCode).send(
          errorResponse(err.statusCode, err.error, err.message, err.code)
        )
      }
      return reply.status(500).send(
        errorResponse(500, "REGISTER_FAILED", (err as Error).message)
      )
    }
  })

  fastify.post("/api/v1/auth/login", {
    schema: { tags: ["Auth"], summary: "Login, returns JWT", body: loginSchema },
    config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
  }, async (req, reply) => {
    const body = req.body as { email: string; password: string }
    try {
      const result = await loginUser(fastify.prisma, body)
      return {
        token: result.token,
        user: { id: result.user.id, email: result.user.email, role: result.user.role },
        org: { id: result.org.id, name: result.org.name, slug: result.org.slug, plan: result.org.plan },
      }
    } catch (err) {
      if (err instanceof AppError) {
        return reply.status(err.statusCode).send(
          errorResponse(err.statusCode, err.error, err.message, err.code)
        )
      }
      return reply.status(500).send(
        errorResponse(500, "LOGIN_FAILED", (err as Error).message)
      )
    }
  })

  fastify.post("/api/v1/auth/api-keys", {
    preHandler: [fastify.authenticate],
    schema: { tags: ["Auth"], summary: "Create API key", body: createApiKeySchema, security: [{ bearerAuth: [] }] },
  }, async (req, reply) => {
    const body = req.body as { name: string }
    const authContext = req.authContext
    if (!authContext) {
      return reply.status(401).send(errorResponse(401, "UNAUTHORIZED", "Authentication required"))
    }
    try {
      const result = await createApiKey(fastify.prisma, authContext.orgId, authContext.userId!, body.name)
      return reply.status(201).send({
        plainKey: result.plainKey,
        apiKey: { id: result.apiKey.id, name: result.apiKey.name, createdAt: result.apiKey.createdAt },
        warning: "Store this key securely. It will not be shown again.",
      })
    } catch (err) {
      return reply.status(500).send(
        errorResponse(500, "API_KEY_CREATE_FAILED", (err as Error).message)
      )
    }
  })

  fastify.delete("/api/v1/auth/api-keys/:keyId", {
    preHandler: [fastify.authenticate],
    schema: { tags: ["Auth"], summary: "Revoke API key", params: { type: "object", properties: { keyId: { type: "string" } } } },
  }, async (req, reply) => {
    const { keyId } = req.params as { keyId: string }
    const authContext = req.authContext
    if (!authContext) {
      return reply.status(401).send(errorResponse(401, "UNAUTHORIZED", "Authentication required"))
    }
    try {
      await revokeApiKey(fastify.prisma, keyId, authContext.orgId)
      return { message: "API key revoked" }
    } catch (err) {
      if (err instanceof AppError) {
        return reply.status(err.statusCode).send(
          errorResponse(err.statusCode, err.error, err.message, err.code)
        )
      }
      return reply.status(500).send(
        errorResponse(500, "API_KEY_REVOKE_FAILED", (err as Error).message)
      )
    }
  })
}
