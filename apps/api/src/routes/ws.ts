import type { FastifyInstance } from "fastify"
import type { WebSocket } from "@fastify/websocket"
import { verifyToken } from "../lib/jwt.js"
import { logger } from "../lib/logger.js"

const clients = new Set<WebSocket>()

export function broadcast(event: string, data: Record<string, unknown>) {
  const message = JSON.stringify({ type: event, data })
  for (const ws of clients) {
    try {
      ws.send(message)
    } catch {
      clients.delete(ws)
    }
  }
}

export default async function wsRoutes(fastify: FastifyInstance) {
  fastify.get("/ws", { websocket: true }, (socket, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`)
    const token = url.searchParams.get("token")

    if (!token) {
      socket.close(4001, "Authentication required")
      return
    }

    try {
      verifyToken(token)
    } catch {
      socket.close(4001, "Invalid token")
      return
    }

    clients.add(socket)
    logger.info("WebSocket client connected")

    socket.on("close", () => {
      clients.delete(socket)
      logger.info("WebSocket client disconnected")
    })

    socket.on("error", () => {
      clients.delete(socket)
    })
  })
}
