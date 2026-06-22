import type { NextFunction, Response } from "express";
import { AppError } from "../utils/errors";
import { verifyAccessToken } from "../services/tokens";
import type { AuthRequest } from "../types/express";

export function requireAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new AppError(401, "UNAUTHORIZED", "Требуется авторизация");
  }
  const token = header.slice("Bearer ".length).trim();
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    throw new AppError(401, "UNAUTHORIZED", "Сессия устарела или недействительна");
  }
}

export function requireAdmin(req: AuthRequest, _res: Response, next: NextFunction) {
  if (!req.user) {
    throw new AppError(401, "UNAUTHORIZED", "Требуется авторизация");
  }
  if (req.user.role !== "ADMIN") {
    throw new AppError(403, "FORBIDDEN", "Недостаточно прав доступа");
  }
  next();
}
