import { type ReactNode } from "react"

interface CardProps {
  children: ReactNode
  onClick?: () => void
  padding?: string
  style?: React.CSSProperties
}

export default function Card({ children, onClick, padding = "24px", style }: CardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-default)",
        borderRadius: 0,
        padding,
        cursor: onClick ? "pointer" : undefined,
        transition: "border-color 150ms ease",
        ...style,
      }}
      onMouseEnter={(e) => {
        if (onClick) e.currentTarget.style.borderColor = "var(--border-accent)"
      }}
      onMouseLeave={(e) => {
        if (onClick) e.currentTarget.style.borderColor = "var(--border-default)"
      }}
    >
      {children}
    </div>
  )
}
