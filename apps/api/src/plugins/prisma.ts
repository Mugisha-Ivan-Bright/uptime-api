import { PrismaClient } from "@uptime/db"
import type { FastifyInstance } from "fastify"
import fp from "fastify-plugin"
import { logger } from "../lib/logger.js"

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient
  }
}

let prismaInstance: PrismaClient | null = null

export function getPrisma(): PrismaClient {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient()
  }
  return prismaInstance
}

async function prismaPlugin(fastify: FastifyInstance) {
  const prisma = getPrisma()

  try {
    await prisma.$connect()
    logger.info("Prisma connected to database")
  } catch (err) {
    logger.error(err, "Failed to connect to database")
    process.exit(1)
  }

  fastify.decorate("prisma", prisma)

  fastify.addHook("onClose", async () => {
    await prisma.$disconnect()
    logger.info("Prisma disconnected")
  })
}

export default fp(prismaPlugin, { name: "prisma" })
