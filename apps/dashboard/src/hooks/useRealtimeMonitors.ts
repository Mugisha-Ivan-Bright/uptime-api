import { useEffect, useRef } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useAuthStore } from "../stores/auth"
import gsap from "gsap"

export function useRealtimeMonitors() {
  const queryClient = useQueryClient()
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const backoffRef = useRef(1000)
  const token = useAuthStore((s) => s.token)

  useEffect(() => {
    if (!token) return

    const wsUrl = (import.meta.env.VITE_API_URL_WS as string) ?? "ws://localhost:3000"

    function connect() {
      const url = `${wsUrl}/ws?token=${encodeURIComponent(token ?? "")}`
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        backoffRef.current = 1000
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as {
            type: string
            data: Record<string, unknown>
          }

          switch (msg.type) {
            case "check_result": {
              const data = msg.data as { monitorId: string }
              queryClient.invalidateQueries({ queryKey: ["monitors"] })
              if (data.monitorId) {
                queryClient.invalidateQueries({
                  queryKey: ["monitor", data.monitorId],
                })
              }
              break
            }
            case "incident_opened": {
              queryClient.invalidateQueries({ queryKey: ["incidents"] })
              queryClient.invalidateQueries({ queryKey: ["monitors"] })
              gsap.from(".incident-row", {
                backgroundColor: "rgba(255,51,51,0.15)",
                duration: 2,
                ease: "power2.out",
              })
              break
            }
            case "incident_resolved": {
              queryClient.invalidateQueries({ queryKey: ["incidents"] })
              queryClient.invalidateQueries({ queryKey: ["monitors"] })
              break
            }
          }
        } catch {
          // ignore parse errors
        }
      }

      ws.onclose = () => {
        const delay = Math.min(backoffRef.current, 30000)
        reconnectTimerRef.current = setTimeout(connect, delay)
        backoffRef.current = Math.min(backoffRef.current * 2, 30000)
      }

      ws.onerror = () => {
        ws.close()
      }
    }

    connect()

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
      }
    }
  }, [token, queryClient])
}
