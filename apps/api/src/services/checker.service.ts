import type { MonitorJob, CheckResultPayload } from "@uptime/types"
import { logger } from "../lib/logger.js"

export async function runCheck(job: MonitorJob): Promise<CheckResultPayload> {
  const start = performance.now()

  if (job.sslCheckEnabled && job.url.startsWith("https://")) {
    logger.warn("TLS certificate expiry inspection not feasible in current runtime, skipping")
  }

  try {
    const response = await fetch(job.url, {
      method: job.httpMethod || "GET",
      signal: AbortSignal.timeout(job.timeoutMs),
    })

    const responseTimeMs = Math.round(performance.now() - start)

    const statusCode = response.status

    if (statusCode !== job.expectedStatus) {
      return {
        monitorId: job.monitorId,
        region: job.region,
        status: "down",
        responseTimeMs,
        statusCode,
        errorMessage: `Expected status ${job.expectedStatus}, got ${statusCode}`,
      }
    }

    if (job.keywordContains) {
      const body = await response.text()
      if (!body.includes(job.keywordContains)) {
        return {
          monitorId: job.monitorId,
          region: job.region,
          status: "down",
          responseTimeMs,
          statusCode,
          errorMessage: `Keyword "${job.keywordContains}" not found in response body`,
        }
      }
    }

    return {
      monitorId: job.monitorId,
      region: job.region,
      status: "up",
      responseTimeMs,
      statusCode,
    }
  } catch (err) {
    const responseTimeMs = Math.round(performance.now() - start)

    if (err instanceof DOMException && err.name === "TimeoutError") {
      return {
        monitorId: job.monitorId,
        region: job.region,
        status: "timed_out",
        responseTimeMs,
        errorMessage: "Request timed out",
      }
    }

    return {
      monitorId: job.monitorId,
      region: job.region,
      status: "down",
      responseTimeMs,
      errorMessage: (err as Error).message,
    }
  }
}
