import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { prisma } from "../lib/prisma";
import { validateBody } from "../middleware/validateBody";
import { validateQuery } from "../middleware/validateBody";
import { ok } from "../utils/http";
import { requireAdmin, requireAuth } from "../middleware/auth";
import { AppError } from "../utils/errors";
import type { AuthRequest } from "../types/express";
import type { Prisma } from "@prisma/client";
import { priceForShipment } from "../services/pricing.service";
import { sendMailSafe } from "../services/email.service";

export const adminRouter = Router();
adminRouter.use(requireAuth, requireAdmin);

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(50).optional().default(20),
  q: z.string().optional(),
});

adminRouter.get(
  "/dashboard",
  asyncHandler(async (_req: AuthRequest, res) => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [shipments, revenue, shipmentsLast30] = await Promise.all([
      prisma.shipment.count(),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { status: "PAID" } }),
      prisma.shipment.count({ where: { shippedAt: { gte: thirtyDaysAgo } } }),
    ]);

    const byStatus = await prisma.shipment.groupBy({
      by: ["currentStatusId"],
      _count: true,
    });

    const statusRows = await prisma.shipmentStatus.findMany({
      where: { id: { in: byStatus.map((b) => b.currentStatusId) } },
    });
    const statusMap = Object.fromEntries(statusRows.map((s) => [s.id, s.label]));

    const topRoutes = await prisma.route.findMany({
      include: {
        originCity: true,
        destinationCity: true,
        shipments: true,
      },
      orderBy: { popularity: "desc" },
      take: 5,
    });

    return ok(res, {
      shipmentsTotal: shipments,
      shipmentsLast30Days: shipmentsLast30,
      revenuePaid: revenue._sum.amount ?? 0,
      byStatus: byStatus.map((b) => ({
        statusId: b.currentStatusId,
        label: statusMap[b.currentStatusId],
        count:
          typeof b._count === "number"
            ? b._count
            : typeof b._count === "object" && b._count && "_all" in b._count
              ? Number((b._count as { _all: number })._all)
              : 0,
      })),
      topRoutes: topRoutes.map((r) => ({
        id: r.id,
        from: r.originCity.name,
        to: r.destinationCity.name,
        shipments: r.shipments.length,
        popularity: r.popularity,
        loadPercent: r.loadPercent,
      })),
    });
  })
);

adminRouter.get(
  "/users",
  validateQuery(paginationSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const { page, pageSize, q } = req.query as unknown as z.infer<
      typeof paginationSchema
    >;
    const skip = (page - 1) * pageSize;
    const where = q?.trim()
      ? {
          OR: [
            { email: { contains: q } },
            { firstName: { contains: q } },
            { lastName: { contains: q } },
          ],
        }
      : undefined;

    const [total, items] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          createdAt: true,
        },
      }),
    ]);
    return ok(res, {
      meta: {
        total,
        page,
        pageSize,
        pages: Math.max(1, Math.ceil(total / pageSize)),
      },
      items,
    });
  })
);

const userPatchSchema = z.object({
  role: z.enum(["USER", "ADMIN"]).optional(),
  firstName: z.string().min(1).max(80).optional(),
  phone: z.string().min(5).max(32).optional(),
});

adminRouter.patch(
  "/users/:id",
  validateBody(userPatchSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const uid = String(req.params.id);
    const user = await prisma.user.update({
      where: { id: uid },
      data: req.body,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
      },
    });
    return ok(res, { user });
  })
);

const shipmentFiltersSchema = paginationSchema.extend({
  statusCode: z.string().optional(),
});

adminRouter.get(
  "/shipments",
  validateQuery(shipmentFiltersSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const qp = req.query as unknown as z.infer<typeof shipmentFiltersSchema>;
    const { page, pageSize } = qp;
    const skip = (page - 1) * pageSize;

    const where: Prisma.ShipmentWhereInput = {};

    const search = qp.q?.trim();
    if (search && search.length > 1) {
      where.OR = [
        { trackingNumber: { contains: search.toUpperCase() } },
        { recipientName: { contains: search } },
      ];
    }
    const statusFilter = qp.statusCode?.trim();
    if (statusFilter) {
      where.currentStatus = { code: statusFilter };
    }
    const [total, items] = await Promise.all([
      prisma.shipment.count({ where }),
      prisma.shipment.findMany({
        where,
        orderBy: { shippedAt: "desc" },
        skip,
        take: pageSize,
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          route: { include: { originCity: true, destinationCity: true } },
          currentStatus: true,
        },
      }),
    ]);

    return ok(res, {
      meta: {
        total,
        page,
        pageSize,
        pages: Math.max(1, Math.ceil(total / pageSize)),
      },
      items,
    });
  })
);

