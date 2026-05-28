import jwt from "jsonwebtoken"
import type { JwtPayload } from "@uptime/types"
import { AppError } from "./errors.js"
import { env } from "../config/env.js"

export function signToken(payload: Omit<JwtPayload, "iat" | "exp">): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: "7d" })
}

export function verifyToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload
    return decoded
  } catch {
    throw new AppError("Invalid or expired token", 401, "UNAUTHORIZED")
  }
}
