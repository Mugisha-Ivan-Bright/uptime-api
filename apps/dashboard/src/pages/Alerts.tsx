import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Terminal from "../components/ui/Terminal";
import Input from "../components/ui/Input";
import api from "../lib/api";
import type { AlertChannelData } from "@uptime/types";

const CHANNEL_TYPES = ["EMAIL", "SLACK", "PAGERDUTY", "WEBHOOK"] as const;
const EVENT_TYPES = ["DOWN", "RECOVERED", "SSL_EXPIRY"] as const;

const channelSchema = z.object({
  type: z.enum(CHANNEL_TYPES),
  config: z.record(z.unknown()),
  notifyOn: z.array(z.enum(EVENT_TYPES)).min(1, "Select at least one event"),
});

type ChannelForm = z.infer<typeof channelSchema>;

const TYPE_LABELS: Record<string, string> = {
  EMAIL: "Email",
  SLACK: "Slack",
  PAGERDUTY: "PagerDuty",
  WEBHOOK: "Webhook",
};

function TypeIcon({ type }: { type: string }) {
  const icon =
    type === "EMAIL"
      ? `---${"\n"} | | ${"\n"} ---`
      : type === "SLACK"
      ? `#`
      : type === "PAGERDUTY"
      ? `(!)`
      : `<>`;
  return (
    <span
      style={{
        fontFamily: "JetBrains Mono, monospace",
        fontSize: "14px",
        color: "var(--accent, #fff)",
        whiteSpace: "pre",
      }}
    >
      {icon}
    </span>
  );
}

function ConfigPreview({ type, config }: { type: string; config: Record<string, unknown> }) {
  const preview =
    type === "EMAIL"
      ? (config.recipient as string) || ""
      : type === "SLACK"
      ? (config.webhookUrl as string) || ""
      : type === "PAGERDUTY"
      ? `routing key: ${((config.routingKey as string) || "").slice(0, 8)}...`
      : type === "WEBHOOK"
      ? (config.url as string) || ""
      : JSON.stringify(config);
  return (
    <span
      style={{
        fontSize: "11px",
        color: "var(--text-muted, #888)",
        fontFamily: "IBM Plex Mono, monospace",
        wordBreak: "break-all",
      }}
    >
      {preview}
    </span>
  );
}