const shipmentCreateSchema = z.object({
  userId: z.string().min(1),
  routeId: z.string().min(1),
  busTripId: z.string().optional(),
  trackingNumber: z.string().optional(),
  weightKg: z.number().positive(),
  cargoType: z.enum(["PARCEL", "CARGO", "FRAGILE", "DOCUMENTS"]),
  urgency: z.enum(["STANDARD", "EXPRESS", "URGENT"]),
  insurance: z.boolean(),
  recipientName: z.string().optional(),
  recipientPhone: z.string().optional(),
  shippedAt: z.string().datetime().optional(),
});

function tnNext() {
  return `AV${Math.floor(Math.random() * 90000000 + 10000000)}`;
}

adminRouter.post(
  "/shipments",
  validateBody(shipmentCreateSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const route = await prisma.route.findUnique({
      where: { id: req.body.routeId },
      include: { originCity: true },
    });
    if (!route) throw new AppError(404, "NOT_FOUND", "Маршрут не найден");

    const statusCreated = await prisma.shipmentStatus.findUnique({
      where: { code: "CREATED" },
    });
    if (!statusCreated) {
      throw new AppError(500, "INTERNAL_ERROR", "Нет статусов в справочнике");
    }

    const priceTotal = await priceForShipment({
      distanceKm: route.distanceKm,
      estimatedHours: route.estimatedHours,
      weightKg: req.body.weightKg,
      cargoType: req.body.cargoType,
      urgency: req.body.urgency,
      insurance: req.body.insurance,
      loadPercent: route.loadPercent,
    });

    const trackingNumber = (req.body.trackingNumber ?? tnNext()).toUpperCase();
    const shippedAt = req.body.shippedAt ? new Date(req.body.shippedAt) : new Date();
    const eta = new Date(
      shippedAt.getTime() + route.estimatedHours * 60 * 60 * 1000
    );

    const shipment = await prisma.shipment.create({
      data: {
        trackingNumber,
        userId: req.body.userId,
        routeId: route.id,
        busTripId: req.body.busTripId,
        currentStatusId: statusCreated.id,
        weightKg: req.body.weightKg,
        cargoType: req.body.cargoType,
        urgency: req.body.urgency,
        insurance: req.body.insurance,
        priceTotal,
        estimatedDeliveryAt: eta,
        shippedAt,
        recipientName: req.body.recipientName,
        recipientPhone: req.body.recipientPhone,
      },
    });

    await prisma.trackingHistory.create({
      data: {
        shipmentId: shipment.id,
        statusId: statusCreated.id,
        locationCity: route.originCity.name,
        note: "Отправление зарегистрировано",
      },
    });

    const payment = await prisma.payment.create({
      data: {
        shipmentId: shipment.id,
        amount: priceTotal,
        method: "ONLINE",
        status: "PAID",
      },
    });

    const user = await prisma.user.findUnique({ where: { id: shipment.userId } });
    if (user?.email) {
      await sendMailSafe({
        to: user.email,
        subject: `Avia Travel: отправление ${shipment.trackingNumber} принято`,
        text: `Ваше отправление зарегистрировано. Трек-номер: ${shipment.trackingNumber}. Отслеживайте статус в личном кабинете.`,
      }).catch(() => undefined);
    }

    await prisma.notification.create({
      data: {
        userId: shipment.userId,
        type: "SHIPMENT",
        title: "Отправление зарегистрировано",
        body: `Трек-номер ${shipment.trackingNumber}. Сумма: ${priceTotal} ₽`,
        payload: JSON.stringify({ shipmentId: shipment.id, paymentId: payment.id }),
      },
    });

    return ok(res, { shipment, payment }, 201);
  })
);

const shipmentPatchSchema = z.object({
  currentStatusCode: z.string().min(1),
  locationCity: z.string().optional(),
  note: z.string().optional(),
});

adminRouter.patch(
  "/shipments/:id",
  validateBody(shipmentPatchSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const status = await prisma.shipmentStatus.findUnique({
      where: { code: req.body.currentStatusCode },
    });
    if (!status) throw new AppError(404, "NOT_FOUND", "Статус не найден");

    const sid = String(req.params.id);

    const shipment = await prisma.shipment.update({
      where: { id: sid },
      data: { currentStatusId: status.id },
      select: {
        id: true,
        userId: true,
        trackingNumber: true,
        routeId: true,
      },
    });

    const rt = await prisma.route.findUnique({
      where: { id: shipment.routeId },
      include: { originCity: true },
    });

    await prisma.trackingHistory.create({
      data: {
        shipmentId: shipment.id,
        statusId: status.id,
        locationCity: req.body.locationCity ?? rt?.originCity?.name ?? undefined,
        note: req.body.note ?? `Статус: ${status.label}`,
      },
    });

    await prisma.notification.create({
      data: {
        userId: shipment.userId,
        type: "STATUS",
        title: "Обновление доставки",
        body: `${shipment.trackingNumber}: ${status.label}`,
        payload: JSON.stringify({ shipmentId: shipment.id, status: status.code }),
      },
    });

    return ok(res, { ok: true });
  })
);

