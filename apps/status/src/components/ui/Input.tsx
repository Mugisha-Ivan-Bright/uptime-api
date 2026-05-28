import { type InputHTMLAttributes } from "react"

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export default function Input({
  label,
  error,
  hint,
  style,
  ...props
}: InputProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {label && (
        <label style={{
          textTransform: "uppercase",
          fontSize: "10px",
          letterSpacing: "0.1em",
          color: "var(--text-secondary)",
          fontFamily: '"JetBrains Mono", monospace',
        }}>
          {label}
        </label>
      )}
      <input
        style={{
          background: "var(--bg-surface)",
          border: `1px solid ${error ? "var(--red-dim)" : "var(--border-default)"}`,
          color: "var(--text-primary)",
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: "13px",
          padding: "10px 12px",
          borderRadius: 0,
          outline: "none",
          transition: "border-color 150ms ease",
          ...style,
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = error ? "var(--red-dim)" : "var(--border-focus)"
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = error ? "var(--red-dim)" : "var(--border-default)"
        }}
        {...props}
      />
      {hint && !error && (
        <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{hint}</span>
      )}
      {error && (
        <span style={{ fontSize: "11px", color: "var(--red-dim)" }}>{error}</span>
      )}
    </div>
  )
}
