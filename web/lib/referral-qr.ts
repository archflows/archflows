import QRCode from "qrcode";

export async function referralQrDataUrl(link: string) {
  return QRCode.toDataURL(link, {
    margin: 0,
    width: 512,
    errorCorrectionLevel: "M",
    color: {
      dark: "#08090c",
      light: "#ffffff",
    },
  });
}
