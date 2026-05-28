import { type ButtonHTMLAttributes } from "react"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "destructive" | "ghost"
  size?: "sm" | "md"
  loading?: boolean
}

export default function Button({
  variant = "primary",
  size = "md",
  disabled,
  loading,
  children,
  style,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading
  const isGhost = variant === "ghost"

  const baseStyle: React.CSSProperties = {
    background: "transparent",
    border: isGhost ? "none" : "1px solid var(--border-focus)",
    color: isGhost ? "var(--text-secondary)" : "var(--text-primary)",
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: "11px",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    padding: size === "sm" ? "4px 10px" : "8px 16px",
    borderRadius: 0,
    position: "relative",
    opacity: isDisabled ? 0.3 : 1,
    cursor: isDisabled ? "not-allowed" : "pointer",
    transition: "all 150ms ease",
    ...style,
  }

  return (
    <button
      disabled={isDisabled}
      style={baseStyle}
      onMouseEnter={(e) => {
        if (isDisabled || isGhost) return
        e.currentTarget.style.background = "var(--bg-hover)"
        e.currentTarget.style.borderColor = variant === "destructive" ? "var(--red)" : "var(--green)"
      }}
      onMouseLeave={(e) => {
        if (isDisabled || isGhost) return
        e.currentTarget.style.background = "transparent"
        e.currentTarget.style.borderColor = "var(--border-focus)"
      }}
      {...props}
    >
      <span style={{ opacity: loading ? 0 : 1 }}>{children}</span>
      {loading && (
        <span style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: '"JetBrains Mono", monospace',
        }}>
          ...
        </span>
      )}
    </button>
  )
}
