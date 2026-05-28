import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import gsap from "gsap"
import api from "../lib/api"
import type { MonitorStatus } from "@uptime/types"
import Card from "../components/ui/Card"
import Badge from "../components/ui/Badge"
import StatusDot from "../components/ui/StatusDot"
import Button from "../components/ui/Button"
import Terminal from "../components/ui/Terminal"
import Input from "../components/ui/Input"

interface MonitorItem {
  id: string
  name: string
  url: string
  type: string
  status: MonitorStatus
  regions: string[]
  intervalSeconds: number
  isActive: boolean
}

export default function MonitorsList() {
  const navigate = useNavigate()
  const [search, setSearch] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)

  const { data: monitors, isLoading, error } = useQuery<MonitorItem[]>({
    queryKey: ["monitors"],
    queryFn: () => api.get("/api/v1/monitors").then((r) => r.data),
  })

  const filtered = (monitors ?? []).filter((m) => {
    if (!search) return true
    const q = search.toLowerCase()
    return m.name.toLowerCase().includes(q) || m.url.toLowerCase().includes(q)
  })

  useEffect(() => {
    if (filtered.length > 0 && containerRef.current) {
      gsap.from(containerRef.current.querySelectorAll("[data-monitor-card]"), {
        opacity: 0,
        y: 6,
        duration: 0.2,
        stagger: 0.03,
        ease: "power1.out",
      })
    }
  }, [filtered.length])

  if (isLoading) {
    return (
      <Terminal lines={[
        { type: "prompt", text: "fetching monitors..." },
        { type: "output", text: "loading ..." },
      ]} />
    )
  }

  if (error) {
    return (
      <Terminal lines={[
        { type: "error", text: "failed to load monitors" },
      ]} />
    )
  }

  const intervalLabel = (s: number) => {
    if (s < 60) return `${s}s`
    if (s < 3600) return `${s / 60}m`
    return `${s / 3600}h`
  }

  return (
    <div ref={containerRef}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--text-muted)", fontFamily: '"JetBrains Mono", monospace' }}>
          MONITORS
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate("/monitors/new")}>
          + ADD MONITOR
        </Button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Input
          placeholder="Search by name or URL..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <Terminal lines={[
          { type: "prompt", text: search ? "no monitors match your search" : "no monitors configured" },
          { type: "comment", text: search ? "try a different search term" : "create your first monitor to start tracking" },
        ]} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 1, background: "var(--border-default)" }}>
          {filtered.map((m) => (
            <div key={m.id} data-monitor-card>
              <Card
                padding="16px"
                onClick={() => navigate(`/monitors/${m.id}`)}
                style={{
                  borderLeft: m.status === "down" ? "2px solid var(--red)" :
                             m.status === "up" ? "2px solid var(--green)" : undefined,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <StatusDot status={m.status} />
                  <span style={{ color: "var(--text-primary)", fontSize: 13, fontFamily: '"JetBrains Mono", monospace' }}>
                    {m.name}
                  </span>
                </div>
                <div style={{ color: "var(--text-muted)", fontSize: 11, marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {m.url}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <Badge status={m.status} />
                  <span style={{ color: "var(--text-secondary)", fontSize: 11, fontFamily: '"JetBrains Mono", monospace' }}>
                    {m.type}
                  </span>
                  <span style={{ color: "var(--text-muted)", fontSize: 11 }}>·</span>
                  <span style={{ color: "var(--text-secondary)", fontSize: 11, fontFamily: '"JetBrains Mono", monospace' }}>
                    {intervalLabel(m.intervalSeconds)}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {m.regions.map((r) => (
                    <span key={r} style={{
                      fontSize: 9,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: "var(--text-muted)",
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border-default)",
                      padding: "1px 5px",
                      fontFamily: '"JetBrains Mono", monospace',
                    }}>
                      {r}
                    </span>
                  ))}
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
