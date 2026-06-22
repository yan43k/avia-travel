import nodemailer from "nodemailer";
import { env } from "../config/env";
import { logger } from "../lib/logger";

const transporter =
  env.SMTP_HOST && env.SMTP_PORT
    ? nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth:
          env.SMTP_USER && env.SMTP_PASS
            ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
            : undefined,
      })
    : null;

export async function sendMailSafe(options: {
  to: string;
  subject: string;
  text: string;
}) {
  if (!transporter) {
    logger.info({ mail: options }, "Email (SMTP не настроен, вывод в лог)");
    return;
  }
  await transporter.sendMail({
    from: env.SMTP_FROM ?? "Avia Travel <no-reply@avia-travel.local>",
    to: options.to,
    subject: options.subject,
    text: options.text,
  });
}
