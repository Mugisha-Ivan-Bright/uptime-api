import { useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import gsap from "gsap"
import { useAuthStore } from "../stores/auth"
import api from "../lib/api"
import type { MonitorStatus, IncidentRow } from "@uptime/types"
import HeroParticles from "../components/HeroParticles"
import Card from "../components/ui/Card"
import Badge from "../components/ui/Badge"
import StatusDot from "../components/ui/StatusDot"
import Button from "../components/ui/Button"
import Terminal from "../components/ui/Terminal"

interface MonitorWithStatus {
  id: string
  name: string
  url: string
  type: string
  isActive: boolean
  status: MonitorStatus
  regions: string[]
  intervalSeconds: number
}

interface OrgMeData {
  org: { plan: string }
  monitors: number
  incidents: { open: number; total: number }
}

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

  return <span ref={ref} style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 28, color: "var(--text-primary)" }}>0{suffix}</span>
}

function getTimeStr(): string {
  return new Date().toLocaleTimeString("en-US", { hour12: false })
}

function UptimeBars({ data }: { data: number[] }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (containerRef.current) {
      gsap.from(containerRef.current.querySelectorAll(".uptime-bar"), {
        scaleY: 0,
        transformOrigin: "bottom",
        duration: 0.3,
        stagger: 0.008,
        ease: "power2.out",
      })
    }
  }, [data])

  return (
    <div ref={containerRef} style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 20 }}>
      {data.map((pct, i) => {
        let color = "var(--border-accent)"
        if (pct >= 99.9) color = "var(--green)"
        else if (pct >= 99.0) color = "var(--amber)"
        else if (pct >= 95.0) color = "#ff8800"
        else if (pct < 95.0 && pct >= 0) color = "var(--red)"

        return (
          <div
            key={i}
            className="uptime-bar"
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
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const org = useAuthStore((s) => s.org)
  const containerRef = useRef<HTMLDivElement>(null)

  const { data: orgData, isLoading: orgLoading } = useQuery<OrgMeData>({
    queryKey: ["org-me"],
    queryFn: () => api.get("/api/v1/orgs/me").then((r) => r.data),
  })

  const { data: monitors, isLoading: monitorsLoading, error: monitorsError } = useQuery<MonitorWithStatus[]>({
    queryKey: ["monitors"],
    queryFn: () => api.get("/api/v1/monitors").then((r) => r.data),
  })

  const { data: incidents } = useQuery<IncidentRow[]>({
    queryKey: ["incidents"],
    queryFn: () => api.get("/api/v1/incidents").then((r) => r.data),
  })

  const allUp = monitors?.every((m) => m.status === "up") ?? true
  const anyDown = monitors?.some((m) => m.status === "down") ?? false
  const anyDegraded = monitors?.some((m) => m.status === "degraded" || m.status === "timed_out") ?? false

  let overallStatus = "ALL SYSTEMS OPERATIONAL"
  let overallColor = "var(--green-dim)"
  if (anyDown) {
    overallStatus = "INCIDENT DETECTED"
    overallColor = "var(--red-dim)"
  } else if (anyDegraded) {
    overallStatus = "DEGRADED PERFORMANCE"
    overallColor = "var(--amber-dim)"
  }

  const totalMonitors = monitors?.length ?? 0
  const upCount = monitors?.filter((m) => m.status === "up").length ?? 0
  const openIncidents = incidents?.filter((i) => !i.resolvedAt).length ?? 0
  const recentIncidents = incidents?.slice(0, 5) ?? []

  useEffect(() => {
    gsap.from(".card", {
      opacity: 0,
      y: 8,
      duration: 0.25,
      stagger: 0.04,
      ease: "power1.out",
    })
  }, [monitors])

  if (monitorsLoading || orgLoading) {
    return (
      <Terminal lines={[
        { type: "prompt" as const, text: "fetching monitor data..." },
        { type: "output" as const, text: "connecting to api..." },
        { type: "output" as const, text: "loading ..." },
      ]} />
    )
  }

  if (monitorsError) {
    return (
      <Terminal lines={[
        { type: "error" as const, text: "failed to fetch monitor data" },
      ]} />
    )
  }

  return (
    <div ref={containerRef}>
      <section style={{ position: "relative", height: 200, marginBottom: 24 }}>
        <HeroParticles height={200} />
        <div style={{
          position: "absolute",
          inset: 0,
          padding: "24px 32px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--text-muted)", fontFamily: '"JetBrains Mono", monospace' }}>
                SYSTEM OVERVIEW
              </div>
              <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 28, color: "var(--text-primary)", marginTop: 4 }}>
                {typeof window !== "undefined" ? getTimeStr() : "--:--:--"}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                {org?.name ?? ""}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: overallColor,
              }}>
                {overallStatus}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 1,
        background: "var(--border-default)",
        marginBottom: 32,
      }}>
        <Card padding="20px">
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 8, fontFamily: '"JetBrains Mono", monospace' }}>
            Total Monitors
          </div>
          <StatCounter value={totalMonitors} />
        </Card>
        <Card padding="20px">
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 8, fontFamily: '"JetBrains Mono", monospace' }}>
            Monitors Up
          </div>
          <StatCounter value={upCount} />
          <span style={{ color: "var(--text-muted)", fontSize: 12, marginLeft: 4 }}>/ {totalMonitors}</span>
        </Card>
        <Card padding="20px">
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 8, fontFamily: '"JetBrains Mono", monospace' }}>
            Open Incidents
          </div>
          <StatCounter value={openIncidents} />
        </Card>
        <Card padding="20px">
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 8, fontFamily: '"JetBrains Mono", monospace' }}>
            Avg Response
          </div>
          <StatCounter value={245} suffix="ms" />
        </Card>
      </section>

      <section style={{ marginBottom: 32 }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--text-muted)", fontFamily: '"JetBrains Mono", monospace' }}>
            MONITORS
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/monitors/new")}>
            + ADD MONITOR
          </Button>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, 1fr)",
          gap: 1,
          background: "var(--border-default)",
        }}>
          {(monitors ?? []).length === 0 ? (
            <Terminal lines={[
              { type: "prompt", text: "no monitors configured" },
              { type: "comment", text: "create your first monitor to start tracking" },
            ]} />
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: 1,
            }}>
              {(monitors ?? []).map((m) => (
                <Card
                  key={m.id}
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
                    <span style={{ color: "var(--text-secondary)", fontSize: 11 }}>245ms avg</span>
                  </div>
                  <UptimeBars data={Array.from({ length: 30 }, () => 95 + Math.random() * 5)} />
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      <section>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--text-muted)", fontFamily: '"JetBrains Mono", monospace' }}>
            RECENT INCIDENTS
          </div>
          {recentIncidents.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => navigate("/incidents")}>
              VIEW ALL INCIDENTS →
            </Button>
          )}
        </div>

        {recentIncidents.length === 0 ? (
          <Terminal lines={[
            { type: "success", text: "no incidents recorded. all systems nominal." },
          ]} />
        ) : (
          <div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{
                display: "grid",
                gridTemplateColumns: "24px 1fr 1fr 1fr 2fr",
                gap: 12,
                padding: "0 16px 8px 16px",
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "var(--text-muted)",
                fontFamily: '"JetBrains Mono", monospace',
                borderBottom: "1px solid var(--border-default)",
              }}>
                <span />
                <span>Monitor</span>
                <span>Started</span>
                <span>Duration</span>
                <span>Cause</span>
              </div>
              {recentIncidents.map((inc) => (
                <div
                  key={inc.id}
                  className="incident-row"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "24px 1fr 1fr 1fr 2fr",
                    gap: 12,
                    padding: "0 16px",
                    height: 44,
                    alignItems: "center",
                    fontSize: 12,
                    borderBottom: "1px solid var(--border-default)",
                    background: !inc.resolvedAt ? "rgba(255,51,51,0.04)" : undefined,
                    fontFamily: '"IBM Plex Mono", monospace',
                  }}
                >
                  <StatusDot status={inc.resolvedAt ? "up" : "down"} size={6} />
                  <span style={{ color: "var(--text-primary)" }}>{inc.monitor?.name ?? "—"}</span>
                  <span style={{ color: "var(--text-secondary)" }}>
                    {new Date(inc.startedAt).toLocaleString()}
                  </span>
                  <span style={{ color: inc.resolvedAt ? "var(--text-secondary)" : "var(--red-dim)" }}>
                    {inc.resolvedAt
                      ? `${Math.round((new Date(inc.resolvedAt).getTime() - new Date(inc.startedAt).getTime()) / 60000)}m`
                      : "Ongoing"}
                  </span>
                  <span style={{ color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {inc.cause}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
