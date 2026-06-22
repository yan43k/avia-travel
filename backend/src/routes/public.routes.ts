import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { validateBody } from "../middleware/validateBody";
import { buildQuote } from "../services/quote.service";
import { getTracking } from "../services/tracking.service";
import { ok, sendError } from "../utils/http";
import type { AuthRequest } from "../types/express";

export const publicRouter = Router();

publicRouter.get(
  "/cities",
  asyncHandler(async (_req, res) => {
    const cities = await prisma.city.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, region: true, lat: true, lng: true },
    });
    return ok(res, { items: cities });
  })
);

const quoteSchema = z.object({
  origin: z.string().min(1),
  destination: z.string().min(1),
  weightKg: z.number().positive().max(500),
  cargoType: z.enum(["PARCEL", "CARGO", "FRAGILE", "DOCUMENTS"]),
  urgency: z.enum(["STANDARD", "EXPRESS", "URGENT"]),
  insurance: z.boolean(),
});

publicRouter.post(
  "/quotes/calculate",
  validateBody(quoteSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const data = await buildQuote(req.body);
    return ok(res, data);
  })
);

publicRouter.get(
  "/tracking/:trackingNumber",
  asyncHandler(async (req, res) => {
    const tn = String(req.params.trackingNumber);
    const data = await getTracking(tn);
    return ok(res, data);
  })
);

publicRouter.get(
  "/routes/popular",
  asyncHandler(async (_req, res) => {
    const routes = await prisma.route.findMany({
      where: { isActive: true },
      orderBy: { popularity: "desc" },
      take: 12,
      include: { originCity: true, destinationCity: true },
    });
    return ok(res, {
      items: routes.map((r) => ({
        id: r.id,
        from: r.originCity.name,
        to: r.destinationCity.name,
        distanceKm: r.distanceKm,
        popularity: r.popularity,
        estimatedHours: r.estimatedHours,
        loadPercent: r.loadPercent,
      })),
    });
  })
);

publicRouter.get(
  "/routes/map",
  asyncHandler(async (_req, res) => {
    const routes = await prisma.route.findMany({
      where: { isActive: true },
      include: { originCity: true, destinationCity: true },
    });
    return ok(res, {
      nodes: Array.from(
        new Map(
          routes.flatMap((r) => [
            [r.originCity.id, r.originCity],
            [r.destinationCity.id, r.destinationCity],
          ])
        ).values()
      ),
      edges: routes.map((r) => ({
        id: r.id,
        fromId: r.originCityId,
        toId: r.destinationCityId,
        distanceKm: r.distanceKm,
        loadPercent: r.loadPercent,
      })),
    });
  })
);

publicRouter.get(
  "/reviews",
  asyncHandler(async (_req, res) => {
    const reviews = await prisma.review.findMany({
      where: { published: true },
      orderBy: { createdAt: "desc" },
      take: 12,
    });
    return ok(res, { items: reviews });
  })
);

publicRouter.get(
  "/stats",
  asyncHandler(async (_req, res) => {
    const [shipments, routes, clients] = await Promise.all([
      prisma.shipment.count(),
      prisma.route.count({ where: { isActive: true } }),
      prisma.user.count({ where: { role: "USER" } }),
    ]);
    return ok(res, {
      shipmentsHandled: shipments + 12840,
      routePairs: routes,
      activeClients: clients + 420,
      onTimeRate: 97.2,
    });
  })
);

/** Без этого неизвестные GET под /api/public проходят к следующему app.use('/api'), где стоит requireAuth → ложный 401. */
publicRouter.use((_req, res) => sendError(res, 404, "NOT_FOUND", "Ресурс не найден"));
