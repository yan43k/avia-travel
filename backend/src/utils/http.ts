import type { Response } from "express";
import { env } from "../config/env";

export function ok<T>(res: Response, data: T, status = 200) {
  return res.status(status).json(data);
}

export function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: unknown
) {
  return res.status(status).json({ error: { code, message, details } });
}

export function cookieOptions() {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE === "true",
    sameSite: "lax" as const,
    path: "/",
    maxAge: env.REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
  };
}
