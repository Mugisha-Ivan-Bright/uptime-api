interface BadgeProps {
  status: "up" | "down" | "degraded" | "timed_out" | "unknown"
  children?: string
}

const badgeConfig: Record<string, { bg: string; color: string; border: string; label: string }> = {
  up: {
    bg: "var(--green-glow)",
    color: "var(--green-dim)",
    border: "1px solid rgba(0,255,136,0.2)",
    label: "UP",
  },
  down: {
    bg: "rgba(255,51,51,0.08)",
    color: "var(--red-dim)",
    border: "1px solid rgba(255,51,51,0.2)",
    label: "DOWN",
  },
  degraded: {
    bg: "rgba(255,170,0,0.08)",
    color: "var(--amber-dim)",
    border: "1px solid rgba(255,170,0,0.2)",
    label: "DEGRADED",
  },
  timed_out: {
    bg: "rgba(255,170,0,0.08)",
    color: "var(--amber-dim)",
    border: "1px solid rgba(255,170,0,0.2)",
    label: "TIMED OUT",
  },
  unknown: {
    bg: "transparent",
    color: "var(--text-muted)",
    border: "1px solid var(--border-default)",
    label: "UNKNOWN",
  },
}

export default function Badge({ status, children }: BadgeProps) {
  const config = badgeConfig[status]!
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      background: config.bg,
      color: config.color,
      border: config.border,
      borderRadius: 0,
      textTransform: "uppercase",
      fontSize: "10px",
      letterSpacing: "0.1em",
      padding: "3px 8px",
      fontFamily: '"JetBrains Mono", monospace',
      fontWeight: 600,
    }}>
      {children ?? config.label}
    </span>
  )
}
