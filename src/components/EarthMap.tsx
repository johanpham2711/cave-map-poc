/**
 * ─────────────────────────────────────────────────────────────────
 * components/EarthMap.tsx
 *
 * Full-screen 3D globe rendered via Resium (CesiumJS wrapper).
 *
 * Features:
 *  • Cesium Ion token stub — replace with your own token
 *  • 3 cave dive site markers (Point + Label)
 *  • Click handler → transitions app to CAVE view via Zustand
 *  • Subtle atmosphere and depth-of-field styling
 *
 * NOTE: This component must be dynamically imported with ssr:false
 * from page.tsx because CesiumJS is not SSR-compatible.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

// ── REQUIRED: Cesium widget styles (sizing, fonts, cursors) ──────
// Without this import the Cesium canvas has no defined dimensions
// and will appear as a tiny box in the top-left corner.
import "cesium/Build/Cesium/Widgets/widgets.css";

import React, { useCallback } from "react";
import {
  Viewer,
  Entity,
  PointGraphics,
  LabelGraphics,
  CameraFlyTo,
} from "resium";
import {
  Ion,
  Cartesian3,
  Color,
  LabelStyle,
  VerticalOrigin,
  HorizontalOrigin,
  Cartesian2,
  type Entity as CesiumEntityType,
} from "cesium";
import { useCaveStore, type CaveSite } from "@/store/useCaveStore";

// ── Cesium Ion Token ──────────────────────────────────────────────
// Set NEXT_PUBLIC_CESIUM_ION_TOKEN in .env.local (gitignored).
// See .env.example for the template.
const CESIUM_TOKEN = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN;

if (!CESIUM_TOKEN) {
  throw new Error(
    "[EarthMap] Missing env var: NEXT_PUBLIC_CESIUM_ION_TOKEN\n" +
      "Copy .env.example → .env.local and set your token from https://cesium.com/ion/tokens"
  );
}

Ion.defaultAccessToken = CESIUM_TOKEN;

// ── Mock cave site data ───────────────────────────────────────────

const CAVE_SITES: CaveSite[] = [
  {
    name: "Cenote El Pit",
    lat: 20.4396,
    lng: -87.4756,
    gltfPath: "/models/mock_cave.glb",
    description: "One of the deepest cenotes in the Yucatán, Mexico.",
    depthM: 119,
  },
  {
    name: "Ginnie Springs",
    lat: 29.8327,
    lng: -82.6977,
    gltfPath: "/models/mock_cave.glb",
    description: "World-class cave diving in crystal-clear Florida springs.",
    depthM: 33,
  },
  {
    name: "Hang Sơn Đoòng",
    lat: 17.4495,
    lng: 106.2816,
    gltfPath: "/models/mock_cave.glb",
    description: "The world's largest cave passage, Vietnam.",
    depthM: 204,
  },
];

// ── Helper — convert lat/lng to Cesium Cartesian3 ─────────────────

const toCartesian = (lat: number, lng: number, altitude = 0) =>
  Cartesian3.fromDegrees(lng, lat, altitude);

// ── Component ─────────────────────────────────────────────────────

export default function EarthMap() {
  const enterCave = useCaveStore((s) => s.enterCave);

  /**
   * Handle a click on any entity.
   * We look up the cave site by matching the entity ID to the site name.
   */
  const handleEntityClick = useCallback(
    (entity: CesiumEntityType) => {
      const site = CAVE_SITES.find((s) => s.name === entity.id);
      if (site) {
        enterCave(site);
      }
    },
    [enterCave]
  );

  return (
    /*
     * Wrapper div fills the parent container (which is `absolute inset-0` in page.tsx).
     * We do NOT use the `full` prop because it positions the viewer relative to
     * document.body via position:absolute, which fights with Next.js App Router's
     * DOM structure. Instead we set explicit width/height on the Viewer directly.
     */
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
    <Viewer
      // Explicit size — fills the wrapper div above
      style={{ width: "100%", height: "100%" }}
      // Disable default UI chrome — we have our own HUD
      timeline={false}
      animation={false}
      baseLayerPicker={false}
      geocoder={false}
      homeButton={false}
      sceneModePicker={false}
      navigationHelpButton={false}
      infoBox={false}
      selectionIndicator={false}
      creditContainer={document.createElement("div")} // hides credit banner
      onClick={(movement, target) => {
        // Resium passes a PickedObject — check if it's an Entity
        if (target && "id" in target && target.id instanceof Object) {
          handleEntityClick(target.id as CesiumEntityType);
        }
      }}
    >
      {/* Fly camera to a nice overview position on mount */}
      <CameraFlyTo
        destination={Cartesian3.fromDegrees(0, 20, 20_000_000)}
        duration={2}
      />

      {/* ── Cave Site Markers ── */}
      {CAVE_SITES.map((site) => (
        <Entity
          key={site.name}
          id={site.name}
          name={site.name}
          position={toCartesian(site.lat, site.lng, 0)}
          description={`<p>${site.description}</p><p>Depth: ${site.depthM}m</p>`}
        >
          {/* Glowing point marker */}
          <PointGraphics
            pixelSize={16}
            color={Color.fromCssColorString("#22D3EE")}
            outlineColor={Color.fromCssColorString("#0891B2")}
            outlineWidth={2}
            // Pulsing effect via heightReference not available in point;
            // we use a larger translucent outer ring via a second entity below
          />

          {/* Site name label */}
          <LabelGraphics
            text={site.name}
            font="500 13px Inter, sans-serif"
            fillColor={Color.fromCssColorString("#E2E8F0")}
            outlineColor={Color.BLACK}
            outlineWidth={2}
            style={LabelStyle.FILL_AND_OUTLINE}
            verticalOrigin={VerticalOrigin.BOTTOM}
            horizontalOrigin={HorizontalOrigin.CENTER}
            pixelOffset={new Cartesian2(0, -24)}
            showBackground
            backgroundColor={Color.fromCssColorString("rgba(5,28,46,0.75)")}
            backgroundPadding={new Cartesian2(8, 4)}
          />
        </Entity>
      ))}

      {/* ── Outer glow ring per marker (larger translucent point) ── */}
      {CAVE_SITES.map((site) => (
        <Entity
          key={`${site.name}-ring`}
          position={toCartesian(site.lat, site.lng, 0)}
        >
          <PointGraphics
            pixelSize={30}
            color={Color.fromCssColorString("rgba(34,211,238,0.2)")}
            outlineWidth={0}
          />
        </Entity>
      ))}
    </Viewer>
    </div>
  );
}
