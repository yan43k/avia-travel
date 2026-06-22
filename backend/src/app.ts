import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import { env, corsOriginList } from "./config/env";
import { logger } from "./lib/logger";
import { errorHandler } from "./middleware/errorHandler";
import { authRouter } from "./routes/auth.routes";
import { publicRouter } from "./routes/public.routes";
import { meRouter } from "./routes/me.routes";
import { adminRouter } from "./routes/admin.routes";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);

  app.use(
    pinoHttp({
      logger,
      autoLogging: { ignore: (req) => req.url === "/api/health" },
    })
  );

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) {
          callback(null, true);
          return;
        }
        if (corsOriginList.includes(origin)) {
          callback(null, true);
          return;
        }
        if (
          env.NODE_ENV === "production" &&
          /^https:\/\/[a-z0-9-]+\.onrender\.com$/i.test(origin)
        ) {
          callback(null, true);
          return;
        }
        callback(new Error(`CORS blocked for origin: ${origin}`));
      },
      credentials: true,
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  const limiter = rateLimit({
    windowMs: 60_000,
    limit: 300,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  });
  app.use("/api", limiter);

  const authLimiter = rateLimit({
    windowMs: 60_000,
    limit: 20,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  });
  app.use("/api/auth/login", authLimiter);
  app.use("/api/auth/register", authLimiter);

  app.get("/", (_req, res) => {
    res.redirect(302, env.FRONTEND_URL);
  });

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "avia-travel-api", env: env.NODE_ENV });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/public", publicRouter);
  app.use("/api", meRouter);
  app.use("/api/admin", adminRouter);

  app.use(errorHandler);
  return app;
}
