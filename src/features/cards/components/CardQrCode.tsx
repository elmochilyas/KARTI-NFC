"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/Button";
import {
  QR_DISPLAY_SIZE,
  QR_EXPORT_MARGIN_MODULES,
  QR_EXPORT_SIZE,
  QR_MARGIN_MODULES,
  qrDownloadFilename,
} from "@/features/cards/qr";

/**
 * Shared QR visual for a physical card (ADR: `qrcode` package).
 *
 * - Payload is ALWAYS the permanent URL (passed in, never derived here).
 * - Black on white, quiet-zone margins, error correction M: scan-first.
 * - Display ~240px; download is a fresh 1024px render (never an upscale).
 * - Fixed-size placeholder prevents layout shift before generation.
 */
export function CardQrCode({
  permanentUrl,
  cardNumber,
  shortCode,
}: {
  permanentUrl: string;
  cardNumber: string;
  shortCode: string;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(permanentUrl, {
      width: QR_DISPLAY_SIZE * 3,
      margin: QR_MARGIN_MODULES,
      errorCorrectionLevel: "M",
      color: { dark: "#111418", light: "#ffffff" },
    })
      .then((url) => {
        if (cancelled) return;
        setError(null);
        setDataUrl(url);
      })
      .catch(() => {
        if (cancelled) return;
        setDataUrl(null);
        setError("Could not generate the QR code.");
      });
    return () => {
      cancelled = true;
    };
  }, [permanentUrl]);

  async function download() {
    setDownloading(true);
    try {
      const png = await QRCode.toDataURL(permanentUrl, {
        width: QR_EXPORT_SIZE,
        margin: QR_EXPORT_MARGIN_MODULES,
        errorCorrectionLevel: "M",
        color: { dark: "#111418", light: "#ffffff" },
      });
      const link = document.createElement("a");
      link.href = png;
      link.download = qrDownloadFilename(cardNumber, shortCode);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <div
        role="img"
        aria-label={`QR code for ${cardNumber} permanent link`}
        className="overflow-hidden rounded-lg border border-border bg-white"
        style={{ width: QR_DISPLAY_SIZE, height: QR_DISPLAY_SIZE }}
      >
        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={dataUrl}
            alt=""
            width={QR_DISPLAY_SIZE}
            height={QR_DISPLAY_SIZE}
            className="block h-full w-full"
          />
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
      <p className="text-sm text-muted">{cardNumber}</p>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={download}
        disabled={downloading || !dataUrl}
      >
        {downloading ? "Preparing…" : "Download QR"}
      </Button>
    </div>
  );
}
