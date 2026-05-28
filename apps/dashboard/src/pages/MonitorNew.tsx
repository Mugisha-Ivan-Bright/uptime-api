import { useForm } from "react-hook-form"
import { z } from "zod"
import { useNavigate } from "react-router-dom"
import { useState } from "react"
import api from "../lib/api"
import Button from "../components/ui/Button"
import Input from "../components/ui/Input"
import Terminal from "../components/ui/Terminal"

function zodResolver<T extends z.ZodType>(schema: T) {
  return (values: unknown) => {
    const result = schema.safeParse(values)
    if (result.success) {
      return { values: result.data, errors: {} as Record<string, { message: string }> }
    }
    const errors: Record<string, { message: string }> = {}
    for (const issue of result.error.issues) {
      const path = issue.path.join(".")
      if (!errors[path]) {
        errors[path] = { message: issue.message }
      }
    }
    return { values: {} as Record<string, unknown>, errors }
  }
}

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  url: z.string().min(1, "URL is required").refine((v) => v.startsWith("https://"), {
    message: "URL must start with https://",
  }),
  type: z.enum(["HTTP", "TCP", "KEYWORD"]),
  intervalSeconds: z.number(),
  httpMethod: z.string().optional(),
  expectedStatus: z.number().optional(),
  keyword: z.string().optional(),
  regions: z.array(z.string()),
  sslCheck: z.boolean().optional(),
  timeout: z.number().int().min(100).max(60000),
})

type FormData = z.infer<typeof schema>

export default function MonitorNew() {
  const navigate = useNavigate()
  const [apiError, setApiError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: "HTTP",
      intervalSeconds: 60,
      httpMethod: "GET",
      expectedStatus: 200,
      regions: [],
      timeout: 10000,
    },
  })

  const selectedType = watch("type")
  const urlValue = watch("url") ?? ""
  const showSSL = urlValue.startsWith("https://")
  const selectedRegions = watch("regions") ?? []

  const onSubmit = async (data: FormData) => {
    setApiError(null)
    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        name: data.name,
        url: data.url,
        type: data.type,
        intervalSeconds: data.intervalSeconds,
        regions: data.regions,
        timeoutMs: data.timeout,
      }
      if (data.type === "HTTP") {
        payload.httpMethod = data.httpMethod ?? "GET"
        payload.expectedStatus = data.expectedStatus ?? 200
      }
      if (data.type === "KEYWORD") {
        payload.keywordContains = data.keyword ?? null
      }
      if (showSSL) {
        payload.sslCheckEnabled = data.sslCheck ?? false
      }
      const res = await api.post("/api/v1/monitors", payload)
      navigate(`/monitors/${res.data.id}`)
    } catch (err: any) {
      setApiError(err?.message ?? "Failed to create monitor")
    } finally {
      setSubmitting(false)
    }
  }

  const toggleRegion = (region: string) => {
    if (selectedRegions.includes(region)) {
      setValue("regions", selectedRegions.filter((r) => r !== region))
    } else {
      setValue("regions", [...selectedRegions, region])
    }
  }

  const labelStyle: React.CSSProperties = {
    textTransform: "uppercase",
    fontSize: "10px",
    letterSpacing: "0.1em",
    color: "var(--text-secondary)",
    fontFamily: '"JetBrains Mono", monospace',
    marginBottom: 6,
  }

  const selectStyle: React.CSSProperties = {
    background: "var(--bg-surface)",
    border: "1px solid var(--border-default)",
    color: "var(--text-primary)",
    fontFamily: '"IBM Plex Mono", monospace',
    fontSize: 13,
    padding: "10px 12px",
    borderRadius: 0,
    outline: "none",
    width: "100%",
  }

  return (
    <div>
      <h1 style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 22, color: "var(--text-primary)", marginBottom: 24 }}>
        NEW MONITOR
      </h1>

      {apiError && (
        <div style={{ marginBottom: 16 }}>
          <Terminal lines={[{ type: "error", text: apiError }]} />
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 560 }}>
        <Input label="Name" {...register("name")} error={errors.name?.message} />
        <Input label="URL" {...register("url")} error={errors.url?.message} />

        <div>
          <div style={labelStyle}>Type</div>
          <select {...register("type")} style={selectStyle}>
            <option value="HTTP">HTTP</option>
            <option value="TCP">TCP</option>
            <option value="KEYWORD">KEYWORD</option>
          </select>
        </div>

        <div>
          <div style={labelStyle}>Check Interval</div>
          <select {...register("intervalSeconds", { valueAsNumber: true })} style={selectStyle}>
            <option value={30}>30s</option>
            <option value={60}>60s</option>
            <option value={180}>3min</option>
            <option value={300}>5min</option>
            <option value={600}>10min</option>
          </select>
        </div>

        {selectedType === "HTTP" && (
          <>
            <div>
              <div style={labelStyle}>HTTP Method</div>
              <select {...register("httpMethod")} style={selectStyle}>
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="HEAD">HEAD</option>
              </select>
            </div>
            <Input
              label="Expected Status"
              type="number"
              {...register("expectedStatus", { valueAsNumber: true })}
              error={errors.expectedStatus?.message}
            />
          </>
        )}

        {selectedType === "KEYWORD" && (
          <Input label="Keyword" {...register("keyword")} />
        )}

        <div>
          <div style={labelStyle}>Regions</div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {["us-east", "eu-west", "ap-south"].map((r) => (
              <label key={r} style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 11,
                color: "var(--text-secondary)",
                cursor: "pointer",
              }}>
                <input
                  type="checkbox"
                  checked={selectedRegions.includes(r)}
                  onChange={() => toggleRegion(r)}
                  style={{ accentColor: "var(--green)" }}
                />
                {r}
              </label>
            ))}
          </div>
        </div>

        {showSSL && (
          <div>
            <div style={labelStyle}>SSL Check</div>
            <label style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 11,
              color: "var(--text-secondary)",
              cursor: "pointer",
            }}>
              <input
                type="checkbox"
                {...register("sslCheck")}
                style={{ accentColor: "var(--green)" }}
              />
              Enable SSL certificate check
            </label>
          </div>
        )}

        <Input
          label="Timeout (ms)"
          type="number"
          {...register("timeout", { valueAsNumber: true })}
          error={errors.timeout?.message}
        />

        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          <Button type="submit" loading={submitting}>CREATE MONITOR</Button>
          <Button variant="ghost" type="button" onClick={() => navigate("/monitors")}>CANCEL</Button>
        </div>
      </form>
    </div>
  )
}
