"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function QrCode({ value, size = 180 }: { value: string; size?: number }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let canceled = false;

    void QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      errorCorrectionLevel: "M",
    })
      .then((url) => {
        if (!canceled) setDataUrl(url);
      })
      .catch(() => {
        if (!canceled) setDataUrl(null);
      });

    return () => {
      canceled = true;
    };
  }, [value, size]);

  if (!dataUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="data:image/gif;base64,R0lGODlhAQABAAAAACwAAAAAAQABAAA="
        alt="QR code"
        width={size}
        height={size}
        className="animate-pulse rounded-md bg-black/5"
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={dataUrl}
      alt="QR code"
      width={size}
      height={size}
      className="rounded-md border border-border bg-white"
    />
  );
}
