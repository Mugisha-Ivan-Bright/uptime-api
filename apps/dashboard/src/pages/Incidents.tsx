import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import gsap from "gsap"
import Button from "../components/ui/Button"
import Badge from "../components/ui/Badge"
import Terminal from "../components/ui/Terminal"
import StatusDot from "../components/ui/StatusDot"
import api from "../lib/api"
import type { IncidentRow } from "@uptime/types"

const FILTERS = ["ALL", "OPEN", "RESOLVED"] as const
type Filter = (typeof FILTERS)[number]

function formatDuration(startedAt: string, resolvedAt: string | null): string {
  if (!resolvedAt) return "Ongoing"
  const diff = new Date(resolvedAt).getTime() - new Date(startedAt).getTime()
  const mins = Math.floor(diff / 60000)
  const secs = Math.floor((diff % 60000) / 1000)
  if (mins === 0) return `${secs}s`
  return `${mins}m ${secs}s`
}

export default function Incidents() {
  const [filter, setFilter] = useState<Filter>("ALL")
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const queryClient = useQueryClient()

  const { data: incidents, isLoading, error } = useQuery<IncidentRow[]>({
    queryKey: ["incidents"],
    queryFn: () => api.get("/api/v1/incidents").then((r) => r.data),
  })

  const acknowledgeMutation = useMutation({
    mutationFn: (id: string) =>
      api.post(`/api/v1/incidents/${id}/acknowledge`, { acknowledgedBy: "Dashboard User" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] })
    },
  })

  const filtered = (incidents ?? []).filter((i) => {
    if (filter === "ALL") return true
    if (filter === "OPEN") return !i.resolvedAt
    return !!i.resolvedAt
  })

  return (
    <div>
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--text-muted)", fontFamily: '"JetBrains Mono", monospace', marginBottom: 24 }}>
        INCIDENTS
      </div>

      <div style={{ display: "flex", gap: 0, marginBottom: 24, borderBottom: "1px solid var(--border-default)" }}>
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              background: "none",
              border: "none",
              borderBottom: filter === f ? "2px solid var(--text-primary)" : "2px solid transparent",
              color: filter === f ? "var(--text-primary)" : "var(--text-muted)",
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 11,
              letterSpacing: "0.08em",
              padding: "10px 20px",
              cursor: "pointer",
              textTransform: "uppercase",
              marginBottom: -1,
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {isLoading && (
        <span style={{ color: "var(--text-muted)", fontSize: 12 }}>Loading incidents...</span>
      )}

      {error && (
        <Terminal lines={[{ type: "error", text: "Failed to load incidents" }]} />
      )}

      {!isLoading && !error && filtered.length === 0 && (
        <Terminal lines={[
          { type: "comment", text: "no incidents recorded. all systems nominal." },
        ]} />
      )}

      <div style={{ display: "flex", flexDirection: "column" }}>
        {filtered.map((incident) => {
          const isOpen = !incident.resolvedAt
          return (
            <div
              key={incident.id}
              className="incident-row"
              onClick={() => {
                setExpanded((prev) => {
                  const next = new Set(prev)
                  if (next.has(incident.id)) next.delete(incident.id)
                  else next.add(incident.id)
                  return next
                })
              }}
              style={{
                background: isOpen ? "rgba(255,51,51,0.04)" : "transparent",
                borderBottom: "1px solid var(--border-default)",
                padding: "16px 0",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <StatusDot status={isOpen ? "down" : "up"} size={8} />
                <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 13, color: "var(--text-primary)" }}>
                  {incident.monitor?.name ?? "Unknown Monitor"}
                </span>
                <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: "var(--text-muted)" }}>
                  #{incident.id.slice(0, 8)}
                </span>
              </div>

              <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>
                Started: {new Date(incident.startedAt).toLocaleString()} | Duration: {formatDuration(incident.startedAt.toISOString(), incident.resolvedAt?.toISOString() ?? null)}
              </div>

              <div style={{ fontSize: 12, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span>Cause: {incident.cause || "N/A"}</span>
                <span>|</span>
                <span>Regions: </span>
                {(incident.affectedRegions ?? []).map((r) => (
                  <span
                    key={r}
                    style={{
                      display: "inline-block",
                      border: "1px solid var(--border-accent)",
                      padding: "1px 6px",
                      fontSize: 9,
                      fontFamily: '"JetBrains Mono", monospace',
                      textTransform: "uppercase",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {r}
                  </span>
                ))}
              </div>

              {isOpen && (
                <div style={{ marginTop: 12 }}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      acknowledgeMutation.mutate(incident.id)
                    }}
                    disabled={acknowledgeMutation.isPending}
                  >
                    ACKNOWLEDGE
                  </Button>
                </div>
              )}

              {expanded.has(incident.id) && (
                <div style={{
                  marginTop: 12,
                  padding: 12,
                  background: "var(--bg-surface)",
                  fontSize: 11,
                  color: "var(--text-secondary)",
                }}>
                  Check results for incident #{incident.id.slice(0, 8)} would appear here.
                  Timeline of region status changes loading...
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