export default function Alerts() {
  const [showForm, setShowForm] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("EMAIL");
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<ChannelForm>({
    resolver: zodResolver(channelSchema),
    defaultValues: {
      type: "EMAIL",
      config: {},
      notifyOn: ["DOWN"],
    },
  });

  const { data: channels, isLoading, error } = useQuery<AlertChannelData[]>({
    queryKey: ["alert-channels"],
    queryFn: () => api.get("/api/v1/alerts"),
  });

  const createMutation = useMutation({
    mutationFn: (data: ChannelForm) => api.post("/api/v1/alerts", { body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alert-channels"] });
      setShowForm(false);
      reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/alerts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alert-channels"] });
    },
  });

  const onSubmit = (data: ChannelForm) => {
    createMutation.mutate({ ...data, type: selectedType as ChannelForm["type"] });
  };

  const configFields = () => {
    switch (selectedType) {
      case "EMAIL":
        return (
          <Input
            placeholder="recipient@example.com"
            {...register("config.recipient")}
            style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "12px", width: "100%" }}
          />
        );
      case "SLACK":
        return (
          <Input
            placeholder="https://hooks.slack.com/..."
            {...register("config.webhookUrl")}
            style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "12px", width: "100%" }}
          />
        );
      case "PAGERDUTY":
        return (
          <Input
            placeholder="routing key"
            {...register("config.routingKey")}
            style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "12px", width: "100%" }}
          />
        );
      case "WEBHOOK":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <Input
              placeholder="https://example.com/webhook"
              {...register("config.url")}
              style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "12px", width: "100%" }}
            />
            <Input
              placeholder="secret (optional)"
              {...register("config.secret")}
              style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "12px", width: "100%" }}
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ padding: "32px", fontFamily: "IBM Plex Mono, monospace" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
        }}
      >
        <h1
          style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: "16px",
            letterSpacing: "0.1em",
            margin: 0,
          }}
        >
          ALERT CHANNELS
        </h1>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowForm((v) => !v)}
          style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: "10px",
            letterSpacing: "0.1em",
          }}
        >
          + ADD CHANNEL
        </Button>
      </div>

      {showForm && (
        <Card
          style={{
            padding: "20px",
            marginBottom: "24px",
            fontFamily: "IBM Plex Mono, monospace",
          }}
        >
          <form
            onSubmit={handleSubmit(onSubmit)}
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "10px",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  marginBottom: "6px",
                  color: "var(--text-secondary, #aaa)",
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                Type
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                style={{
                  width: "100%",
                  background: "var(--bg-base, #0d0d0d)",
                  border: "1px solid var(--border-default, #2d2d2d)",
                  color: "var(--text-primary, #fff)",
                  padding: "8px 12px",
                  fontSize: "12px",
                  fontFamily: "IBM Plex Mono, monospace",
                }}
              >
                {CHANNEL_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "10px",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  marginBottom: "6px",
                  color: "var(--text-secondary, #aaa)",
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                Configuration
              </label>
              {configFields()}
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "10px",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  marginBottom: "6px",
                  color: "var(--text-secondary, #aaa)",
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                Notify On
              </label>
              <div style={{ display: "flex", gap: "16px" }}>
                {EVENT_TYPES.map((evt) => (
                  <label
                    key={evt}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "11px",
                      color: "var(--text-primary, #fff)",
                      fontFamily: "IBM Plex Mono, monospace",
                    }}
                  >
                    <input
                      type="checkbox"
                      value={evt}
                      defaultChecked={evt === "DOWN"}
                      {...register("notifyOn")}
                    />
                    {evt}
                  </label>
                ))}
              </div>
              {errors.notifyOn && (
                <span
                  style={{
                    color: "var(--red, #ff3333)",
                    fontSize: "10px",
                    marginTop: "4px",
                    display: "block",
                  }}
                >
                  {errors.notifyOn.message}
                </span>
              )}
            </div>

            {createMutation.isError && (
              <Terminal
                lines={[
                  {
                    type: "error",
                    text: `Failed to create channel: ${(createMutation.error as Error).message}`,
                  },
                ]}
              />
            )}

            <Button
              variant="primary"
              type="submit"
              disabled={createMutation.isPending}
              style={{
                fontFamily: "JetBrains Mono, monospace",
                fontSize: "10px",
                letterSpacing: "0.1em",
                alignSelf: "flex-start",
              }}
            >
              SAVE CHANNEL
            </Button>
          </form>
        </Card>
      )}

      {isLoading && (
        <span style={{ color: "var(--text-muted, #666)", fontSize: "12px" }}>
          Loading alert channels...
        </span>
      )}

      {error && (
        <Terminal
          lines={[
            {
              type: "error",
              text: `Failed to load alert channels: ${(error as Error).message}`,
            },
          ]}
        />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {channels?.map((ch) => (
          <Card
            key={ch.id}
            style={{
              padding: "16px 20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              fontFamily: "IBM Plex Mono, monospace",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <TypeIcon type={ch.type} />
                <span
                  style={{
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: "12px",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "var(--text-primary, #fff)",
                  }}
                >
                  {TYPE_LABELS[ch.type] || ch.type}
                </span>
              </div>

              <ConfigPreview type={ch.type} config={ch.config} />

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "10px",
                  color: "var(--text-muted, #888)",
                  flexWrap: "wrap",
                }}
              >
                <span style={{ fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.1em" }}>
                  NOTIFIES ON:
                </span>
                {(ch.notifyOn || []).map((evt) => (
                  <span
                    key={evt}
                    style={{
                      border: "1px solid var(--border-default, #444)",
                      padding: "1px 6px",
                      fontSize: "9px",
                      fontFamily: "JetBrains Mono, monospace",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: "var(--accent, #fff)",
                    }}
                  >
                    {evt}
                  </span>
                ))}
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteMutation.mutate(ch.id)}
              disabled={deleteMutation.isPending}
              style={{
                fontFamily: "JetBrains Mono, monospace",
                fontSize: "10px",
                letterSpacing: "0.1em",
                color: "var(--red, #ff3333)",
                flexShrink: 0,
                marginLeft: "16px",
              }}
            >
              DELETE
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
