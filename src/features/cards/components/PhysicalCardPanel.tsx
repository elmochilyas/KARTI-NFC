import { ExternalLink } from "lucide-react";
import { CardQrCode } from "./CardQrCode";
import { CopyButton } from "./CopyButton";
import { WriteToNfc } from "@/features/nfc/components/WriteToNfc";

/**
 * Single shared physical-card block: permanent URL + Copy/Test + QR + NFC.
 * Used by the client NFC section, the configure-success state, and the
 * advanced card detail so all three stay identical.
 */
export function PhysicalCardPanel({
  permanentUrl,
  cardNumber,
  shortCode,
  nfcLabel = "Write to NFC",
  compact = false,
}: {
  permanentUrl: string;
  cardNumber: string;
  shortCode: string;
  nfcLabel?: string;
  compact?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="break-all font-mono text-sm text-text">{permanentUrl}</p>
        <p className="mt-1 text-sm text-muted">
          This URL lives on the physical card and never changes.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <CopyButton value={permanentUrl} label="Copy URL" />
          <a
            href={permanentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md bg-surface-muted px-3 text-sm font-medium text-text hover:bg-border"
          >
            <ExternalLink aria-hidden="true" className="h-4 w-4" />
            Test Link
          </a>
        </div>
      </div>
      <div className={compact ? undefined : "grid gap-4 sm:grid-cols-2"}>
        <div>
          <h3 className="text-sm font-semibold text-text">QR Code</h3>
          <p className="mt-0.5 text-sm text-muted">
            Same permanent URL as NFC — stays valid when the destination changes.
          </p>
          <div className="mt-3">
            <CardQrCode permanentUrl={permanentUrl} cardNumber={cardNumber} shortCode={shortCode} />
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-text">Physical NFC</h3>
          <p className="mt-0.5 text-sm text-muted">
            Writes the same permanent URL. Destination changes never need a rewrite.
          </p>
          <div className="mt-3">
            <WriteToNfc permanentUrl={permanentUrl} label={nfcLabel} />
          </div>
        </div>
      </div>
    </div>
  );
}
