import { NavLink, useLocation } from "react-router-dom"

interface NavItem {
  label: string
  path: string
  icon: string
}

const navItems: NavItem[] = [
  { label: "Overview", path: "/dashboard", icon: "◎" },
  { label: "Monitors", path: "/monitors", icon: "◉" },
  { label: "Incidents", path: "/incidents", icon: "⚠" },
  { label: "Alert Channels", path: "/alerts", icon: "⚡" },
  { label: "Billing", path: "/billing", icon: "$" },
  { label: "Settings", path: "/settings", icon: "⚙" },
]

export default function Sidebar() {
  const location = useLocation()

  const isActive = (path: string) => {
    if (path === "/dashboard") return location.pathname === "/dashboard"
    return location.pathname.startsWith(path)
  }

  return (
    <nav style={{
      width: 220,
      background: "var(--bg-base)",
      borderRight: "1px solid var(--border-default)",
      height: "100vh",
      padding: "24px 0",
      flexShrink: 0,
      overflow: "auto",
    }}>
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 20px",
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: isActive(item.path) ? "var(--text-primary)" : "var(--text-secondary)",
            borderLeft: `2px solid ${isActive(item.path) ? "var(--green-dim)" : "transparent"}`,
            background: isActive(item.path) ? "rgba(0,255,136,0.04)" : "transparent",
            fontFamily: '"JetBrains Mono", monospace',
            transition: "all 150ms ease",
          }}
          onMouseEnter={(e) => {
            if (!isActive(item.path)) {
              e.currentTarget.style.color = "var(--text-primary)"
              e.currentTarget.style.background = "var(--bg-hover)"
            }
          }}
          onMouseLeave={(e) => {
            if (!isActive(item.path)) {
              e.currentTarget.style.color = "var(--text-secondary)"
              e.currentTarget.style.background = "transparent"
            }
          }}
        >
          <span style={{ width: 16, textAlign: "center", fontSize: 13 }}>{item.icon}</span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}
