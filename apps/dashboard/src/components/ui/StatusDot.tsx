import { useEffect, useRef } from "react"
import gsap from "gsap"
import type { MonitorStatus } from "@uptime/types"

interface StatusDotProps {
  status: MonitorStatus
  size?: number
}

const colorMap: Record<MonitorStatus, string> = {
  up: "var(--green)",
  down: "var(--red)",
  degraded: "var(--amber)",
  timed_out: "var(--amber)",
  unknown: "var(--text-muted)",
}

export default function StatusDot({ status, size = 8 }: StatusDotProps) {
  const ringRef = useRef<HTMLDivElement>(null)
  const color = colorMap[status] ?? "var(--text-muted)"

  useEffect(() => {
    if (status === "up" && ringRef.current) {
      gsap.to(ringRef.current, {
        scale: 1.8,
        opacity: 0,
        duration: 1.2,
        repeat: -1,
        ease: "power1.out",
      })
    }
  }, [status])

  return (
    <div style={{
      position: "relative",
      width: size,
      height: size,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      {status === "up" && (
        <div
          ref={ringRef}
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: color,
            opacity: 0.4,
          }}
        />
      )}
      <div style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        position: "absolute",
      }} />
    </div>
  )
}
