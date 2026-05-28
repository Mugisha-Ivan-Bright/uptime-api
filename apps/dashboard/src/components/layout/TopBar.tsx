import { useAuthStore } from "../../stores/auth"
import Badge from "../ui/Badge"
import Button from "../ui/Button"
import { useAuth } from "../../hooks/useAuth"

export default function TopBar() {
  const org = useAuthStore((s) => s.org)
  const { logout } = useAuth()

  return (
    <header style={{
      height: 48,
      background: "var(--bg-surface)",
      borderBottom: "1px solid var(--border-default)",
      display: "flex",
      alignItems: "center",
      padding: "0 20px",
      gap: 12,
      flexShrink: 0,
    }}>
      <span style={{
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: 13,
        textTransform: "uppercase",
        letterSpacing: "0.15em",
        color: "var(--text-primary)",
        fontWeight: 600,
      }}>
        UPTIME
      </span>

      <span style={{
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: 11,
        color: "var(--green-dim)",
      }}>
        [~/$]
      </span>

      <div style={{ flex: 1 }} />

      {org && (
        <>
          <Badge status="up">{org.plan.toUpperCase()}</Badge>
          <div style={{ width: 1, height: 20, background: "var(--border-default)" }} />
          <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>{org.name}</span>
          <div style={{ width: 1, height: 20, background: "var(--border-default)" }} />
        </>
      )}

      <Button variant="ghost" size="sm" onClick={logout}>Logout</Button>
    </header>
  )
}
