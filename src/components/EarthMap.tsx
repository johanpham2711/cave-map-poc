/**
 * ─────────────────────────────────────────────────────────────────
 * components/EarthMap.tsx
 *
 * Full-screen 3D globe rendered via Resium (CesiumJS wrapper).
 *
 * Bug fixes applied:
 *  1. Hover works on both the point circle AND the label
 *     → Ring entities now share the same onClick/onMouseEnter/onMouseLeave
 *       so they no longer silently swallow events.
 *  2. Cursor changes to pointer on hover
 *     → We directly mutate viewer.canvas.style.cursor inside the handler.
 *  3. Globe drag/pan now works correctly
 *     → Mouse position is stored in a ref (not state), so moving the mouse
 *       while NOT hovering an entity causes ZERO React re-renders, which
 *       previously interrupted Cesium's camera controller drag tracking.
 *       A requestAnimationFrame loop syncs the ref → state only while a
 *       tooltip is actually visible.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

// ── REQUIRED: Cesium widget styles ───────────────────────────────
import "cesium/Build/Cesium/Widgets/widgets.css";

import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Viewer,
  Entity,
  PointGraphics,
  LabelGraphics,
  useCesium,          // gives us the Cesium viewer inside the Resium context
} from "resium";
import {
  Ion,
  Cartesian3,
  Color,
  LabelStyle,
  VerticalOrigin,
  HorizontalOrigin,
  Cartesian2,
} from "cesium";
import { useCaveStore, type CaveSite } from "@/store/useCaveStore";

// ── Cesium Ion Token ──────────────────────────────────────────────

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
    lat: 20.323193547265664,
    lng: -87.40991391373848,
    gltfPath: "/models/mock_cave.glb",
    description: "One of the deepest cenotes in the Yucatán, Mexico.",
    depthM: 119,
  },
  {
    name: "Ginnie Springs",
    lat: 29.8344945132364,
    lng: -82.7024059454573,
    gltfPath: "/models/mock_cave.glb",
    description: "World-class cave diving in crystal-clear Florida springs.",
    depthM: 33,
  },
  {
    name: "Hang Sơn Đoòng",
    lat: 17.46490864328029,
    lng: 106.28737418005288,
    gltfPath: "/models/mock_cave.glb",
    description: "The world's largest cave passage, Vietnam.",
    depthM: 204,
  },
  {
    name: "Eagles Nest",
    lat: 28.555581802699393,
    lng: -82.60929413199864,
    gltfPath: "/models/mock_cave.glb",
    description: "One of the most famous and dangerous cave dives in Florida.",
    depthM: 53,
  },
  {
    name: "Devil's Eye",
    lat: 29.497437217686908,
    lng: -82.65051560516184,
    gltfPath: "/models/mock_cave.glb",
    description: "Devil's Eye is a popular cave diving location in Florida.",
    depthM: 53,
  },
  {
    name: "Zacatón",
    lat: 22.186751852849995,
    lng: -97.80240937877597,
    gltfPath: "/models/mock_cave.glb",
    description: "Zacatón is a large sinkhole in Tamaulipas, Mexico.",
    depthM: 335,
  },
  {
    name: "Dragon's Breath",
    lat: -26.756029818727642,
    lng: 27.810617866756948,
    gltfPath: "/models/mock_cave.glb",
    description: "Dragon's Breath is a large sinkhole in South Africa.",
    depthM: 53,
  },
  {
    name: "Bushman's Hole",
    lat: -26.665951151466245,
    lng: 27.71621745405137,
    gltfPath: "/models/mock_cave.glb",
    description: "Bushman's Hole is a large sinkhole in South Africa.",
    depthM: 238,
  },
  {
    name: "Xiaozhai Tiankeng",
    lat: 29.38208984870596,
    lng: 107.48004313024973,
    gltfPath: "/models/mock_cave.glb",
    description: "Xiaozhai Tiankeng is a large sinkhole in Chongqing, China.",
    depthM: 660,
  },
  {
    name: "Sistema Dos Ojos",
    lat: 20.729075668305645,
    lng: -87.53454633187841,
    gltfPath: "/models/mock_cave.glb",
    description: "Sistema Dos Ojos is a large sinkhole in Quintana Roo, Mexico.",
    depthM: 21,
  }
];

// ── Static Cesium colors ──────────────────────────────────────────

const COLOR_DEFAULT = Color.fromCssColorString("#22D3EE");
const COLOR_DEFAULT_OUTLINE = Color.fromCssColorString("#0891B2");
const COLOR_HOVER = Color.fromCssColorString("#FB923C");
const COLOR_HOVER_OUTLINE = Color.fromCssColorString("#EA580C");
const COLOR_RING_DEFAULT = Color.fromCssColorString("rgba(34,211,238,0.15)");
const COLOR_RING_HOVER = Color.fromCssColorString("rgba(251,146,60,0.25)");
const COLOR_LABEL_BG = Color.fromCssColorString("rgba(5,28,46,0.80)");

// ── Helper ────────────────────────────────────────────────────────

const toCartesian = (lat: number, lng: number, altitude = 0) =>
  Cartesian3.fromDegrees(lng, lat, altitude);

/**
 * Module-level constants — created ONCE when this module first loads.
 *
 * creditContainer: Cesium shows attribution text in the DOM; we hide it by
 * pointing it at a detached div. It MUST be a stable reference — passing
 * `document.createElement("div")` inline creates a new element every render,
 * which Resium treats as a changed read-only prop and destroys the Viewer.
 *
 * INITIAL_CAMERA: Cartesian3 object for the initial fly-to. Creating it inline
 * in JSX would produce a new object on every render, causing CameraFlyTo to
 * re-fire the animation each time React re-renders (e.g. on every hover change).
 */
