import QRCode from "qrcode";

export async function shipmentQrPayload(trackingNumber: string, publicApiBase: string) {
  const url = `${publicApiBase}/track?t=${encodeURIComponent(trackingNumber)}`;
  return QRCode.toBuffer(url, {
    type: "png",
    margin: 1,
    scale: 6,
    errorCorrectionLevel: "M",
  });
}
