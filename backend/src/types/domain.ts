/** Значения, проверяемые Zod/бизнес-логикой (SQLite хранит как TEXT). */

export type UserRole = "USER" | "ADMIN";

export type CargoType = "PARCEL" | "CARGO" | "FRAGILE" | "DOCUMENTS";

export type Urgency = "STANDARD" | "EXPRESS" | "URGENT";

export type PaymentMethod = "CASH" | "CARD" | "ONLINE";

export type PaymentStatus = "PENDING" | "PAID" | "REFUNDED";
