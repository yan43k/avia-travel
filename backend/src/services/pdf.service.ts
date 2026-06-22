import PDFDocument from "pdfkit";
import { prisma } from "../lib/prisma";
import { AppError } from "../utils/errors";
import { env } from "../config/env";

export async function buildPaymentReceiptPdf(paymentId: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      shipment: {
        include: {
          route: { include: { originCity: true, destinationCity: true } },
        },
      },
    },
  });
  if (!payment) {
    throw new AppError(404, "NOT_FOUND", "Платёж не найден");
  }

  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const chunks: Buffer[] = [];
  doc.on("data", (c) => chunks.push(c as Buffer));
  const done = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  doc.fontSize(20).text("Avia Travel", { align: "center" });
  doc.moveDown(0.5);
  doc.fontSize(12).text("Электронная квитанция об оплате", { align: "center" });
  doc.moveDown(2);

  doc.fontSize(11);
  doc.text(`Номер квитанции: ${payment.id}`);
  doc.text(`Дата: ${payment.createdAt.toISOString()}`);
  doc.text(`Трек-номер: ${payment.shipment.trackingNumber}`);
  doc.text(
    `Маршрут: ${payment.shipment.route.originCity.name} → ${payment.shipment.route.destinationCity.name}`
  );
  doc.text(`Сумма: ${payment.amount} ${payment.currency}`);
  doc.text(`Способ оплаты: ${payment.method}`);
  doc.text(`Статус: ${payment.status}`);
  doc.moveDown();
  doc.fontSize(9).fillColor("#666").text(env.API_PUBLIC_URL, { align: "left" });
  doc.end();

  return done;
}
