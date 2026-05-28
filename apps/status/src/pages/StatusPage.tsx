import { useEffect, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import gsap from "gsap"
import api from "../lib/api"
import type { StatusPageData, MonitorStatus } from "@uptime/types"
import Badge from "../components/ui/Badge"
import Card from "../components/ui/Card"
import StatusDot from "../components/ui/StatusDot"
import Terminal from "../components/ui/Terminal"

const slug = import.meta.env.VITE_DEFAULT_SLUG || window.location.hostname.split(".")[0]

const overallToBadge: Record<string, MonitorStatus> = {
  operational: "up",
  degraded: "degraded",
  outage: "down",
  unknown: "unknown",
}

const overallLabels: Record<string, string> = {
  operational: "ALL SYSTEMS OPERATIONAL",
  degraded: "DEGRADED PERFORMANCE",
  outage: "SERVICE OUTAGE",
  unknown: "UNKNOWN",
}

const barColorMap: Record<string, string> = {
  green: "var(--green-dim)",
  yellow: "var(--amber-dim)",
  orange: "var(--orange-dim)",
  red: "var(--red-dim)",
}

function formatUptimePct(pct: number): string {
  if (pct >= 99.995) return "100"
  return pct.toFixed(2)
}

export default function StatusPage() {
  const [ago, setAgo] = useState("")
  const rowsRef = useRef<HTMLDivElement>(null)

  const { data, isLoading, isError } = useQuery<StatusPageData>({
    queryKey: ["status-page", slug],
    queryFn: async () => {
      const { data } = await api.get<StatusPageData>(`/api/v1/status/${slug}`)
      return data
    },
    refetchInterval: 30_000,
  })

  useEffect(() => {
    if (!data?.generatedAt) return
    const update = () => {
      const seconds = Math.floor(
        (Date.now() - new Date(data.generatedAt).getTime()) / 1000,
      )
      setAgo(`${seconds}s ago`)
    }
    update()
    const id = setInterval(update, 30_000)
    return () => clearInterval(id)
  }, [data?.generatedAt])

  useEffect(() => {
    if (!data?.monitors?.length || !rowsRef.current) return
    const children = Array.from(rowsRef.current.children)
    gsap.fromTo(
      children,
      { opacity: 0, y: 12 },
      {
        opacity: 1,
        y: 0,
        duration: 0.4,
        stagger: 0.05,
        ease: "power2.out",
      },
    )
  }, [data?.monitors])

  if (isLoading) {
    return (
      <div
        style={{
          width: "100%",
          maxWidth: 900,
          margin: "0 auto",
          padding: "0 48px",
          paddingTop: 64,
        }}
      >
        <Terminal lines={[{ type: "prompt", text: "fetching status data..." }]} />
      </div>
    )
  }

  if (isError) {
    return (
      <div
        style={{
          width: "100%",
          maxWidth: 900,
          margin: "0 auto",
          padding: "0 48px",
          paddingTop: 64,
        }}
      >
        <Terminal
          lines={[
            { type: "prompt", text: `curl api/v1/status/${slug}` },
            { type: "error", text: "404 — status page not found" },
            { type: "comment", text: "check the subdomain and try again" },
          ]}
        />
      </div>
    )
  }

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 900,
        margin: "0 auto",
        padding: "0 48px",
        fontFamily: '"IBM Plex Mono", monospace',
        fontSize: 13,
        color: "var(--text-primary)",
      }}
    >
      {/* HERO */}
      <div
        style={{
          height: 180,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          borderBottom: "1px solid var(--border-default)",
          background: "var(--bg-surface)",
          marginBottom: 32,
        }}
      >
        <div
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 22,
            color: "var(--text-primary)",
            marginBottom: 4,
          }}
        >
          {data?.org?.name}
        </div>
        <div
          style={{
            fontSize: 10,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            marginBottom: 12,
          }}
        >
          STATUS PAGE
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              display: "inline-flex",
              fontFamily: '"JetBrains Mono", monospace',
            }}
          >
            <Badge
              status={
                overallToBadge[data?.overallStatus ?? "unknown"] ?? "unknown"
              }
            >
              {overallLabels[data?.overallStatus ?? "unknown"]}
            </Badge>
          </div>
          <span
            style={{
              fontSize: 10,
              color: "var(--text-muted)",
              fontFamily: '"JetBrains Mono", monospace',
            }}
          >
            Updated {ago}
          </span>
        </div>
      </div>

      {/* MONITORS */}
      <div
        style={{
          fontSize: 10,
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          marginBottom: 16,
          fontFamily: '"JetBrains Mono", monospace',
        }}
      >
        MONITORS
      </div>
      <div ref={rowsRef}>
        {data?.monitors?.map((monitor) => (
          <div
            key={monitor.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "16px 0",
              borderBottom: "1px solid var(--border-default)",
            }}
          >
            {/* LEFT: StatusDot + name */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: 200,
                flexShrink: 0,
              }}
            >
              <StatusDot status={monitor.currentStatus} />
              <span
                style={{
                  color: "var(--text-primary)",
                  fontSize: 13,
                }}
              >
                {monitor.name}
              </span>
            </div>

            {/* MIDDLE: uptime bars */}
            <div
              style={{
                display: "flex",
                gap: 1,
                alignItems: "stretch",
                flex: 1,
                minWidth: 0,
              }}
            >
              {monitor.uptimeBars.map((bar, i) => (
                <div
                  key={i}
                  style={{
                    width: 4,
                    height: 28,
                    background:
                      bar.totalChecks === 0
                        ? "var(--border-accent)"
                        : barColorMap[bar.color] ?? "var(--border-accent)",
                    flexShrink: 0,
                  }}
                />
              ))}
            </div>

            {/* RIGHT: uptime % */}
            <div
              style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 13,
                color: "var(--text-primary)",
                width: 64,
                textAlign: "right",
                flexShrink: 0,
              }}
            >
              {formatUptimePct(monitor.uptimePct90d)}%
            </div>
          </div>
        ))}
      </div>

      {/* ACTIVE INCIDENTS */}
      {data?.monitors?.some((m) => m.activeIncident) && (
        <div style={{ marginTop: 32 }}>
          <Card padding="20px" style={{ border: "1px solid var(--red-dim)" }}>
            <div
              style={{
                fontSize: 10,
                color: "var(--red-dim)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: 16,
                fontFamily: '"JetBrains Mono", monospace',
              }}
            >
              ACTIVE INCIDENTS
            </div>
            {data.monitors
              .filter((m) => m.activeIncident)
              .map((m) => (
                <div key={m.id} style={{ marginBottom: 12 }}>
                  <div
                    style={{
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: 13,
                      color: "var(--text-primary)",
                      marginBottom: 4,
                    }}
                  >
                    {m.name}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-secondary)",
                      marginBottom: 4,
                    }}
                  >
                    {m.activeIncident!.cause}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 11,
                      color: "var(--text-muted)",
                      flexWrap: "wrap",
                    }}
                  >
                    <span>
                      Started:{" "}
                      {new Date(m.activeIncident!.startedAt).toLocaleString()}
                    </span>
                    {m.activeIncident!.affectedRegions.map((r) => (
                      <span
                        key={r}
                        style={{
                          border: "1px solid var(--border-default)",
                          padding: "1px 6px",
                          fontSize: 10,
                          color: "var(--text-muted)",
                        }}
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
          </Card>
        </div>
      )}

      {/* RECENT INCIDENTS */}
      {data?.recentIncidents && data.recentIncidents.length > 0 && (
        <div style={{ marginTop: 48 }}>
          <div
            style={{
              fontSize: 10,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginBottom: 16,
              fontFamily: '"JetBrains Mono", monospace',
            }}
          >
            INCIDENT HISTORY
          </div>
          {data.recentIncidents.slice(0, 10).map((inc) => (
            <div
              key={inc.id}
              style={{
                borderBottom: "1px solid var(--border-default)",
                padding: "12px 0",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 12,
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    color: "var(--text-primary)",
                    fontFamily: '"JetBrains Mono", monospace',
                  }}
                >
                  {inc.monitorName}
                </span>
                <span style={{ color: "var(--text-muted)" }}>|</span>
                <span style={{ color: "var(--text-secondary)" }}>
                  {inc.durationMinutes != null
                    ? `${inc.durationMinutes}m`
                    : "---"}
                </span>
                <span style={{ color: "var(--text-muted)" }}>|</span>
                <span style={{ color: "var(--text-secondary)" }}>
                  {inc.cause}
                </span>
                <span style={{ color: "var(--text-muted)" }}>|</span>
                <span style={{ color: "var(--text-muted)", fontSize: 11 }}>
                  {inc.resolvedAt
                    ? new Date(inc.resolvedAt).toLocaleString()
                    : "ongoing"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FOOTER */}
      <div style={{ textAlign: "center", padding: "48px 0 32px" }}>
        <div
          style={{
            fontSize: 10,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            fontFamily: '"JetBrains Mono", monospace',
          }}
        >
          Powered by UPTIME
        </div>
        <div
          style={{
            fontSize: 10,
            color: "var(--text-muted)",
            marginTop: 4,
            fontFamily: '"JetBrains Mono", monospace',
          }}
        >
          {slug}
        </div>
      </div>
    </div>
  )
}
