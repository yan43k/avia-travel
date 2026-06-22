import { prisma } from "../lib/prisma";
import type { CargoType, Urgency } from "../types/domain";

const DEFAULTS = {
  insuranceRate: 0.05,
  fragileExtra: 0.15,
  expressMult: 1.35,
  urgentMult: 1.75,
};

async function multiplierForUrgency(u: Urgency) {
  if (u === "STANDARD") return 1;
  if (u === "EXPRESS") return DEFAULTS.expressMult;
  return DEFAULTS.urgentMult;
}

export function cargoRiskFactor(type: CargoType) {
  if (type === "FRAGILE") return DEFAULTS.fragileExtra;
  if (type === "CARGO") return 0.08;
  if (type === "DOCUMENTS") return 0;
  return 0;
}

export async function getNumericRule(key: string, fallback: number) {
  const row = await prisma.pricingRule.findUnique({ where: { key } });
  if (!row) return fallback;
  const v = Number(row.value);
  return Number.isFinite(v) ? v : fallback;
}

export async function priceForShipment(args: {
  distanceKm: number;
  estimatedHours: number;
  weightKg: number;
  cargoType: CargoType;
  urgency: Urgency;
  insurance: boolean;
  loadPercent: number;
}) {
  const basePerKg = await getNumericRule("base_price_per_kg", 120);
  const kmFactor = await getNumericRule("distance_factor_per_km", 1.35);

  const weightComponent = Math.max(1, args.weightKg) * basePerKg;
  const distanceComponent = args.distanceKm * kmFactor;
  let total = weightComponent + distanceComponent;

  const urgencyMul = await multiplierForUrgency(args.urgency);
  total *= urgencyMul;

  total *= 1 + cargoRiskFactor(args.cargoType);

  if (args.insurance) {
    total *= 1 + DEFAULTS.insuranceRate;
  }

  const loadPenalty = 1 + args.loadPercent / 500;
  total *= loadPenalty;

  return Math.round(total);
}
