import type { PrismaClient } from "@uptime/db"
import type { CheckResultPayload } from "@uptime/types"

export async function saveCheckResult(
  prisma: PrismaClient,
  payload: CheckResultPayload
): Promise<void> {
  await prisma.checkResult.create({
    data: {
      id: crypto.randomUUID(),
      monitorId: payload.monitorId,
      region: payload.region,
      status: payload.status,
      responseTimeMs: payload.responseTimeMs,
      statusCode: payload.statusCode ?? null,
      errorMessage: payload.errorMessage ?? null,
      sslExpiryDays: payload.sslExpiryDays ?? null,
    },
  })
}
