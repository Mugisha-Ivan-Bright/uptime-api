import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import Button from "../components/ui/Button"
import Card from "../components/ui/Card"
import Badge from "../components/ui/Badge"
import Terminal from "../components/ui/Terminal"
import api from "../lib/api"

interface PlanInfo {
  id: string
  name: string
  price: string
  monitors: number
  interval: string
  regions: number
  channels: number
  retention: string
  priceLabel: string
}

const PLANS: PlanInfo[] = [
  { id: "hobby", name: "Hobby", price: "$0", monitors: 3, interval: "5min", regions: 1, channels: 1, retention: "30 days", priceLabel: "Free" },
  { id: "starter", name: "Starter", price: "$29", monitors: 10, interval: "1min", regions: 3, channels: 2, retention: "90 days", priceLabel: "$29/mo" },
  { id: "pro", name: "Pro", price: "$99", monitors: 50, interval: "30s", regions: 5, channels: 4, retention: "365 days", priceLabel: "$99/mo" },
  { id: "business", name: "Business", price: "$299", monitors: 999999, interval: "30s", regions: 999999, channels: 4, retention: "365 days", priceLabel: "$299/mo" },
]

export default function Billing() {
  const navigate = useNavigate()

  const { data: orgData } = useQuery<{ org?: { plan?: string } }>({
    queryKey: ["org-me"],
    queryFn: () => api.get("/api/v1/orgs/me").then((r) => r.data),
  })

  const currentPlanId: string = orgData?.org?.plan ?? "hobby"
  const currentPlan = PLANS.find((p) => p.id === currentPlanId) ?? PLANS[0]!

  const portalMutation = useMutation({
    mutationFn: () => api.post("/api/v1/billing/portal").then((r) => r.data),
    onSuccess: (data: { url?: string }) => {
      if (data?.url) {
        window.location.href = data.url
      }
    },
  })

  const checkoutMutation = useMutation({
    mutationFn: (planId: string) =>
      api.post("/api/v1/billing/checkout", { plan: planId }).then((r) => r.data as { url?: string }),
    onSuccess: (data) => {
      if (data?.url) {
        window.location.href = data.url
      }
    },
  })

  return (
    <div>
      <section style={{ marginBottom: 48 }}>
        <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--text-muted)", fontFamily: '"JetBrains Mono", monospace', marginBottom: 16 }}>
          CURRENT PLAN
        </div>

        <Card>
          <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 24, color: "var(--text-primary)", marginBottom: 16 }}>
            {currentPlan.name}
          </div>

          <Terminal lines={[
            { type: "comment", text: "plan limits" },
            { type: "prompt", text: `monitors:          ${currentPlan.monitors === 999999 ? "unlimited" : currentPlan.monitors} used` },
            { type: "output", text: `check interval:    min ${currentPlan.interval}` },
            { type: "output", text: `regions:           ${currentPlan.regions === 999999 ? "unlimited" : `${currentPlan.regions} region${currentPlan.regions > 1 ? "s" : ""}`}` },
            { type: "output", text: `alert channels:    ${currentPlan.channels} types` },
            { type: "output", text: `data retention:    ${currentPlan.retention}` },
          ]} />

          <div style={{ marginTop: 20 }}>
            <Button
              variant="primary"
              size="md"
              onClick={() => portalMutation.mutate()}
              disabled={portalMutation.isPending}
            >
              MANAGE SUBSCRIPTION
            </Button>
            {portalMutation.isError && (
              <div style={{ marginTop: 12 }}>
                <Terminal lines={[{ type: "error", text: "portal session failed" }]} />
              </div>
            )}
          </div>
        </Card>
      </section>

      <section>
        <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--text-muted)", fontFamily: '"JetBrains Mono", monospace', marginBottom: 16 }}>
          PLAN COMPARISON
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 1,
          background: "var(--border-default)",
        }}>
          {PLANS.map((plan) => {
            const isCurrent = plan.id === currentPlanId
            return (
              <div
                key={plan.id}
                style={{
                  background: "var(--bg-card)",
                  padding: "24px 20px",
                  display: "flex",
                  flexDirection: "column",
                  borderLeft: isCurrent ? "2px solid var(--green-dim)" : "2px solid transparent",
                }}
              >
                <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-primary)", marginBottom: 8 }}>
                  {plan.name}
                </div>
                <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 20, color: "var(--text-primary)", marginBottom: 20 }}>
                  {plan.price}
                  <span style={{ fontSize: 10, color: "var(--text-muted)" }}> /{plan.id === "hobby" ? "forever" : "mo"}</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 24, flex: 1 }}>
                  {[
                    `Monitors: ${plan.monitors === 999999 ? "Unlimited" : plan.monitors}`,
                    `Min interval: ${plan.interval}`,
                    `Regions: ${plan.regions === 999999 ? "Unlimited" : plan.regions}`,
                    `Channels: ${plan.channels} type${plan.channels > 1 ? "s" : ""}`,
                    `Retention: ${plan.retention}`,
                  ].map((line) => (
                    <div key={line} style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                      {line}
                    </div>
                  ))}
                </div>

                {isCurrent ? (
                  <div style={{ textAlign: "center" }}>
                    <Badge status="up">CURRENT PLAN</Badge>
                  </div>
                ) : plan.id !== "hobby" ? (
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => checkoutMutation.mutate(plan.id)}
                    disabled={checkoutMutation.isPending}
                  >
                    UPGRADE →
                  </Button>
                ) : null}
              </div>
            )
          })}
        </div>

        {checkoutMutation.isError && (
          <div style={{ marginTop: 16 }}>
            <Terminal lines={[{ type: "error", text: "checkout session failed" }]} />
          </div>
        )}
      </section>
    </div>
  )
}
