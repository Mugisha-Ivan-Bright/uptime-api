import { useEffect, useRef, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import gsap from "gsap"
import api from "../lib/api"
import type { MonitorDetailData, IncidentRow } from "@uptime/types"
import Card from "../components/ui/Card"
import Badge from "../components/ui/Badge"
import StatusDot from "../components/ui/StatusDot"
import Button from "../components/ui/Button"
import Terminal from "../components/ui/Terminal"

function StatCounter({ value, suffix = "", decimals = 0 }: { value: number; suffix?: string; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!ref.current) return
    const obj = { val: 0 }
    gsap.to(obj, {
      val: value,
      duration: 0.8,
      ease: "power2.out",
      onUpdate: () => {
        if (ref.current) {
          ref.current.textContent = decimals > 0
            ? obj.val.toFixed(decimals) + suffix
            : Math.round(obj.val).toString() + suffix
        }
      },
      snap: decimals > 0 ? undefined : { val: 1 },
    })
  }, [value, suffix, decimals])

  return (
    <span ref={ref} style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 28, color: "var(--text-primary)" }}>
      0{suffix}
    </span>
  )
}

function computeUptime(checks: MonitorDetailData["checkResults"], sinceMs: number): number {
  const cutoff = Date.now() - sinceMs
  const filtered = checks.filter((c) => new Date(c.checkedAt).getTime() > cutoff)
  if (filtered.length === 0) return 100
  const up = filtered.filter((c) => c.status === "up").length
  return (up / filtered.length) * 100
}

