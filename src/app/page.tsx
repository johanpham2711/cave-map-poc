/**
 * ─────────────────────────────────────────────────────────────────
 * app/page.tsx
 *
 * Root page — orchestrates the two major 3D views.
 *
 * Layout:
 *   • Full-screen container (relative position)
 *   • OverlayUI — always mounted, absolute position top-left
 *   • EarthMap  — mounted when viewMode === 'EARTH'
 *                 (dynamic import with ssr:false for Cesium compat)
 *   • CaveMap   — mounted ONLY when viewMode === 'CAVE'
 *
 * Transitions between modes are driven by the Zustand store.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import { useCaveStore } from "@/store/useCaveStore";
import OverlayUI from "@/components/OverlayUI";

// ── Dynamic imports ───────────────────────────────────────────────

/**
 * EarthMap uses CesiumJS which relies on browser globals (window, document).
 * It must be dynamically imported with ssr: false.
 */
const EarthMap = dynamic(() => import("@/components/EarthMap"), {
  ssr: false,
  loading: () => <LoadingScreen label="Initialising Globe…" />,
});

/**
 * CaveMap uses WebGL directly and also benefits from client-only loading.
 */
const CaveMap = dynamic(() => import("@/components/CaveMap"), {
  ssr: false,
  loading: () => <LoadingScreen label="Loading Cave…" />,
});

// ── Loading placeholder ───────────────────────────────────────────

function LoadingScreen({ label }: { label: string }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-abyss-950">
      {/* Animated pulsing rings */}
      <div className="relative flex items-center justify-center mb-8">
        <div
          className="absolute w-24 h-24 rounded-full border border-biolum-500 opacity-20 animate-ping"
          style={{ animationDuration: "2s" }}
        />
        <div
          className="absolute w-16 h-16 rounded-full border border-biolum-400 opacity-40 animate-ping"
          style={{ animationDuration: "1.5s" }}
        />
        {/* Core logo dot */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, #22D3EE 0%, #0891B2 100%)",
            boxShadow: "0 0 32px rgba(34,211,238,0.4)",
          }}
        >
          <span className="text-white text-sm font-bold">CM</span>
        </div>
      </div>

      {/* Label */}
      <p className="text-biolum-400 font-mono text-sm tracking-widest uppercase">
        {label}
      </p>
      <p className="text-slate-600 text-xs mt-2">CaveMap POC</p>

      {/* Progress dots */}
      <div className="flex gap-1.5 mt-6">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-biolum-600 animate-pulse-slow"
            style={{ animationDelay: `${i * 0.3}s` }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────

export default function HomePage() {
  const viewMode = useCaveStore((s) => s.viewMode);
  const isEarth = viewMode === "EARTH";
  const isCave = viewMode === "CAVE";

  return (
    /*
     * Full-screen relative container.
     * Both the canvas layers and the overlay UI are positioned within this.
     */
    <main
      className="relative w-screen h-screen overflow-hidden bg-abyss-950"
      aria-label="CaveMap 3D Diving Platform"
    >
      {/* ── Earth Globe ── */}
      {/*
        We always keep the EarthMap in the DOM but hide it when in CAVE mode.
        This avoids re-initialising CesiumJS on every mode switch.
        Visibility is controlled via CSS so React keeps the component mounted.
      */}
      <div
        className="absolute inset-0"
        style={{
          opacity: isEarth ? 1 : 0,
          pointerEvents: isEarth ? "auto" : "none",
          transition: "opacity 0.5s ease-in-out",
          zIndex: isEarth ? 1 : 0,
        }}
      >
        <EarthMap />
      </div>

      {/* ── Cave Viewer ── */}
      {/*
        CaveMap is conditionally mounted (not just hidden) because:
        1. We want state (placed nodes) to reset when leaving a cave.
        2. R3F / Three.js context is cheap to reinitialise.
      */}
      {isCave && (
        <div
          className="absolute inset-0 animate-fade-in"
          style={{ zIndex: 2 }}
        >
          <CaveMap />
        </div>
      )}

      {/* ── Overlay HUD — always on top ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 50 }}
      >
        {/* Re-enable pointer events only on the panel itself, not the whole overlay div */}
        <div className="pointer-events-auto">
          <OverlayUI />
        </div>
      </div>

      {/* ── Mode transition indicator (bottom centre) ── */}
      <div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none"
        style={{ zIndex: 50 }}
      >
        <div className="glass px-4 py-2 flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isEarth ? "bg-biolum-400" : "bg-coral-400"
            } animate-pulse-slow`}
          />
          <p className="text-slate-400 font-mono text-xs uppercase tracking-widest">
            {isEarth ? "Globe View — Select a Dive Site" : "Cave Viewer — Click Model to Survey"}
          </p>
        </div>
      </div>
    </main>
  );
}
