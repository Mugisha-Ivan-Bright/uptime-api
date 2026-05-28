import { z } from "zod"
import dotenv from "dotenv"

dotenv.config()

const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required"),
  REDIS_URL: z
    .string()
    .min(1, "REDIS_URL is required"),
  PORT: z
    .string()
    .default("3000")
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().positive("PORT must be a positive integer")),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  RESEND_API_KEY: z
    .string()
    .optional(),
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters"),
  STRIPE_SECRET_KEY: z
    .string()
    .min(1, "STRIPE_SECRET_KEY is required"),
  STRIPE_WEBHOOK_SECRET: z
    .string()
    .min(1, "STRIPE_WEBHOOK_SECRET is required"),
  APP_URL: z
    .string()
    .url("APP_URL must be a valid URL")
    .default("http://localhost:3000"),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  const errors = parsed.error.flatten().fieldErrors
  const lines: string[] = ["Environment validation failed:"]
  for (const [key, msgs] of Object.entries(errors)) {
    if (msgs) {
      for (const msg of msgs) {
        lines.push(`  - ${key}: ${msg}`)
      }
    }
  }
  console.error(lines.join("\n"))
  process.exit(1)
}

export const env = parsed.data