adminRouter.get("/routes", asyncHandler(async (_req: AuthRequest, res) => {
  const items = await prisma.route.findMany({
    include: { originCity: true, destinationCity: true },
    orderBy: { popularity: "desc" },
  });
  return ok(res, { items });
}));

const routeCreateSchema = z.object({
  originCityId: z.string(),
  destinationCityId: z.string(),
  distanceKm: z.number().positive(),
  estimatedHours: z.number().positive(),
  basePricePerKg: z.number().positive().optional(),
  loadPercent: z.number().int().min(0).max(100).optional(),
  popularity: z.number().int().optional(),
});

adminRouter.post(
  "/routes",
  validateBody(routeCreateSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const r = await prisma.route.create({ data: req.body });
    return ok(res, { route: r }, 201);
  })
);

adminRouter.patch(
  "/routes/:id",
  validateBody(
    z.object({
      distanceKm: z.number().positive().optional(),
      estimatedHours: z.number().positive().optional(),
      basePricePerKg: z.number().positive().optional(),
      loadPercent: z.number().int().min(0).max(100).optional(),
      popularity: z.number().int().optional(),
      isActive: z.boolean().optional(),
    })
  ),
  asyncHandler(async (req: AuthRequest, res) => {
    const rid = String(req.params.id);
    const route = await prisma.route.update({
      where: { id: rid },
      data: req.body,
    });
    return ok(res, { route });
  })
);

adminRouter.get("/buses", asyncHandler(async (_req: AuthRequest, res) => {
  const items = await prisma.bus.findMany({ orderBy: { plateNumber: "asc" } });
  return ok(res, { items });
}));

const busSchema = z.object({
  plateNumber: z.string().min(3),
  model: z.string().optional(),
  capacityKg: z.number().int().positive().optional(),
});

adminRouter.post(
  "/buses",
  validateBody(busSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const bus = await prisma.bus.create({ data: req.body });
    return ok(res, { bus }, 201);
  })
);

adminRouter.get(
  "/bus-trips",
  asyncHandler(async (_req: AuthRequest, res) => {
    const items = await prisma.busTrip.findMany({
      orderBy: { scheduledDeparture: "desc" },
      take: 100,
      include: {
        bus: true,
        route: { include: { originCity: true, destinationCity: true } },
      },
    });
    return ok(res, { items });
  })
);

const tripSchema = z.object({
  busId: z.string(),
  routeId: z.string(),
  scheduledDeparture: z.string().datetime(),
  scheduledArrival: z.string().datetime().optional(),
});

adminRouter.post(
  "/bus-trips",
  validateBody(tripSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const trip = await prisma.busTrip.create({
      data: {
        busId: req.body.busId,
        routeId: req.body.routeId,
        scheduledDeparture: new Date(req.body.scheduledDeparture),
        scheduledArrival: req.body.scheduledArrival
          ? new Date(req.body.scheduledArrival)
          : null,
      },
    });
    return ok(res, { trip }, 201);
  })
);

adminRouter.get(
  "/reviews",
  validateQuery(paginationSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const { page, pageSize } = req.query as unknown as z.infer<
      typeof paginationSchema
    >;
    const skip = (page - 1) * pageSize;
    const [total, items] = await Promise.all([
      prisma.review.count(),
      prisma.review.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
    ]);
    return ok(res, {
      meta: {
        total,
        page,
        pageSize,
        pages: Math.max(1, Math.ceil(total / pageSize)),
      },
      items,
    });
  })
);

adminRouter.patch(
  "/reviews/:id",
  validateBody(z.object({ published: z.boolean() })),
  asyncHandler(async (req: AuthRequest, res) => {
    const pid = String(req.params.id);
    const rev = await prisma.review.update({
      where: { id: pid },
      data: { published: req.body.published },
    });
    return ok(res, { review: rev });
  })
);

adminRouter.get("/pricing-rules", asyncHandler(async (_req: AuthRequest, res) => {
  const rows = await prisma.pricingRule.findMany({ orderBy: { key: "asc" } });
  return ok(res, { items: rows });
}));

adminRouter.put(
  "/pricing-rules/:key",
  validateBody(z.object({ value: z.string().min(1) })),
  asyncHandler(async (req: AuthRequest, res) => {
    const pricingKey = String(req.params.key);
    const row = await prisma.pricingRule.upsert({
      where: { key: pricingKey },
      create: { key: pricingKey, value: req.body.value },
      update: { value: req.body.value },
    });
    return ok(res, { item: row });
  })
);

adminRouter.get("/cities", asyncHandler(async (_req: AuthRequest, res) => {
  const cities = await prisma.city.findMany({ orderBy: { name: "asc" } });
  return ok(res, { items: cities });
}));
