/**
 * ─────────────────────────────────────────────────────────────────
 * store/useCaveStore.ts
 *
 * Zustand global store for the Cave Diving 3D Map POC.
 *
 * State shape:
 *   viewMode      — controls which top-level component is rendered
 *   selectedCave  — metadata for the currently active cave site
 *
 * Actions:
 *   enterCave(cave)  — transition from EARTH → CAVE view
 *   resetToEarth()   — transition back from CAVE → EARTH view
 * ─────────────────────────────────────────────────────────────────
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";

// ── Types ─────────────────────────────────────────────────────────

/** The two top-level view modes of the application. */
export type ViewMode = "EARTH" | "CAVE";

/** Metadata for a cave dive site. */
export interface CaveSite {
  /** Human-readable display name. */
  name: string;
  /** WGS84 latitude (decimal degrees). */
  lat: number;
  /** WGS84 longitude (decimal degrees). */
  lng: number;
  /** Path to the GLTF model, relative to /public. */
  gltfPath: string;
  /** Short description for the HUD. */
  description: string;
  /** Approximate depth in meters. */
  depthM: number;
}

// ── Store interface ───────────────────────────────────────────────

interface CaveStore {
  /** Current top-level view. */
  viewMode: ViewMode;
  /** Currently selected cave site, or null on the Earth view. */
  selectedCave: CaveSite | null;

  /**
   * Transition to CAVE view with the given site data.
   * Called when the user clicks a marker on the globe.
   */
  enterCave: (cave: CaveSite) => void;

  /**
   * Return to the EARTH view and clear the selected cave.
   * Called by the "Back to Earth" button in the HUD.
   */
  resetToEarth: () => void;
}

// ── Store implementation ──────────────────────────────────────────

export const useCaveStore = create<CaveStore>()(
  devtools(
    (set) => ({
      viewMode: "EARTH",
      selectedCave: null,

      enterCave: (cave) =>
        set({ viewMode: "CAVE", selectedCave: cave }, false, "enterCave"),

      resetToEarth: () =>
        set({ viewMode: "EARTH", selectedCave: null }, false, "resetToEarth"),
    }),
    { name: "CaveStore" }
  )
);