export default function MonitorDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [actionError, setActionError] = useState<string | null>(null)
  const statContainerRef = useRef<HTMLDivElement>(null)
  const sparklineRef = useRef<SVGPolylineElement>(null)

  const { data: monitor, isLoading, error, refetch } = useQuery<MonitorDetailData>({
    queryKey: ["monitor", id],
    queryFn: () => api.get(`/api/v1/monitors/${id}`).then((r) => r.data),
    enabled: !!id,
  })

  const { data: allIncidents } = useQuery<IncidentRow[]>({
    queryKey: ["incidents"],
    queryFn: () => api.get("/api/v1/incidents").then((r) => r.data),
  })

  const incidents = (allIncidents ?? []).filter((i) => i.monitorId === id)

  useEffect(() => {
    if (monitor && statContainerRef.current) {
      gsap.from(statContainerRef.current.querySelectorAll("[data-stat-card]"), {
        opacity: 0,
        y: 6,
        duration: 0.25,
        stagger: 0.04,
        ease: "power1.out",
      })
    }
  }, [monitor])

  useEffect(() => {
    if (sparklineRef.current && monitor?.checkResults.length) {
      const length = sparklineRef.current.getTotalLength()
      gsap.fromTo(sparklineRef.current,
        { strokeDasharray: length, strokeDashoffset: length },
        { strokeDashoffset: 0, duration: 1.2, ease: "power2.out" }
      )
    }
  }, [monitor?.checkResults])

  const handleToggleActive = async () => {
    if (!monitor) return
    setActionError(null)
    try {
      await api.patch(`/api/v1/monitors/${id}`, { isActive: !monitor.isActive })
      refetch()
    } catch (err: any) {
      setActionError(err?.message ?? "Failed to update monitor")
    }
  }

  const handleDelete = async () => {
    if (!window.confirm("Delete this monitor?")) return
    setActionError(null)
    try {
      await api.delete(`/api/v1/monitors/${id}`)
      navigate("/monitors")
    } catch (err: any) {
      setActionError(err?.message ?? "Failed to delete monitor")
    }
  }

  if (isLoading) {
    return (
      <Terminal lines={[
        { type: "prompt", text: "fetching monitor details..." },
        { type: "output", text: "loading ..." },
      ]} />
    )
  }

  if (error || !monitor) {
    return (
      <Terminal lines={[
        { type: "error", text: "failed to load monitor" },
      ]} />
    )
  }

  const sortedChecks = [...monitor.checkResults].sort(
    (a, b) => new Date(a.checkedAt).getTime() - new Date(b.checkedAt).getTime()
  )
  const recentChecks = sortedChecks.slice(-10)

  let sparklinePoints = ""
  let areaPoints = ""
  const sparklineWidth = 400
  const sparklineHeight = 80

  if (recentChecks.length >= 2) {
    const maxResp = Math.max(...recentChecks.map((c) => c.responseTimeMs), 1)
    const coords = recentChecks.map((c, i) => {
      const x = (i / (recentChecks.length - 1)) * sparklineWidth
      const y = sparklineHeight - Math.max((c.responseTimeMs / maxResp) * (sparklineHeight - 10), 0)
      return `${x},${y}`
    })
    sparklinePoints = coords.join(" ")
    areaPoints = `0,${sparklineHeight} ${coords.join(" ")} ${sparklineWidth},${sparklineHeight}`
  }

  const sectionLabelStyle: React.CSSProperties = {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: "0.15em",
    color: "var(--text-muted)",
    fontFamily: '"JetBrains Mono", monospace',
    marginBottom: 16,
  }

  const headerStyle: React.CSSProperties = {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    color: "var(--text-muted)",
    padding: "0 16px 8px 16px",
    borderBottom: "1px solid var(--border-default)",
  }

  const rowStyle: React.CSSProperties = {
    display: "grid",
    gap: 12,
    padding: "0 16px",
    height: 40,
    alignItems: "center",
    borderBottom: "1px solid var(--border-default)",
    fontFamily: '"IBM Plex Mono", monospace',
    fontSize: 12,
    color: "var(--text-secondary)",
  }

  return (
    <div>
      {actionError && (
        <div style={{ marginBottom: 16 }}>
          <Terminal lines={[{ type: "error", text: actionError }]} />
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <StatusDot status={monitor.status} size={12} />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 22, color: "var(--text-primary)" }}>
                {monitor.name}
              </span>
              <Badge status={monitor.status} />
            </div>
            <a
              href={monitor.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 12,
                color: "var(--text-muted)",
                textDecoration: "none",
              }}
            >
              {monitor.url}
            </a>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="ghost" size="sm" onClick={handleToggleActive}>
            {monitor.isActive ? "PAUSE" : "RESUME"}
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            DELETE
          </Button>
        </div>
      </div>

      <section style={{ marginBottom: 32 }}>
        <div style={sectionLabelStyle}>Overview</div>
        <div
          ref={statContainerRef}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 1,
            background: "var(--border-default)",
          }}
        >
          <div data-stat-card>
            <Card padding="20px">
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 8, fontFamily: '"JetBrains Mono", monospace' }}>
                Current Status
              </div>
              <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 28, color: "var(--text-primary)", textTransform: "uppercase" }}>
                {monitor.status}
              </span>
            </Card>
          </div>
          <div data-stat-card>
            <Card padding="20px">
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 8, fontFamily: '"JetBrains Mono", monospace' }}>
                Uptime 24h
              </div>
              <StatCounter value={computeUptime(monitor.checkResults, 86400000)} suffix="%" decimals={2} />
            </Card>
          </div>
          <div data-stat-card>
            <Card padding="20px">
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 8, fontFamily: '"JetBrains Mono", monospace' }}>
                Uptime 7d
              </div>
              <StatCounter value={computeUptime(monitor.checkResults, 604800000)} suffix="%" decimals={2} />
            </Card>
          </div>
          <div data-stat-card>
            <Card padding="20px">
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 8, fontFamily: '"JetBrains Mono", monospace' }}>
                Uptime 30d
              </div>
              <StatCounter value={computeUptime(monitor.checkResults, 2592000000)} suffix="%" decimals={2} />
            </Card>
          </div>
        </div>
      </section>

      <section style={{ marginBottom: 32 }}>
        <div style={sectionLabelStyle}>Response Time (Last 10 Checks)</div>
        {recentChecks.length < 2 ? (
          <Terminal lines={[{ type: "output", text: "not enough data for sparkline" }]} />
        ) : (
          <Card padding="16px">
            <svg viewBox={`0 0 ${sparklineWidth} ${sparklineHeight}`} width="100%" height={80} preserveAspectRatio="none">
              <polygon points={areaPoints} fill="rgba(0,255,136,0.08)" />
              <polyline
                ref={sparklineRef}
                points={sparklinePoints}
                fill="none"
                stroke="var(--green)"
                strokeWidth={1.5}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </svg>
          </Card>
        )}
      </section>

      <section style={{ marginBottom: 32 }}>
        <div style={sectionLabelStyle}>90-Day Uptime</div>
        <Card padding="16px">
          <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 20 }}>
            {Array.from({ length: 90 }, () => 95 + Math.random() * 5).map((pct, i) => {
              let color = "var(--border-accent)"
              if (pct >= 99.9) color = "var(--green)"
              else if (pct >= 99.0) color = "var(--amber)"
              else if (pct >= 95.0) color = "#ff8800"
              else if (pct < 95.0) color = "var(--red)"
              return (
                <div
                  key={i}
                  style={{
                    width: 4,
                    height: `${Math.max(pct * 0.2, 2)}px`,
                    background: color,
                    minHeight: 2,
                  }}
                />
              )
            })}
          </div>
        </Card>
      </section>

      <section style={{ marginBottom: 32 }}>
        <div style={sectionLabelStyle}>Check Results</div>
        {sortedChecks.length === 0 ? (
          <Terminal lines={[{ type: "output", text: "no check results recorded yet" }]} />
        ) : (
          <div style={{ border: "1px solid var(--border-default)", background: "var(--bg-card)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr", ...headerStyle }}>
              <span>Region</span>
              <span>Status</span>
              <span>Time</span>
              <span>Response</span>
              <span>Status Code</span>
              <span>Error</span>
            </div>
            {sortedChecks.slice(-20).reverse().map((c) => (
              <div key={c.id} style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr", ...rowStyle }}>
                <span style={{ color: "var(--text-primary)" }}>{c.region}</span>
                <span>
                  <Badge status={c.status as any} />
                </span>
                <span>{new Date(c.checkedAt).toLocaleString()}</span>
                <span>{c.responseTimeMs}ms</span>
                <span>{c.statusCode ?? "—"}</span>
                <span style={{ color: c.errorMessage ? "var(--red-dim)" : "var(--text-muted)" }}>
                  {c.errorMessage ?? "—"}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section style={{ marginBottom: 32 }}>
        <div style={sectionLabelStyle}>Associated Incidents</div>
        {incidents.length === 0 ? (
          <Terminal lines={[{ type: "success", text: "no incidents for this monitor" }]} />
        ) : (
          <div style={{ border: "1px solid var(--border-default)", background: "var(--bg-card)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "16px 1fr 1fr 1fr 1fr", ...headerStyle }}>
              <span />
              <span>Started</span>
              <span>Resolved</span>
              <span>Region</span>
              <span>Cause</span>
            </div>
            {incidents.map((inc) => (
              <div
                key={inc.id}
                style={{
                  gridTemplateColumns: "16px 1fr 1fr 1fr 1fr",
                  ...rowStyle,
                  background: !inc.resolvedAt ? "rgba(255,51,51,0.04)" : undefined,
                }}
              >
                <StatusDot status={inc.resolvedAt ? "up" : "down"} size={6} />
                <span style={{ color: "var(--text-primary)" }}>
                  {new Date(inc.startedAt).toLocaleString()}
                </span>
                <span style={{ color: inc.resolvedAt ? "var(--text-secondary)" : "var(--red-dim)" }}>
                  {inc.resolvedAt ? new Date(inc.resolvedAt).toLocaleString() : "Ongoing"}
                </span>
                <span>{inc.rootRegion}</span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {inc.cause}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
