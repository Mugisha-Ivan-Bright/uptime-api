// Shared types for the Uptime SaaS

export interface CheckResultPayload {
  id: string
  monitorId: string
  region: string
  checkedAt: Date
  status: string
  responseTimeMs: number
  statusCode: number | null
  errorMessage: string | null
  sslExpiryDays: number | null
}

export interface MonitorJob {
  monitorId: string
  orgId: string
  url: string
  httpMethod: string
  expectedStatus: number
  keywordContains: string | null
  timeoutMs: number
  region: string
  sslCheckEnabled: boolean
}

export interface IncidentOpenedPayload {
  id: string
  monitorId: string
  orgId: string
  startedAt: Date
  rootRegion: string
  affectedRegions: string[]
  cause: string
}

export interface AlertPayload {
  type: 'down' | 'recovered' | 'ssl_expiry'
  monitorId: string
  orgId: string
  alertChannelId: string
  incidentId: string
  details: string
}

export interface StripeWebhookEvent {
  type: string
  data: {
    object: {
      id: string
      customer: string
      status: string
      items?: {
        data: Array<{ price: { lookup_key: string } }>
      }
    }
  }
}

// Frontend-facing types

export type MonitorStatus = "up" | "down" | "degraded" | "timed_out" | "unknown"

export interface UptimeBar {
  date: string
  uptimePct: number
  totalChecks: number
  downChecks: number
  color: "green" | "yellow" | "orange" | "red"
}

export interface MonitorSummary {
  id: string
  name: string
  url: string
  currentStatus: MonitorStatus
  uptimePct90d: number
  uptimeBars: UptimeBar[]
  activeIncident: ActiveIncident | null
}

export interface ActiveIncident {
  id: string
  startedAt: string
  cause: string
  affectedRegions: string[]
}

export interface RecentIncident {
  id: string
  monitorId: string
  monitorName: string
  startedAt: string
  resolvedAt: string | null
  durationMinutes: number | null
  cause: string
  affectedRegions: string[]
}

export interface StatusPageData {
  org: {
    id: string
    name: string
    slug: string
  }
  overallStatus: "operational" | "degraded" | "outage" | "unknown"
  monitors: MonitorSummary[]
  recentIncidents: RecentIncident[]
  generatedAt: string
}

export interface AuthResponse {
  token: string
  user: {
    id: string
    email: string
    role: string
  }
  org: {
    id: string
    name: string
    slug: string
    plan: string
  }
}

export interface OrgMeResponse {
  org: {
    id: string
    name: string
    slug: string
    plan: string
    createdAt: string
  }
  user: {
    id: string
    email: string
    role: string
    createdAt: string
  }
  monitors: number
  incidents: {
    open: number
    total: number
  }
}

export interface ApiKeyResponse {
  plainKey?: string
  apiKey: {
    id: string
    name: string
    createdAt: string
  }
  warning?: string
}

export interface AlertChannelData {
  id: string
  orgId: string
  type: string
  config: Record<string, unknown>
  notifyOn: string[]
}

export interface JwtPayload {
  orgId: string
  userId: string
  plan: string
  role: string
}

export interface AuthContext {
  orgId: string
  userId?: string
  plan: string
  authMethod: "jwt" | "apikey"
}

export type PlanName = "hobby" | "starter" | "pro" | "business"

export interface PlanDef {
  maxMonitors: number
  minIntervalSeconds: number
  maxRegions: number
  alertChannels: string[]
  dataRetentionDays: number
  customDomain: boolean
  apiAccess: boolean
}

export interface IncidentRow {
  id: string
  monitorId: string
  orgId: string
  monitor: { name: string }
  startedAt: Date
  resolvedAt: Date | null
  rootRegion: string
  affectedRegions: string[]
  cause: string
  acknowledgedAt: Date | null
  acknowledgedBy: string | null
}

export interface MonitorDetailData {
  id: string
  orgId: string
  name: string
  url: string
  type: string
  intervalSeconds: number
  regions: string[]
  httpMethod: string
  expectedStatus: number
  keywordContains: string | null
  sslCheckEnabled: boolean
  timeoutMs: number
  isActive: boolean
  createdAt: Date
  status: MonitorStatus
  checkResults: Array<{
    id: string
    region: string
    checkedAt: Date
    status: string
    responseTimeMs: number
    statusCode: number | null
    errorMessage: string | null
    sslExpiryDays: number | null
  }>
}