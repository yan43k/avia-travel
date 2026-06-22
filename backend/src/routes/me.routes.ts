import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validateBody";
import { prisma } from "../lib/prisma";
import { ok } from "../utils/http";
import { AppError } from "../utils/errors";
import type { AuthRequest } from "../types/express";
import { getUserById } from "../services/auth.service";
import { shipmentQrPayload } from "../services/qr.service";
import { buildPaymentReceiptPdf } from "../services/pdf.service";
import { env } from "../config/env";
import { sendMailSafe } from "../services/email.service";

export const meRouter = Router();

meRouter.use(requireAuth);

meRouter.get(
  "/me",
  asyncHandler(async (req: AuthRequest, res) => {
    const user = await getUserById(req.user!.id);
    return ok(res, { user });
  })
);

const profileSchema = z.object({
  firstName: z.string().min(1).max(80).optional(),
  lastName: z.string().min(1).max(80).optional(),
  phone: z.string().min(5).max(32).optional(),
});

meRouter.put(
  "/me",
  validateBody(profileSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const user = await prisma.user.update({
      where: { id: req.user!.id },
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

meRouter.get(
  "/me/shipments",
  asyncHandler(async (req: AuthRequest, res) => {
    const items = await prisma.shipment.findMany({
      where: { userId: req.user!.id },
      orderBy: { shippedAt: "desc" },
      include: {
        route: { include: { originCity: true, destinationCity: true } },
        currentStatus: true,
        payments: true,
      },
    });
    return ok(res, { items });
  })
);

meRouter.get(
  "/me/notifications",
  asyncHandler(async (req: AuthRequest, res) => {
    const items = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return ok(res, { items });
  })
);

meRouter.patch(
  "/me/notifications/read-all",
  asyncHandler(async (req: AuthRequest, res) => {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, read: false },
      data: { read: true },
    });
    return ok(res, { ok: true });
  })
);

meRouter.patch(
  "/me/notifications/:id/read",
  asyncHandler(async (req: AuthRequest, res) => {
    const n = await prisma.notification.updateMany({
      where: { id: String(req.params.id), userId: req.user!.id },
      data: { read: true },
    });
    if (n.count === 0) throw new AppError(404, "NOT_FOUND", "Уведомление не найдено");
    return ok(res, { ok: true });
  })
);

const savedRouteSchema = z.object({
  routeId: z.string().min(1),
  label: z.string().max(80).optional(),
});

meRouter.get(
  "/me/saved-routes",
  asyncHandler(async (req: AuthRequest, res) => {
    const rows = await prisma.savedRoute.findMany({
      where: { userId: req.user!.id },
      include: {
        route: { include: { originCity: true, destinationCity: true } },
      },
    });
    return ok(res, { items: rows });
  })
);

meRouter.post(
  "/me/saved-routes",
  validateBody(savedRouteSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    await prisma.savedRoute.upsert({
      where: {
        userId_routeId: { userId: req.user!.id, routeId: req.body.routeId },
      },
      create: {
        userId: req.user!.id,
        routeId: req.body.routeId,
        label: req.body.label,
      },
      update: { label: req.body.label },
    });
    return ok(res, { ok: true }, 201);
  })
);

meRouter.delete(
  "/me/saved-routes/:routeId",
  asyncHandler(async (req: AuthRequest, res) => {
    await prisma.savedRoute.deleteMany({
      where: { userId: req.user!.id, routeId: String(req.params.routeId) },
    });
    return ok(res, { ok: true });
  })
);

const addrSchema = z.object({
  label: z.string().min(1).max(80),
  city: z.string().min(1).max(120),
  addressLine: z.string().max(200).optional(),
  postalCode: z.string().max(20).optional(),
});

meRouter.get(
  "/me/favorite-addresses",
  asyncHandler(async (req: AuthRequest, res) => {
    const items = await prisma.favoriteAddress.findMany({
      where: { userId: req.user!.id },
      orderBy: { label: "asc" },
    });
    return ok(res, { items });
  })
);

meRouter.post(
  "/me/favorite-addresses",
  validateBody(addrSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const row = await prisma.favoriteAddress.create({
      data: { userId: req.user!.id, ...req.body },
    });
    return ok(res, { item: row }, 201);
  })
);

meRouter.delete(
  "/me/favorite-addresses/:id",
  asyncHandler(async (req: AuthRequest, res) => {
    await prisma.favoriteAddress.deleteMany({
      where: { id: String(req.params.id), userId: req.user!.id },
    });
    return ok(res, { ok: true });
  })
);

meRouter.get(
  "/me/shipments/:id/qr.png",
  asyncHandler(async (req: AuthRequest, res) => {
    const shipment = await prisma.shipment.findFirst({
      where: { id: String(req.params.id), userId: req.user!.id },
    });
    if (!shipment) throw new AppError(404, "NOT_FOUND", "Отправление не найдено");
    const png = await shipmentQrPayload(shipment.trackingNumber, env.FRONTEND_URL);
    res.setHeader("Content-Type", "image/png");
    return res.send(png);
  })
);

meRouter.get(
  "/me/payments/:id/receipt.pdf",
  asyncHandler(async (req: AuthRequest, res) => {
    const payment = await prisma.payment.findFirst({
      where: { id: String(req.params.id), shipment: { userId: req.user!.id } },
    });
    if (!payment) throw new AppError(404, "NOT_FOUND", "Квитанция недоступна");
    const pdf = await buildPaymentReceiptPdf(payment.id);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="receipt-${payment.id}.pdf"`
    );
    return res.send(pdf);
  })
);

const reviewSubmitSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(600).optional(),
});

meRouter.post(
  "/me/shipments/:id/reviews",
  validateBody(reviewSubmitSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const shipment = await prisma.shipment.findFirst({
      where: { id: String(req.params.id), userId: req.user!.id },
      include: { currentStatus: true },
    });
    if (!shipment) throw new AppError(404, "NOT_FOUND", "Отправление не найдено");

    if (shipment.currentStatus.code !== "DELIVERED") {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "Отзыв можно оставить после выдачи отправления получателю."
      );
    }

    const dup = await prisma.review.findFirst({
      where: { userId: req.user!.id, shipmentId: shipment.id },
    });
    if (dup) {
      throw new AppError(409, "CONFLICT", "По этому отправлению отзыв уже отправлен на модерацию.");
    }

    const u = await prisma.user.findUnique({ where: { id: req.user!.id } });
    const name = `${u?.firstName ?? "Клиент"} ${u?.lastName ?? ""}`.trim();

    const review = await prisma.review.create({
      data: {
        userId: req.user!.id,
        shipmentId: shipment.id,
        authorName: name.length > 0 ? name : "Клиент Avia Travel",
        rating: req.body.rating,
        comment: req.body.comment,
        published: false,
      },
    });

    await sendMailSafe({
      to: "operators@avia-travel.local",
      subject: `Новый отзыв по отправлению ${shipment.trackingNumber}`,
      text: `Пользователь оставил отзыв. Откройте панель администрирования.`,
    }).catch(() => undefined);

    return ok(res, { review }, 201);
  })
);
