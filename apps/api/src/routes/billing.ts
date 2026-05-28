import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify"
import { createCheckoutSession, createCustomerPortalSession, handleWebhookEvent } from "../services/stripe.service.js"
import type { PrismaClient } from "@uptime/db"
import { env } from "../config/env.js"
import { PLANS } from "../config/plans.js"
import { AppError, errorResponse } from "../lib/errors.js"

declare module "fastify" {
  interface FastifyRequest {
    rawBody?: Buffer
  }
}

export async function getPlans(fastify: FastifyInstance) {
  fastify.get("/api/v1/billing/plans", {
    schema: { tags: ["Billing"], summary: "Get plan definitions" },
  }, async () => {
    return PLANS
  })
}

// POST /api/v1/billing/checkout - requires JWT
export async function checkout(fastify: FastifyInstance) {
  fastify.post("/api/v1/billing/checkout", {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ["Billing"],
      summary: "Create Stripe Checkout session",
      body: {
        type: "object",
        required: ["plan"],
        properties: {
          plan: { type: "string", enum: ["starter", "pro", "business"] },
        },
      },
    },
  }, async (req, reply) => {
    const { plan } = req.body as { plan: "starter" | "pro" | "business" }
    const orgId = req.authContext.orgId

    try {
      const sessionUrl = await createCheckoutSession(
        orgId,
        plan,
        `${env.APP_URL}/billing/success`,
        `${env.APP_URL}/billing/cancel`
      )
      return reply.send({ url: sessionUrl })
    } catch (err) {
      if (err instanceof AppError) {
        return reply.status(err.statusCode).send(errorResponse(err.statusCode, err.error, err.message, err.code))
      }
      return reply.status(500).send(errorResponse(500, "CHECKOUT_SESSION_FAILED", (err as Error).message, undefined))
    }
  })
}

// POST /api/v1/billing/portal - requires JWT and stripeCustomerId on org
export async function portal(fastify: FastifyInstance) {
  fastify.post("/api/v1/billing/portal", {
    preHandler: [fastify.authenticate],
    schema: { tags: ["Billing"], summary: "Create Stripe Billing Portal session" },
  }, async (req, reply) => {
    const orgId = req.authContext.orgId
    const prisma = fastify.prisma as PrismaClient

    try {
      const org = await prisma.organization.findUnique({ where: { id: orgId } })
      if (!org) {
        return reply.status(404).send(errorResponse(404, "ORG_NOT_FOUND", "Organization not found"))
      }
      if (!org.stripeCustomerId) {
        return reply.status(400).send(errorResponse(400, "NO_STRIPE_CUSTOMER", "Organization has no Stripe customer ID"))
      }

      const portalUrl = await createCustomerPortalSession(
        org.stripeCustomerId,
        `${env.APP_URL}/billing`
      )
      return reply.send({ url: portalUrl })
    } catch (err) {
      if (err instanceof AppError) {
        return reply.status(err.statusCode).send(errorResponse(err.statusCode, err.error, err.message, err.code))
      }
      return reply.status(500).send(errorResponse(500, "PORTAL_SESSION_FAILED", (err as Error).message, undefined))
    }
  })
}

// POST /api/v1/billing/webhook - no auth, Stripe calls this directly
export async function webhook(fastify: FastifyInstance) {
  await fastify.register(async function webhookScope(scoped: FastifyInstance) {
    scoped.addContentTypeParser('application/json', { parseAs: 'string' }, function (_req: unknown, body: string, done: (err: Error | null, body: string) => void) {
      done(null, body)
    })

    scoped.post("/api/v1/billing/webhook", {
      config: { rateLimit: { max: 500, timeWindow: "1 minute" } },
      schema: { tags: ["Billing"], summary: "Stripe webhook handler" },
      preHandler: [(req: FastifyRequest, _reply: unknown, done: (err?: Error) => void) => {
        if (typeof req.body === 'string') {
          req.rawBody = Buffer.from(req.body, 'utf-8')
        } else if (req.body instanceof Buffer) {
          req.rawBody = req.body
        } else {
          req.rawBody = Buffer.from(JSON.stringify(req.body), 'utf-8')
        }
        done()
      }],
    }, async (req: FastifyRequest, reply: FastifyReply) => {
      const signature = req.headers['stripe-signature'] as string | undefined
      if (!signature) {
        return reply.status(400).send(errorResponse(400, "MISSING_SIGNATURE", "Stripe signature is required"))
      }

      try {
        await handleWebhookEvent(fastify.prisma as PrismaClient, req.rawBody!, signature)
        return reply.send({ received: true })
      } catch (err) {
        console.error('Webhook handling failed:', err)
        return reply.send({ received: true })
      }
    })
  })
}

export default async function billingRoutes(fastify: FastifyInstance) {
  await getPlans(fastify)
  await checkout(fastify)
  await portal(fastify)
  await webhook(fastify)
}