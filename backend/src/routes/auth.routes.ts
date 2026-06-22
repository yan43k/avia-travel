import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { validateBody } from "../middleware/validateBody";
import {
  loginUser,
  logoutUser,
  registerUser,
  rotateRefresh,
} from "../services/auth.service";
import { ok, cookieOptions } from "../utils/http";
import { env } from "../config/env";
import type { AuthRequest } from "../types/express";

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  firstName: z.string().min(1).max(80).optional(),
  lastName: z.string().min(1).max(80).optional(),
  phone: z.string().min(5).max(32).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(10).optional(),
});

authRouter.post(
  "/register",
  validateBody(registerSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const user = await registerUser(req.body);
    return ok(res, { user }, 201);
  })
);

authRouter.post(
  "/login",
  validateBody(loginSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const { accessToken, refreshToken, user } = await loginUser(req.body);
    res.cookie(env.REFRESH_COOKIE_NAME, refreshToken, cookieOptions());
    return ok(res, { accessToken, refreshToken, user });
  })
);

const logoutSchema = z.object({
  refreshToken: z.string().min(10).optional(),
});

authRouter.post(
  "/refresh",
  validateBody(refreshSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const cookieToken =
      req.cookies && req.cookies[env.REFRESH_COOKIE_NAME]?.length > 5
        ? String(req.cookies[env.REFRESH_COOKIE_NAME])
        : undefined;
    const refreshTokenRaw = req.body.refreshToken ?? cookieToken;
    if (!refreshTokenRaw) {
      return res.status(401).json({
        error: { code: "UNAUTHORIZED", message: "Сессия не найдена" },
      });
    }
    const out = await rotateRefresh(refreshTokenRaw);
    res.cookie(env.REFRESH_COOKIE_NAME, out.refreshToken, cookieOptions());
    return ok(res, { accessToken: out.accessToken, refreshToken: out.refreshToken });
  })
);

authRouter.post(
  "/logout",
  validateBody(logoutSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const cookieToken =
      req.cookies && req.cookies[env.REFRESH_COOKIE_NAME]
        ? String(req.cookies[env.REFRESH_COOKIE_NAME])
        : undefined;
    const bodyToken = req.body.refreshToken;
    await logoutUser(bodyToken ?? cookieToken);
    res.clearCookie(env.REFRESH_COOKIE_NAME, { path: "/" });
    return ok(res, { ok: true });
  })
);