const CREDIT_CONTAINER = document.createElement("div");
const INITIAL_CAMERA = Cartesian3.fromDegrees(0, 20, 20_000_000);

// ── InitialCameraFly ──────────────────────────────────────────────

/**
 * Fires a one-shot camera fly-to on mount only.
 *
 * Why not <CameraFlyTo>?
 * CameraFlyTo is a Resium component that lives in React's reconciler tree.
 * When the parent re-renders (e.g. when hoveredSite changes), Resium's
 * internal context may update, which can cause CameraFlyTo's componentDidUpdate
 * to fire and re-trigger the fly animation — zooming the globe back out.
 *
 * useCesium() + useEffect(, [viewer]) solves this definitively:
 * - `viewer` is the stable Cesium Viewer singleton (same reference always)
 * - The effect therefore runs exactly once after mount
 * - Parent re-renders have zero effect on this component
 */
function InitialCameraFly() {
  const { viewer } = useCesium();

  useEffect(() => {
    if (!viewer) return;
    viewer.camera.flyTo({
      destination: INITIAL_CAMERA,
      duration: 2,
    });
  }, [viewer]); // `viewer` is a stable singleton — this runs exactly once

  return null;
}

// ── HoverTooltip ──────────────────────────────────────────────────

interface TooltipProps {
  site: CaveSite;
  x: number;
  y: number;
  containerWidth: number;
}

