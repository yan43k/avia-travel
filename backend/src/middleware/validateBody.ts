import type { NextFunction, Response } from "express";
import type { ZodTypeAny } from "zod";
import { z, ZodError } from "zod";
import type { AuthRequest } from "../types/express";

export function validateBody<S extends ZodTypeAny>(schema: S) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    try {
      (req as AuthRequest & { body: z.infer<S> }).body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return next(err);
      }
      next(err);
    }
  };
}

export function validateQuery<S extends ZodTypeAny>(schema: S) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req.query);
      (req as { query: unknown }).query = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return next(err);
      }
      next(err);
    }
  };
}
