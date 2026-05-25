"use client";

import { useEffect, useRef, useState } from "react";

interface ScanResult {
  item_name: string;
  category: string;
  brand: string;
  low_price: number | null;
  high_price: number | null;
}

interface Props {
  onResult: (result: ScanResult) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onResult, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<"scanning" | "looking_up" | "error">("scanning");
  const [errorMsg, setErrorMsg] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [manualLoading, setManualLoading] = useState(false);
  const stoppedRef = useRef(false);

  useEffect(() => {
    let controls: { stop: () => void } | null = null;

    async function start() {
      try {
        const { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } =
          await import("@zxing/library");

        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.CODE_128,
          BarcodeFormat.CODE_39,
          BarcodeFormat.QR_CODE,
        ]);
        hints.set(DecodeHintType.TRY_HARDER, true);

        const reader = new BrowserMultiFormatReader(hints);

        if (!videoRef.current || stoppedRef.current) return;

        controls = await reader.decodeFromConstraints(
          { video: { facingMode: "environment" } },
          videoRef.current,
          async (result, err) => {
            if (!result || stoppedRef.current) return;
            if (err) return;

            stoppedRef.current = true;
            controls?.stop();
            await lookupBarcode(result.getText());
          }
        );
      } catch (err) {
        if (stoppedRef.current) return;
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.toLowerCase().includes("permission") || msg.toLowerCase().includes("denied") || msg.toLowerCase().includes("notallowed")) {
          setErrorMsg("Camera access denied — use manual entry below.");
        } else if (msg.toLowerCase().includes("notfound") || msg.toLowerCase().includes("no camera")) {
          setErrorMsg("No camera found — use manual entry below.");
        } else {
          setErrorMsg("Camera unavailable — use manual entry below.");
        }
        setStatus("error");
      }
    }

    void start();

    return () => {
      stoppedRef.current = true;
      controls?.stop();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function lookupBarcode(barcode: string) {
    setStatus("looking_up");
    try {
      const res = await fetch(`/api/upc/${encodeURIComponent(barcode)}`);
      const json = await res.json() as { data: ScanResult | null };
      if (json.data) {
        onResult(json.data);
      } else {
        onResult({ item_name: "", category: "Other", brand: "", low_price: null, high_price: null });
        setErrorMsg(`Barcode ${barcode} not found. Fill in details manually.`);
      }
    } catch {
      onResult({ item_name: "", category: "Other", brand: "", low_price: null, high_price: null });
      setErrorMsg("Lookup failed. Fill in details manually.");
    }
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = manualCode.trim();
    if (!code) return;
    setManualLoading(true);
    stoppedRef.current = true;
    await lookupBarcode(code);
    setManualLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#0f0f0f]">
        <span className="text-sm font-semibold text-[#f5f5f5]">
          {status === "looking_up" ? "Looking up item…" : "Scan or enter barcode"}
        </span>
        <button onClick={onClose} className="text-[#a3a3a3] hover:text-[#f5f5f5] p-2 rounded-lg text-sm">
          Cancel
        </button>
      </div>

      {/* Camera feed */}
      <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
          autoPlay
        />

        {/* Aiming overlay */}
        {status === "scanning" && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="absolute inset-0 bg-black/40" />
            <div className="relative w-72 h-32 z-10">
              <div className="absolute inset-0 rounded-xl border-2 border-[#22c55e]" />
              <div className="absolute top-0 left-0 w-6 h-6 border-t-[3px] border-l-[3px] border-[#22c55e] rounded-tl-xl" />
              <div className="absolute top-0 right-0 w-6 h-6 border-t-[3px] border-r-[3px] border-[#22c55e] rounded-tr-xl" />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-[3px] border-l-[3px] border-[#22c55e] rounded-bl-xl" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-[3px] border-r-[3px] border-[#22c55e] rounded-br-xl" />
              <div className="absolute left-2 right-2 top-1/2 h-0.5 bg-[#22c55e]/70 animate-pulse" />
            </div>
          </div>
        )}

        {/* Looking up spinner */}
        {status === "looking_up" && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
            <div className="text-center">
              <div className="w-10 h-10 border-2 border-[#22c55e] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-[#f5f5f5] text-sm">Looking up product…</p>
            </div>
          </div>
        )}

        {/* Error state — camera failed, show manual entry prominently */}
        {status === "error" && (
          <div className="absolute inset-0 bg-[#0f0f0f] flex items-center justify-center px-6">
            <div className="w-full max-w-xs text-center">
              <p className="text-3xl mb-2">📷</p>
              <p className="text-[#a3a3a3] text-sm mb-5">{errorMsg}</p>
            </div>
          </div>
        )}
      </div>

      {/* Manual entry — always visible at the bottom */}
      {status !== "looking_up" && (
        <div className="bg-[#0f0f0f] border-t border-[#1a1a1a] px-4 py-4">
          <p className="text-xs text-[#525252] mb-2 text-center">Or type the barcode number</p>
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={e => setManualCode(e.target.value)}
              placeholder="e.g. 012345678905"
              inputMode="numeric"
              className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] text-[#f5f5f5] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#22c55e] placeholder:text-[#525252]"
            />
            <button
              type="submit"
              disabled={!manualCode.trim() || manualLoading}
              className="bg-[#22c55e] disabled:bg-[#2a2a2a] disabled:text-[#525252] text-[#0f0f0f] font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors"
            >
              {manualLoading ? "…" : "Look up"}
            </button>
          </form>
          {status === "scanning" && (
            <p className="text-xs text-[#525252] mt-2 text-center">
              Supports UPC, EAN, Code 128 &amp; QR
            </p>
          )}
        </div>
      )}
    </div>
  );
}
