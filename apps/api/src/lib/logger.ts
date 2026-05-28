import pino from "pino"
import { env } from "../config/env.js"
import { getRequestContext } from "./requestContext.js"

const baseLogger = pino({
  level: env.NODE_ENV === "production" ? "info" : "debug",
  transport:
    env.NODE_ENV !== "production"
      ? { target: "pino/file", options: { destination: 1 } }
      : undefined,
  mixin() {
    const ctx = getRequestContext()
    if (ctx) {
      return { requestId: ctx.requestId }
    }
    return {}
  },
})

export const logger = baseLogger
