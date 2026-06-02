/**
 * ─────────────────────────────────────────────────────────────────
 * components/OverlayUI.tsx
 *
 * Floating HUD panel that sits on top of whichever 3D canvas
 * is currently active.
 *
 * Displays:
 *  - App branding / title
 *  - Current view mode badge
 *  - Selected cave name & metadata (CAVE mode)
 *  - "Back to Earth" button (CAVE mode only)
 *  - Keyboard shortcut hint
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import React, { useEffect, useCallback } from "react";
import { useCaveStore } from "@/store/useCaveStore";

// ── Icons (inline SVG for zero-dependency) ────────────────────────

const GlobeIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const CaveIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 20 Q6 8 12 10 Q18 12 21 20" />
    <path d="M7 20 Q9 14 12 15 Q15 16 17 20" />
    <line x1="12" y1="4" x2="12" y2="8" />
    <line x1="8" y1="5" x2="9" y2="9" />
    <line x1="16" y1="5" x2="15" y2="9" />
  </svg>
);

const ArrowLeftIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

// ── Component ─────────────────────────────────────────────────────

export default function OverlayUI() {
  const viewMode = useCaveStore((s) => s.viewMode);
  const selectedCave = useCaveStore((s) => s.selectedCave);
  const resetToEarth = useCaveStore((s) => s.resetToEarth);

  // Allow "Escape" key to return to Earth view
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && viewMode === "CAVE") {
        resetToEarth();
      }
    },
    [viewMode, resetToEarth]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const isCaveMode = viewMode === "CAVE";

  return (
    <div className="absolute top-6 left-6 z-50 animate-slide-up" style={{ maxWidth: 280 }}>
      {/* ── Main panel ── */}
      <div className="glass glow-cyan scanline p-5 space-y-4">
        {/* Branding */}
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, #22D3EE 0%, #0891B2 100%)",
            }}
          >
            <span className="text-white text-xs font-bold">CM</span>
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-none">CaveMap POC</p>
            <p className="text-slate-400 text-xs mt-0.5">3D Diving Platform</p>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-white/10" />

        {/* Mode badge */}
        <div className="flex items-center justify-between">
          <span className="text-slate-400 text-xs uppercase tracking-widest">Mode</span>
          <span className={`mode-badge ${isCaveMode ? "cave" : "earth"}`}>
            {isCaveMode ? <CaveIcon /> : <GlobeIcon />}
            {isCaveMode ? "Cave View" : "Earth View"}
          </span>
        </div>

        {/* Cave metadata — visible only in CAVE mode */}
        {isCaveMode && selectedCave && (
          <div className="space-y-2 animate-fade-in">
            <div className="border-t border-white/10" />

            {/* Cave name */}
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">Active Site</p>
              <p className="text-white font-semibold text-sm">{selectedCave.name}</p>
            </div>

            {/* Location */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/5 rounded-lg px-3 py-2">
                <p className="text-slate-500 text-xs">Lat</p>
                <p className="text-biolum-400 font-mono text-xs font-medium">
                  {selectedCave.lat.toFixed(4)}°
                </p>
              </div>
              <div className="bg-white/5 rounded-lg px-3 py-2">
                <p className="text-slate-500 text-xs">Lng</p>
                <p className="text-biolum-400 font-mono text-xs font-medium">
                  {selectedCave.lng.toFixed(4)}°
                </p>
              </div>
            </div>

            {/* Depth */}
            <div className="bg-white/5 rounded-lg px-3 py-2 flex items-center justify-between">
              <p className="text-slate-500 text-xs">Max Depth</p>
              <p className="text-coral-400 font-mono text-xs font-semibold">
                {selectedCave.depthM}m
              </p>
            </div>

            {/* Description */}
            <p className="text-slate-400 text-xs leading-relaxed">{selectedCave.description}</p>
          </div>
        )}

        {/* Hint text for Earth mode */}
        {!isCaveMode && (
          <p className="text-slate-500 text-xs leading-relaxed animate-fade-in">
            Click any marker on the globe to enter a cave dive site.
          </p>
        )}

        {/* ── Back to Earth button — only in CAVE mode ── */}
        {isCaveMode && (
          <button
            onClick={resetToEarth}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 animate-slide-up"
            style={{
              background:
                "linear-gradient(135deg, rgba(34,211,238,0.15) 0%, rgba(8,145,178,0.15) 100%)",
              border: "1px solid rgba(34,211,238,0.3)",
              color: "#22D3EE",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "linear-gradient(135deg, rgba(34,211,238,0.25) 0%, rgba(8,145,178,0.25) 100%)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                "0 0 16px rgba(34,211,238,0.2)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "linear-gradient(135deg, rgba(34,211,238,0.15) 0%, rgba(8,145,178,0.15) 100%)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
            }}
          >
            <ArrowLeftIcon />
            Back to Earth
          </button>
        )}
      </div>

      {/* Keyboard shortcut hint */}
      {isCaveMode && (
        <p className="text-center text-slate-600 text-xs mt-2 animate-fade-in">
          Press{" "}
          <kbd className="px-1 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-slate-400">
            Esc
          </kbd>{" "}
          to return
        </p>
      )}
    </div>
  );
}
