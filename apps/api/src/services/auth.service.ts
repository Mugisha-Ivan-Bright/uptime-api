import type { PrismaClient } from "@uptime/db"
import crypto from "crypto"
import bcrypt from "bcrypt"
import { hashPassword, verifyPassword } from "../lib/password.js"
import { signToken } from "../lib/jwt.js"
import { AppError, ErrorCodes } from "../lib/errors.js"

export async function registerOrg(
  prisma: PrismaClient,
  input: { orgName: string; slug: string; email: string; password: string }
) {
  const existingOrg = await prisma.organization.findUnique({ where: { slug: input.slug } })
  if (existingOrg) {
    throw new AppError("Organization slug already exists", 409, "CONFLICT", ErrorCodes.CONFLICT)
  }

  const existingUser = await prisma.user.findUnique({ where: { email: input.email } })
  if (existingUser) {
    throw new AppError("Email already registered", 409, "CONFLICT", ErrorCodes.CONFLICT)
  }

  const passwordHash = await hashPassword(input.password)

  const result = await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: {
        id: crypto.randomUUID(),
        name: input.orgName,
        slug: input.slug,
        plan: "hobby",
      },
    })

    const user = await tx.user.create({
      data: {
        id: crypto.randomUUID(),
        email: input.email,
        passwordHash,
        orgId: org.id,
        role: "owner",
      },
    })

    return { org, user }
  })

  const token = signToken({
    userId: result.user.id,
    orgId: result.org.id,
    plan: result.org.plan,
    role: result.user.role,
  })

  return { org: result.org, user: result.user, token }
}

export async function loginUser(
  prisma: PrismaClient,
  input: { email: string; password: string }
) {
  const user = await prisma.user.findUnique({ where: { email: input.email } })
  if (!user) {
    throw new AppError("Invalid email or password", 401, "UNAUTHORIZED", ErrorCodes.INVALID_CREDENTIALS)
  }

  const valid = await verifyPassword(input.password, user.passwordHash)
  if (!valid) {
    throw new AppError("Invalid email or password", 401, "UNAUTHORIZED", ErrorCodes.INVALID_CREDENTIALS)
  }

  const org = await prisma.organization.findUnique({ where: { id: user.orgId } })
  if (!org) {
    throw new AppError("Organization not found", 500, "INTERNAL_ERROR", ErrorCodes.INTERNAL)
  }

  const token = signToken({
    userId: user.id,
    orgId: org.id,
    plan: org.plan,
    role: user.role,
  })

  return { token, user, org }
}

export async function createApiKey(
  prisma: PrismaClient,
  orgId: string,
  userId: string,
  name: string
) {
  const plainKey = `uptime_${crypto.randomBytes(32).toString("hex")}`
  const keyHash = await bcrypt.hash(plainKey, 12)

  const apiKey = await prisma.apiKey.create({
    data: {
      id: crypto.randomUUID(),
      orgId,
      userId,
      name,
      keyHash,
    },
  })

  return { plainKey, apiKey }
}

export async function revokeApiKey(
  prisma: PrismaClient,
  keyId: string,
  orgId: string
): Promise<void> {
  const key = await prisma.apiKey.findUnique({ where: { id: keyId } })
  if (!key || key.orgId !== orgId) {
    throw new AppError("API key not found", 404, "NOT_FOUND", ErrorCodes.NOT_FOUND)
  }

  await prisma.apiKey.update({
    where: { id: keyId },
    data: { revokedAt: new Date() },
  })
}
