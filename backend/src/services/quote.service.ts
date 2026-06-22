import { prisma } from "../lib/prisma";
import type { CargoType, Urgency } from "../types/domain";
import { AppError } from "../utils/errors";
import { cargoRiskFactor, priceForShipment } from "./pricing.service";

function seasonalModifier(monthIndex: number) {
  const coldMonths = new Set([0, 1, 10, 11]);
  return coldMonths.has(monthIndex) ? 8 : 3;
}

function weatherImpact(monthIndex: number) {
  if (seasonalModifier(monthIndex) >= 8) {
    return { score: -6, hint: "Повышенная вероятность метеоограничений на трассах" };
  }
  return { score: -2, hint: "Погодные условия в норме для сезона" };
}

export async function findRouteByCityNames(origin: string, destination: string) {
  const o = origin.trim();
  const d = destination.trim();
  if (!o || !d || o === d) {
    throw new AppError(400, "VALIDATION_ERROR", "Укажите разные города отправления и назначения");
  }

  const route = await prisma.route.findFirst({
    where: {
      isActive: true,
      originCity: { name: o },
      destinationCity: { name: d },
    },
    include: { originCity: true, destinationCity: true },
  });

  if (!route) {
    throw new AppError(
      404,
      "NOT_FOUND",
      "Маршрут не найден. Проверьте название города или обратитесь к менеджеру."
    );
  }

  return route;
}

export async function buildQuote(input: {
  origin: string;
  destination: string;
  weightKg: number;
  cargoType: CargoType;
  urgency: Urgency;
  insurance: boolean;
}) {
  const route = await findRouteByCityNames(input.origin, input.destination);
  const now = new Date();

  const baseArgs = {
    distanceKm: route.distanceKm,
    estimatedHours: route.estimatedHours,
    weightKg: input.weightKg,
    cargoType: input.cargoType,
    insurance: input.insurance,
    loadPercent: route.loadPercent,
  };

  const price = await priceForShipment({
    ...baseArgs,
    urgency: input.urgency,
  });

  const etaHours =
    route.estimatedHours *
    (input.urgency === "URGENT" ? 0.85 : input.urgency === "EXPRESS" ? 0.92 : 1);

  const weather = weatherImpact(now.getMonth());
  const delayProbability = Math.min(
    94,
    Math.max(
      2,
      Math.round(route.loadPercent * 0.45 + seasonalModifier(now.getMonth()) + Math.abs(weather.score))
    )
  );

  const profiles = await Promise.all(
    (
      [
        {
          code: "fastest",
          title: "Самый быстрый",
          urgency: "URGENT" as Urgency,
          insurance: input.insurance,
          etaFactor: 0.82,
        },
        {
          code: "cheapest",
          title: "Самый экономичный",
          urgency: "STANDARD" as Urgency,
          insurance: false,
          etaFactor: 1,
        },
        {
          code: "balanced",
          title: "Оптимальный",
          urgency: "EXPRESS" as Urgency,
          insurance: input.insurance,
          etaFactor: 0.93,
        },
      ] as const
    ).map(async (p) => {
      const profilePrice = await priceForShipment({
        ...baseArgs,
        urgency: p.urgency,
        insurance: p.insurance,
      });
      return {
        code: p.code,
        title: p.title,
        price: profilePrice,
        etaHours: Math.round(route.estimatedHours * p.etaFactor * 10) / 10,
        urgency: p.urgency,
        insuranceIncluded: p.insurance,
      };
    })
  );

  return {
    routeId: route.id,
    origin: route.originCity.name,
    destination: route.destinationCity.name,
    distanceKm: route.distanceKm,
    estimatedHoursTotal: Math.round(etaHours * 10) / 10,
    currency: "RUB",
    price,
    etaText: `${Math.ceil(etaHours)} ч.`,
    cargoRiskNote:
      cargoRiskFactor(input.cargoType) > 0
        ? "Учтён повышенный режим перевозки по типу груза."
        : null,
    smartForecast: {
      delayProbabilityPercent: delayProbability,
      routeLoadPercent: route.loadPercent,
      weatherImpact: weather.hint,
    },
    profiles,
  };
}
