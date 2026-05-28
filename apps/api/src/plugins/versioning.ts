import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify"
import fp from "fastify-plugin"
import crypto from "crypto"
import { requestContextStorage } from "../lib/requestContext.js"

declare module "fastify" {
  interface FastifyRequest {
    requestId: string
  }
}

async function versioningPlugin(fastify: FastifyInstance) {
  fastify.decorateRequest("requestId", "")

  fastify.addHook("onRequest", (request: FastifyRequest, _reply: FastifyReply, done: (err?: Error) => void) => {
    const requestId = crypto.randomUUID()
    request.requestId = requestId
    requestContextStorage.run({ requestId }, () => {
      done()
    })
  })

  fastify.addHook("onSend", (request: FastifyRequest, reply: FastifyReply, _payload: unknown, done: (err?: Error) => void) => {
    reply.header("X-API-Version", "v1")
    reply.header("X-Request-Id", request.requestId)
    done()
  })
}

export default fp(versioningPlugin, { name: "versioning" })
