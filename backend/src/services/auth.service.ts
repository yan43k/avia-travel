import { prisma } from "../lib/prisma";
import { AppError } from "../utils/errors";
import { hashPassword, verifyPassword } from "./password";
import { generateRefreshToken, hashToken } from "./cryptoTokens";
import { signAccessToken } from "./tokens";
import { env } from "../config/env";
import type { UserRole } from "../types/domain";

function userResponse(user: {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  role: string;
}) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    role: user.role as UserRole,
  };
}

export async function registerUser(input: {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}) {
  const exists = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
  });
  if (exists) {
    throw new AppError(409, "CONFLICT", "Пользователь с таким email уже зарегистрирован");
  }
  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      email: input.email.toLowerCase(),
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      role: "USER",
    },
  });
  return userResponse(user);
}

export async function loginUser(input: { email: string; password: string }) {
  const user = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
  });
  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    throw new AppError(401, "UNAUTHORIZED", "Неверный email или пароль");
  }

  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  const refreshRaw = generateRefreshToken();
  const tokenHash = hashToken(refreshRaw);
  const expiresAt = new Date(
    Date.now() + env.REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000
  );

  await prisma.refreshSession.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });

  return {
    accessToken,
    refreshToken: refreshRaw,
    user: userResponse(user),
  };
}

export async function rotateRefresh(rawRefresh: string) {
  const tokenHash = hashToken(rawRefresh);
  const session = await prisma.refreshSession.findFirst({
    where: {
      tokenHash,
      expiresAt: { gt: new Date() },
    },
    include: { user: true },
  });
  if (!session) {
    throw new AppError(401, "UNAUTHORIZED", "Сессия недействительна");
  }

  await prisma.refreshSession.deleteMany({ where: { id: session.id } });

  const accessToken = signAccessToken({
    sub: session.user.id,
    role: session.user.role,
  });

  const newRefresh = generateRefreshToken();
  await prisma.refreshSession.create({
    data: {
      userId: session.user.id,
      tokenHash: hashToken(newRefresh),
      expiresAt: new Date(
        Date.now() + env.REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000
      ),
    },
  });

  return { accessToken, refreshToken: newRefresh };
}

export async function logoutUser(rawRefresh: string | undefined) {
  if (!rawRefresh) return;
  await prisma.refreshSession.deleteMany({
    where: { tokenHash: hashToken(rawRefresh) },
  });
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new AppError(404, "NOT_FOUND", "Пользователь не найден");
  }
  return userResponse(user);
}
