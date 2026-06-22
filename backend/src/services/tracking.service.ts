import { prisma } from "../lib/prisma";
import { AppError } from "../utils/errors";

export async function getTracking(trackingNumber: string) {
  const tn = trackingNumber.trim().toUpperCase();
  const shipment = await prisma.shipment.findUnique({
    where: { trackingNumber: tn },
    include: {
      route: { include: { originCity: true, destinationCity: true } },
      currentStatus: true,
      busTrip: { include: { bus: true } },
      tracking: {
        orderBy: { createdAt: "asc" },
        include: { status: true },
      },
    },
  });
  if (!shipment) {
    throw new AppError(404, "NOT_FOUND", "Отправление не найдено по указанному номеру");
  }

  return {
    trackingNumber: shipment.trackingNumber,
    status: {
      code: shipment.currentStatus.code,
      label: shipment.currentStatus.label,
    },
    origin: shipment.route.originCity.name,
    destination: shipment.route.destinationCity.name,
    location:
      shipment.tracking[shipment.tracking.length - 1]?.locationCity ??
      shipment.route.originCity.name,
    shippedAt: shipment.shippedAt,
    estimatedDeliveryAt: shipment.estimatedDeliveryAt,
    weightKg: shipment.weightKg,
    cargoType: shipment.cargoType,
    bus: shipment.busTrip
      ? { plate: shipment.busTrip.bus.plateNumber, model: shipment.busTrip.bus.model }
      : null,
    history: shipment.tracking.map((h) => ({
      at: h.createdAt,
      location: h.locationCity,
      status: h.status ? { code: h.status.code, label: h.status.label } : null,
      note: h.note,
    })),
  };
}
