import { logger } from "./logger.js"

export const ErrorCodes = {
  MONITOR_LIMIT_REACHED:      "MONITOR_LIMIT_REACHED",
  INTERVAL_TOO_SHORT:         "INTERVAL_TOO_SHORT",
  REGION_LIMIT_REACHED:       "REGION_LIMIT_REACHED",
  CHANNEL_NOT_ON_PLAN:        "CHANNEL_NOT_ON_PLAN",
  INVALID_CREDENTIALS:        "INVALID_CREDENTIALS",
  UNAUTHORIZED:               "UNAUTHORIZED",
  NOT_FOUND:                  "NOT_FOUND",
  CONFLICT:                   "CONFLICT",
  STRIPE_WEBHOOK_INVALID:     "STRIPE_WEBHOOK_INVALID",
  INTERNAL:                   "INTERNAL",
} as const

export class AppError extends Error {
  constructor(
    override message: string,
    public statusCode: number,
    public error: string,
    public code?: string
  ) {
    super(message)
    this.name = "AppError"
  }
}

export function errorResponse(statusCode: number, error: string, message: string, code?: string) {
  return {
    error,
    message,
    statusCode,
    ...(code ? { code } : {}),
  }
}

export function registerErrorHandler(fastify: import("fastify").FastifyInstance): void {
  fastify.setErrorHandler((err, _request, reply) => {
    if (err instanceof AppError) {
      logger.warn({ statusCode: err.statusCode, error: err.error, message: err.message, code: err.code }, "AppError")
      return reply.status(err.statusCode).send({
        error: err.error,
        message: err.message,
        statusCode: err.statusCode,
        ...(err.code ? { code: err.code } : {}),
      })
    }

    logger.error({ err }, "Unhandled error")
    return reply.status(500).send({
      error: "InternalServerError",
      message: "Something went wrong",
      statusCode: 500,
      code: ErrorCodes.INTERNAL,
    })
  })
}
