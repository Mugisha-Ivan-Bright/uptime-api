import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import Button from "../components/ui/Button"
import Card from "../components/ui/Card"
import Terminal from "../components/ui/Terminal"
import Input from "../components/ui/Input"
import api from "../lib/api"

const orgSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
})

type OrgForm = z.infer<typeof orgSchema>

interface ApiKeyItem {
  id: string
  name: string
  createdAt: string
}

interface OrgData {
  org: { id: string; name: string; slug: string; plan: string }
  user: { id: string; email: string; role: string }
}

export default function Settings() {
  const queryClient = useQueryClient()
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([])
  const [newKeyName, setNewKeyName] = useState("")
  const [createdKeyData, setCreatedKeyData] = useState<{ name: string; key: string } | null>(null)

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<OrgForm>({
    resolver: zodResolver(orgSchema),
  })

  const { data: orgData, isLoading: orgLoading } = useQuery<OrgData>({
    queryKey: ["org-settings"],
    queryFn: () => api.get("/api/v1/orgs/me").then((r) => r.data),
  })

  useEffect(() => {
    if (orgData) {
      reset({ name: orgData.org.name })
    }
  }, [orgData, reset])

  const updateOrgMutation = useMutation({
    mutationFn: (data: OrgForm) => api.patch("/api/v1/orgs/me", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-settings"] })
    },
  })

  const createKeyMutation = useMutation({
    mutationFn: (name: string) =>
      api.post("/api/v1/auth/api-keys", { name }).then((r) => r.data as { plainKey?: string; apiKey: ApiKeyItem; warning?: string }),
    onSuccess: (data) => {
      if (data.plainKey) {
        setCreatedKeyData({ name: data.apiKey.name, key: data.plainKey })
        setApiKeys((prev) => [...prev, data.apiKey])
      }
      setNewKeyName("")
    },
  })

  const revokeKeyMutation = useMutation({
    mutationFn: (keyId: string) => api.delete(`/api/v1/auth/api-keys/${keyId}`),
    onSuccess: (_data, keyId) => {
      setApiKeys((prev) => prev.filter((k) => k.id !== keyId))
      if (createdKeyData) setCreatedKeyData(null)
    },
  })

  const handleCreateKey = () => {
    if (!newKeyName.trim()) return
    createKeyMutation.mutate(newKeyName.trim())
  }

  const onOrgSubmit = (data: OrgForm) => {
    updateOrgMutation.mutate(data)
  }

  return (
    <div>
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--text-muted)", fontFamily: '"JetBrains Mono", monospace', marginBottom: 24 }}>
        SETTINGS
      </div>

      <section style={{ marginBottom: 48 }}>
        <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-secondary)", fontFamily: '"JetBrains Mono", monospace', marginBottom: 16 }}>
          ORGANIZATION
        </div>

        <Card>
          {orgLoading && <span style={{ color: "var(--text-muted)", fontSize: 12 }}>Loading organization...</span>}

          {orgData && (
            <form onSubmit={handleSubmit(onOrgSubmit)} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Input
                label="Organization Name"
                {...register("name")}
              />
              {errors.name && <span style={{ color: "var(--red-dim)", fontSize: 10 }}>{errors.name.message}</span>}

              <div>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-secondary)", fontFamily: '"JetBrains Mono", monospace', marginBottom: 6 }}>
                  Slug
                </div>
                <input
                  value={orgData.org.slug}
                  disabled
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-default)",
                    color: "var(--text-muted)",
                    fontFamily: '"IBM Plex Mono", monospace',
                    fontSize: 13,
                    padding: "10px 12px",
                    borderRadius: 0,
                    outline: "none",
                    width: "100%",
                    opacity: 0.5,
                  }}
                />
              </div>

              {updateOrgMutation.isError && (
                <Terminal lines={[{ type: "error", text: "Update failed" }]} />
              )}

              {updateOrgMutation.isSuccess && (
                <Terminal lines={[{ type: "success", text: "Organization updated successfully." }]} />
              )}

              <Button variant="primary" type="submit" disabled={!isDirty || updateOrgMutation.isPending}>
                SAVE CHANGES
              </Button>
            </form>
          )}
        </Card>
      </section>

      <section>
        <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-secondary)", fontFamily: '"JetBrains Mono", monospace', marginBottom: 16 }}>
          API KEYS
        </div>

        <Card>
          {createdKeyData && (
            <div style={{ marginBottom: 20 }}>
              <Terminal lines={[
                { type: "comment", text: "store this key securely — it will not be shown again." },
                { type: "output", text: `name:   ${createdKeyData.name}` },
                { type: "output", text: `key:    ${createdKeyData.key}` },
              ]} />
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginBottom: 20, alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <Input
                label="New Key Name"
                placeholder="e.g. CI/CD Pipeline"
                value={newKeyName}
                onChange={(e) => setNewKeyName((e.target as HTMLInputElement).value)}
              />
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreateKey}
              disabled={createKeyMutation.isPending || !newKeyName.trim()}
            >
              CREATE KEY
            </Button>
          </div>

          {createKeyMutation.isError && (
            <div style={{ marginBottom: 16 }}>
              <Terminal lines={[{ type: "error", text: "Failed to create key" }]} />
            </div>
          )}

          {apiKeys.length === 0 && !createdKeyData ? (
            <Terminal lines={[{ type: "comment", text: "no api keys created this session" }]} />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {apiKeys.map((key) => (
                <div key={key.id} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 12px",
                  background: "var(--bg-surface)",
                  fontSize: 11,
                }}>
                  <div>
                    <span style={{ color: "var(--text-primary)", fontFamily: '"JetBrains Mono", monospace' }}>
                      {key.name}
                    </span>
                    <span style={{ color: "var(--text-muted)", marginLeft: 12 }}>
                      created {new Date(key.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => revokeKeyMutation.mutate(key.id)}
                    disabled={revokeKeyMutation.isPending}
                  >
                    REVOKE
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>
    </div>
  )
}
