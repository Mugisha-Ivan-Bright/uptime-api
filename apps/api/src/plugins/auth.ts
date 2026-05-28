import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify"
import fp from "fastify-plugin"
import bcrypt from "bcrypt"
import { verifyToken } from "../lib/jwt.js"
import { AppError, ErrorCodes } from "../lib/errors.js"
import type { AuthContext } from "@uptime/types"

declare module "fastify" {
  interface FastifyRequest {
    authContext: AuthContext
  }
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

async function authPlugin(fastify: FastifyInstance) {
  fastify.decorate("authenticate", async (request: FastifyRequest, _reply: FastifyReply) => {
    const header = request.headers.authorization
    if (!header) {
      throw new AppError("Missing authorization header", 401, "UNAUTHORIZED", ErrorCodes.UNAUTHORIZED)
    }

    const [scheme, credentials] = header.split(" ")
    if (!credentials) {
      throw new AppError("Invalid authorization header format", 401, "UNAUTHORIZED", ErrorCodes.UNAUTHORIZED)
    }

     if (scheme === "Bearer") {
       const payload = verifyToken(credentials)
       request.authContext = {
         orgId: payload.orgId,
         userId: payload.userId,
         plan: payload.plan,
         authMethod: "jwt",
       }
       return
     }

    if (scheme === "ApiKey") {
      const allKeys = await fastify.prisma.apiKey.findMany({
        where: { revokedAt: null },
      })

      let matchedKey = false
      for (const key of allKeys) {
        const valid = await bcrypt.compare(credentials, key.keyHash)
        if (valid) {
          await fastify.prisma.apiKey.update({
            where: { id: key.id },
            data: { lastUsedAt: new Date() },
          })

          const org = await fastify.prisma.organization.findUnique({
            where: { id: key.orgId },
          })

          request.authContext = {
            orgId: key.orgId,
            userId: key.userId,
            plan: org?.plan ?? "hobby",
            authMethod: "apikey",
          }
          matchedKey = true
          break
        }
      }

      if (!matchedKey) {
        throw new AppError("Invalid API key", 401, "UNAUTHORIZED", ErrorCodes.UNAUTHORIZED)
      }
      return
    }

    throw new AppError("Unsupported authorization scheme", 401, "UNAUTHORIZED", ErrorCodes.UNAUTHORIZED)
  })
}

export default fp(authPlugin, { name: "auth" })
