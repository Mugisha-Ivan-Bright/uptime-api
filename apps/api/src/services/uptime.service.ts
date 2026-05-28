import type { PrismaClient } from "@uptime/db"
import type { UptimeBar } from "@uptime/types"

function getDateKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function uptimeColor(pct: number): UptimeBar["color"] {
  if (pct >= 99.9) return "green"
  if (pct >= 99.0) return "yellow"
  if (pct >= 95.0) return "orange"
  return "red"
}

export async function getDailyUptimeBars(
  prisma: PrismaClient,
  monitorId: string,
  days: number
): Promise<UptimeBar[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const results = await prisma.checkResult.findMany({
    where: {
      monitorId,
      checkedAt: { gte: since },
    },
    select: { checkedAt: true, status: true },
  })

  const dayMap = new Map<string, { total: number; down: number }>()

  for (const r of results) {
    const key = getDateKey(r.checkedAt)
    const entry = dayMap.get(key) ?? { total: 0, down: 0 }
    entry.total++
    if (r.status !== "up") entry.down++
    dayMap.set(key, entry)
  }

  const bars: UptimeBar[] = []
  const now = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    const key = getDateKey(d)
    const data = dayMap.get(key)

    if (!data || data.total === 0) {
      bars.push({
        date: key,
        uptimePct: 100,
        totalChecks: 0,
        downChecks: 0,
        color: "green",
      })
    } else {
      const uptimePct = Math.round(((data.total - data.down) / data.total) * 10000) / 100
      bars.push({
        date: key,
        uptimePct,
        totalChecks: data.total,
        downChecks: data.down,
        color: uptimeColor(uptimePct),
      })
    }
  }

  return bars
}

export async function getUptimePct(
  prisma: PrismaClient,
  monitorId: string,
  days: number
): Promise<number> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const total = await prisma.checkResult.count({
    where: {
      monitorId,
      checkedAt: { gte: since },
    },
  })

  if (total === 0) return 100

  const downCount = await prisma.checkResult.count({
    where: {
      monitorId,
      checkedAt: { gte: since },
      NOT: { status: "up" },
    },
  })

  const uptimePct = ((total - downCount) / total) * 100
  return Math.round(uptimePct * 100) / 100
}