function HoverTooltip({ site, x, y, containerWidth }: TooltipProps) {
  const TOOLTIP_WIDTH = 224;
  // Flip to the left if too close to the right edge
  const flipLeft = x + TOOLTIP_WIDTH + 24 > containerWidth;

  return (
    <div
      style={{
        position: "absolute",
        top: Math.max(0, y - 24),
        left: flipLeft ? x - TOOLTIP_WIDTH - 16 : x + 20,
        width: TOOLTIP_WIDTH,
        pointerEvents: "none",
        zIndex: 200,
        animation: "fadeIn 0.15s ease-out",
      }}
    >
      <div className="glass glow-cyan scanline" style={{ padding: "14px 16px" }}>
        {/* Cave name */}
        <p
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#FB923C",
            marginBottom: 6,
            letterSpacing: "0.02em",
          }}
        >
          {site.name}
        </p>

        {/* Description */}
        <p
          style={{
            fontSize: 11,
            color: "#94A3B8",
            lineHeight: 1.55,
            marginBottom: 10,
          }}
        >
          {site.description}
        </p>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 8 }}>
          <div
            style={{
              flex: 1,
              background: "rgba(255,255,255,0.04)",
              borderRadius: 8,
              padding: "6px 8px",
            }}
          >
            <p style={{ fontSize: 9, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Depth
            </p>
            <p style={{ fontSize: 12, fontWeight: 600, color: "#22D3EE", fontFamily: "monospace" }}>
              {site.depthM}m
            </p>
          </div>
          <div
            style={{
              flex: 1,
              background: "rgba(255,255,255,0.04)",
              borderRadius: 8,
              padding: "6px 8px",
            }}
          >
            <p style={{ fontSize: 9, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Coords
            </p>
            <p style={{ fontSize: 10, color: "#22D3EE", fontFamily: "monospace" }}>
              {site.lat.toFixed(2)}°N
            </p>
            <p style={{ fontSize: 10, color: "#22D3EE", fontFamily: "monospace" }}>
              {site.lng.toFixed(2)}°E
            </p>
          </div>
        </div>

        {/* Click hint */}
        <p
          style={{
            fontSize: 10,
            color: "#FB923C",
            textAlign: "center",
            marginTop: 10,
            opacity: 0.8,
            letterSpacing: "0.06em",
          }}
        >
          ↵ Click to dive in
        </p>
      </div>
    </div>
  );
}

// ── EarthMap ──────────────────────────────────────────────────────

export default function EarthMap() {
  const enterCave = useCaveStore((s) => s.enterCave);

  const containerRef = useRef<HTMLDivElement>(null);

  // Tooltip visibility (React state — triggers re-render to show/hide tooltip)
  const [hoveredSite, setHoveredSite] = useState<CaveSite | null>(null);
  // Tooltip position stored as a ref to avoid re-renders on every mouse move.
  // A rAF loop below syncs it to state only while the tooltip is visible.
  const mousePosRef = useRef({ x: 0, y: 0 });
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const rafId = useRef<number | null>(null);

  /**
   * Start a rAF loop to sync mouse position → React state for tooltip rendering.
   * We only run this loop when a tooltip is visible, so normal globe panning/dragging
   * never triggers React re-renders from mouse movement.
   */
  const startTooltipLoop = useCallback(() => {
    const loop = () => {
      setTooltipPos({ ...mousePosRef.current });
      rafId.current = requestAnimationFrame(loop);
    };
    rafId.current = requestAnimationFrame(loop);
  }, []);

  const stopTooltipLoop = useCallback(() => {
    if (rafId.current !== null) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
  }, []);

  // Clean up on unmount
  useEffect(() => () => stopTooltipLoop(), [stopTooltipLoop]);

  /**
   * Track raw mouse position in a REF (zero re-renders).
   * This is safe to call on every mousemove because no state update occurs.
   */
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    mousePosRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  /**
   * Helper: change the Cesium canvas cursor.
   * We query for the canvas inside our container div — this is simpler and
   * more reliable than accessing viewerRef.cesiumElement (which can be
   * undefined before the Viewer finishes initialising).
   */
  const setCanvasCursor = useCallback((cursor: string) => {
    const canvas = containerRef.current?.querySelector<HTMLCanvasElement>("canvas");
    if (canvas) canvas.style.cursor = cursor;
  }, []);

  // ── Shared hover/click handlers ─────────────────────────────────

  const handleMouseEnter = useCallback(
    (site: CaveSite) => {
      setHoveredSite(site);
      setCanvasCursor("pointer");
      startTooltipLoop();
    },
    [setCanvasCursor, startTooltipLoop]
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredSite(null);
    setCanvasCursor("default");
    stopTooltipLoop();
  }, [setCanvasCursor, stopTooltipLoop]);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      style={{ width: "100%", height: "100%", position: "relative" }}
    >
      <Viewer
        style={{ width: "100%", height: "100%" }}
        timeline={false}
        animation={false}
        baseLayerPicker={false}
        geocoder={false}
        homeButton={false}
        sceneModePicker={false}
        navigationHelpButton={false}
        infoBox={false}
        selectionIndicator={false}
        creditContainer={CREDIT_CONTAINER}
      >
        {/* Initial camera fly-to — runs exactly once on mount, never re-fires */}
        <InitialCameraFly />

        {/* ── Cave Site Markers (inner point + label) ── */}
        {CAVE_SITES.map((site) => {
          const isHovered = hoveredSite?.name === site.name;
          return (
            <Entity
              key={site.name}
              id={site.name}
              name={site.name}
              position={toCartesian(site.lat, site.lng, 0)}
              onClick={() => enterCave(site)}
              onMouseEnter={() => handleMouseEnter(site)}
              onMouseLeave={handleMouseLeave}
            >
              {/* Inner point — grows & turns orange on hover */}
              <PointGraphics
                pixelSize={isHovered ? 22 : 16}
                color={isHovered ? COLOR_HOVER : COLOR_DEFAULT}
                outlineColor={isHovered ? COLOR_HOVER_OUTLINE : COLOR_DEFAULT_OUTLINE}
                outlineWidth={2}
              /*
               * disableDepthTestDistance is intentionally NOT set here.
               * Setting it to Infinity makes markers visible through the globe
               * (i.e. on the opposite hemisphere). Cesium's default depth test
               * correctly hides occluded markers, which is the desired behavior.
               */
              />

              {/* Site name label */}
              <LabelGraphics
                text={site.name}
                font={isHovered ? "600 13px Inter, sans-serif" : "500 12px Inter, sans-serif"}
                fillColor={
                  isHovered
                    ? Color.fromCssColorString("#FB923C")
                    : Color.fromCssColorString("#E2E8F0")
                }
                outlineColor={Color.BLACK}
                outlineWidth={2}
                style={LabelStyle.FILL_AND_OUTLINE}
                verticalOrigin={VerticalOrigin.BOTTOM}
                horizontalOrigin={HorizontalOrigin.CENTER}
                pixelOffset={new Cartesian2(0, -28)}
                showBackground
                backgroundColor={COLOR_LABEL_BG}
                backgroundPadding={new Cartesian2(8, 4)}
                disableDepthTestDistance={0}
              />
            </Entity>
          );
        })}

        {/*
          ── Outer glow ring entities ──
          IMPORTANT: These MUST have the same event handlers as the main entity.
          Cesium picks the topmost entity under the cursor — if the ring entity
          is on top and has no handlers, clicks/hovers on the ring area silently
          fail. By wiring the same handlers here, the ring area is fully interactive.
        */}
        {CAVE_SITES.map((site) => {
          const isHovered = hoveredSite?.name === site.name;
          return (
            <Entity
              key={`${site.name}-ring`}
              position={toCartesian(site.lat, site.lng, 0)}
              onClick={() => enterCave(site)}
              onMouseEnter={() => handleMouseEnter(site)}
              onMouseLeave={handleMouseLeave}
            >
              <PointGraphics
                pixelSize={isHovered ? 44 : 32}
                color={isHovered ? COLOR_RING_HOVER : COLOR_RING_DEFAULT}
                outlineWidth={0}
              // No disableDepthTestDistance — ring also hides with the globe
              />
            </Entity>
          );
        })}
      </Viewer>

      {/* ── React Hover Tooltip ── */}
      {hoveredSite && containerRef.current && (
        <HoverTooltip
          site={hoveredSite}
          x={tooltipPos.x}
          y={tooltipPos.y}
          containerWidth={containerRef.current.clientWidth}
        />
      )}
    </div>
  );
}
