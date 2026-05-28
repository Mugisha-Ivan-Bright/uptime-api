import { useParams, Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import api from "../lib/api"
import type { RecentIncident } from "@uptime/types"
import Card from "../components/ui/Card"
import Button from "../components/ui/Button"

const slug =
  import.meta.env.VITE_DEFAULT_SLUG || window.location.hostname.split(".")[0]

interface IncidentsResponse {
  incidents: RecentIncident[]
  total: number
}

export default function IncidentDetail() {
  const { id } = useParams<{ id: string }>()

  const { data, isLoading, isError } = useQuery<IncidentsResponse>({
    queryKey: ["incidents", slug],
    queryFn: async () => {
      const { data } = await api.get<IncidentsResponse>(
        `/api/v1/status/${slug}/incidents`,
        {
          params: { page: 1, limit: 50 },
        },
      )
      return data
    },
  })

  const incident = data?.incidents?.find((i) => i.id === id)

  if (isLoading) {
    return (
      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
          padding: "0 48px",
          paddingTop: 64,
        }}
      >
        loading...
      </div>
    )
  }

  if (isError || !incident) {
    return (
      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
          padding: "0 48px",
          paddingTop: 64,
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: 13,
          color: "var(--text-secondary)",
        }}
      >
        incident not found
      </div>
    )
  }

  return (
    <div
      style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: "0 48px",
        paddingTop: 48,
        fontFamily: '"IBM Plex Mono", monospace',
        color: "var(--text-primary)",
        fontSize: 13,
      }}
    >
      <Link to="/" style={{ textDecoration: "none" }}>
        <Button variant="ghost" style={{ marginBottom: 32 }}>
          ← STATUS PAGE
        </Button>
      </Link>

      <Card>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              background: "var(--red)",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 14,
              color: "var(--text-primary)",
            }}
          >
            Incident
          </span>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ fontSize: 13 }}>
            <span style={{ color: "var(--text-muted)" }}>Started: </span>
            <span>{new Date(incident.startedAt).toLocaleString()}</span>
          </div>

          <div style={{ fontSize: 13 }}>
            <span style={{ color: "var(--text-muted)" }}>Cause: </span>
            <span>{incident.cause}</span>
          </div>

          <div style={{ fontSize: 13 }}>
            <span style={{ color: "var(--text-muted)" }}>Duration: </span>
            <span style={{ fontFamily: '"JetBrains Mono", monospace' }}>
              {incident.durationMinutes != null
                ? `${incident.durationMinutes} minutes`
                : "ongoing"}
            </span>
          </div>

          <div style={{ fontSize: 13 }}>
            <span style={{ color: "var(--text-muted)" }}>Regions: </span>
            {incident.affectedRegions.map((r) => (
              <span
                key={r}
                style={{
                  border: "1px solid var(--border-default)",
                  padding: "1px 6px",
                  fontSize: 11,
                  marginRight: 4,
                  color: "var(--text-muted)",
                }}
              >
                {r}
              </span>
            ))}
          </div>

          {incident.resolvedAt && (
            <div style={{ fontSize: 13 }}>
              <span style={{ color: "var(--text-muted)" }}>Resolved: </span>
              <span>
                {new Date(incident.resolvedAt).toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
