import { type ButtonHTMLAttributes } from "react"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "destructive" | "ghost"
  size?: "sm" | "md"
  loading?: boolean
}

const variantStyles: Record<string, React.CSSProperties> = {
  primary: {},
  destructive: {},
  ghost: {
    background: "transparent",
    borderColor: "transparent",
    color: "var(--text-secondary)",
  },
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

  const baseStyle: React.CSSProperties = {
    background: variant === "ghost" ? "transparent" : "transparent",
    border: variant === "ghost" ? "none" : "1px solid var(--border-focus)",
    color: variant === "ghost" ? "var(--text-secondary)" : "var(--text-primary)",
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
    ...variantStyles[variant],
    ...style,
  }

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isDisabled || variant === "ghost") return
    e.currentTarget.style.background = "var(--bg-hover)"
    if (variant === "destructive") {
      e.currentTarget.style.borderColor = "var(--red)"
    } else {
      e.currentTarget.style.borderColor = "var(--green)"
    }
  }

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isDisabled || variant === "ghost") return
    e.currentTarget.style.background = "transparent"
    e.currentTarget.style.borderColor = "var(--border-focus)"
  }

  const handleGhostEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (variant !== "ghost" || isDisabled) return
    e.currentTarget.style.color = "var(--text-primary)"
  }

  const handleGhostLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (variant !== "ghost" || isDisabled) return
    e.currentTarget.style.color = "var(--text-secondary)"
  }

  return (
    <button
      disabled={isDisabled}
      style={baseStyle}
      onMouseEnter={(e) => { handleMouseEnter(e); handleGhostEnter(e) }}
      onMouseLeave={(e) => { handleMouseLeave(e); handleGhostLeave(e) }}
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
