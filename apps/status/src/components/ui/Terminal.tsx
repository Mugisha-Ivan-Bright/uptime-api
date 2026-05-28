interface TerminalLine {
  type: "prompt" | "output" | "success" | "error" | "comment"
  text: string
}

interface TerminalProps {
  lines: TerminalLine[]
}

const prefixMap: Record<string, string> = {
  prompt: "$ ",
  output: "",
  success: "✓ ",
  error: "✗ ",
  comment: "# ",
}

const colorMap: Record<string, string> = {
  prompt: "var(--green-dim)",
  output: "var(--text-secondary)",
  success: "var(--green-dim)",
  error: "var(--red-dim)",
  comment: "var(--text-muted)",
}

export default function Terminal({ lines }: TerminalProps) {
  return (
    <div style={{
      background: "var(--bg-base)",
      border: "1px solid var(--border-default)",
      padding: "16px 20px",
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: "12px",
      color: "var(--text-secondary)",
      lineHeight: 1.8,
    }}>
      {lines.map((line, i) => (
        <div key={i} style={{ color: colorMap[line.type] ?? "var(--text-secondary)" }}>
          {prefixMap[line.type]}{line.text}
        </div>
      ))}
      <span className="cursor-blink" style={{ color: "var(--green-dim)" }}>▊</span>
    </div>
  )
}
