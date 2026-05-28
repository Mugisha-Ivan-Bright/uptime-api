import { PrismaClient } from "@prisma/client"

const p = new PrismaClient({
  datasources: { db: { url: "postgres://postgres:postgres@localhost:5432/uptime" } },
})

const orgs = await p.organization.findMany()
console.log("orgs count:", orgs.length)
if (orgs.length > 0) {
  console.log("first org:", orgs[0].slug, orgs[0].plan)
}

await p.$disconnect()
