/**
 * ─────────────────────────────────────────────────────────────────
 * components/CaveMap.tsx
 *
 * Immersive 3D cave viewer using React Three Fiber + drei.
 *
 * Features:
 *  • Full-screen R3F Canvas with a dark abyss background
 *  • Ambient + Directional lighting
 *  • OrbitControls for free rotation/pan/zoom
 *  • GLTF model loaded from /public/models/mock_cave.glb
 *  • Raycaster via R3F pointer events:
 *      - onClick on the GLTF mesh → logs XYZ intersection
 *      - Places a glowing red sphere (Node) at the click point
 *  • Node list displayed as an overlay legend
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import React, { useRef, useState, useCallback, Suspense } from "react";
import { Canvas, ThreeEvent } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment, Grid } from "@react-three/drei";
import * as THREE from "three";
import { useCaveStore } from "@/store/useCaveStore";

// ── Types ─────────────────────────────────────────────────────────

/** A placed node / survey point in the 3D cave. */
interface SurveyNode {
  id: string;
  position: THREE.Vector3;
  label: string;
}

// ── CaveModel — loads the GLTF and handles click-to-place nodes ──

interface CaveModelProps {
  onNodePlaced: (node: SurveyNode) => void;
}

function CaveModel({ onNodePlaced }: CaveModelProps) {
  const { scene } = useGLTF("/models/mock_cave.glb");
  const nodeCounter = useRef(1);

  /**
   * Handle a pointer (click) event on the GLTF mesh.
   * R3F automatically raycasts and gives us the intersection point.
   *
   * DRAG GUARD: R3F's ThreeEvent includes `delta` — the number of pixels
   * the pointer moved between pointerdown and pointerup. If delta > 4px
   * the user was dragging with OrbitControls, not clicking to place a node.
   */
  const handleClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      // Stop propagation so we don't bubble to the Canvas
      event.stopPropagation();

      // Ignore drags — only place a node on a genuine click
      if (event.delta > 4) return;

      const point = event.point.clone();

      // Log XYZ to console as requested
      console.log(
        `[CaveMap] Survey node intersection — X: ${point.x.toFixed(3)}, Y: ${point.y.toFixed(3)}, Z: ${point.z.toFixed(3)}`
      );

      const node: SurveyNode = {
        id: `node-${Date.now()}`,
        position: point,
        label: `P${nodeCounter.current++}`,
      };

      onNodePlaced(node);
    },
    [onNodePlaced]
  );

  return (
    <primitive
      object={scene}
      onClick={handleClick}
      // Make the mesh receive pointer events
      castShadow
      receiveShadow
    />
  );
}

// ── Fallback geometry if the GLTF is missing / still loading ─────

function FallbackCave({ onNodePlaced }: CaveModelProps) {
  const nodeCounter = useRef(1);

  const handleClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      event.stopPropagation();

      // Drag guard — skip if user was panning/rotating with OrbitControls
      if (event.delta > 4) return;

      const point = event.point.clone();
      console.log(
        `[CaveMap] Survey node intersection — X: ${point.x.toFixed(3)}, Y: ${point.y.toFixed(3)}, Z: ${point.z.toFixed(3)}`
      );
      const node: SurveyNode = {
        id: `node-${Date.now()}`,
        position: point,
        label: `P${nodeCounter.current++}`,
      };
      onNodePlaced(node);
    },
    [onNodePlaced]
  );

  return (
    <group>
      {/* Outer cave shell */}
      <mesh onClick={handleClick} castShadow receiveShadow>
        <sphereGeometry args={[4, 32, 32]} />
        <meshStandardMaterial
          color="#1a3a5c"
          roughness={0.9}
          metalness={0.1}
          side={THREE.BackSide} // render inside surface
          wireframe={false}
        />
      </mesh>

      {/* Rock floor */}
      <mesh position={[0, -3.5, 0]} rotation={[-Math.PI / 2, 0, 0]} onClick={handleClick}>
        <planeGeometry args={[7, 7, 8, 8]} />
        <meshStandardMaterial color="#0d2438" roughness={1} metalness={0} />
      </mesh>

      {/* Stalactites (decorative cones) */}
      {[
        [0, 3.8, 0],
        [1.5, 3.5, 1],
        [-1.5, 3.6, -1],
        [0.5, 3.4, -1.5],
      ].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.18, 0.8, 8]} />
          <meshStandardMaterial color="#0f3352" roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

// ── SurveyNodeSphere — the placed red marker sphere ───────────────

function SurveyNodeSphere({ node }: { node: SurveyNode }) {
  return (
    <group position={node.position}>
      {/* Inner solid red sphere */}
      <mesh>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial
          color="#EF4444"
          emissive="#DC2626"
          emissiveIntensity={0.8}
          roughness={0.2}
          metalness={0.4}
        />
      </mesh>
      {/* Outer translucent glow sphere */}
      <mesh>
        <sphereGeometry args={[0.14, 16, 16]} />
        <meshStandardMaterial
          color="#FCA5A5"
          transparent
          opacity={0.2}
          roughness={0}
          metalness={0}
        />
      </mesh>
    </group>
  );
}

// ── ErrorBoundary for GLTF loading ────────────────────────────────

class GLTFErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn("[CaveMap] GLTF load error — using fallback geometry:", error.message);
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

// ── NodeLegend — 2D overlay listing placed nodes ─────────────────

function NodeLegend({ nodes }: { nodes: SurveyNode[] }) {
  if (nodes.length === 0) return null;
  return (
    <div
      className="absolute bottom-6 right-6 glass glow-coral animate-slide-up"
      style={{ minWidth: 180, maxHeight: 260, overflowY: "auto" }}
    >
      <div className="px-4 pt-3 pb-2 border-b border-white/10">
        <p className="text-xs font-semibold text-coral-400 uppercase tracking-widest">
          Survey Nodes ({nodes.length})
        </p>
      </div>
      <ul className="px-4 py-2 space-y-1">
        {nodes.map((n) => (
          <li key={n.id} className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
            <span className="text-xs font-mono text-slate-300">
              {n.label}&nbsp;
              <span className="text-slate-500">
                ({n.position.x.toFixed(1)}, {n.position.y.toFixed(1)}, {n.position.z.toFixed(1)})
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── CaveMap — main export ─────────────────────────────────────────

export default function CaveMap() {
  const selectedCave = useCaveStore((s) => s.selectedCave);
  const [nodes, setNodes] = useState<SurveyNode[]>([]);

  const handleNodePlaced = useCallback((node: SurveyNode) => {
    setNodes((prev) => [...prev, node]);
  }, []);

  return (
    <div className="relative w-full h-full bg-abyss-950 animate-fade-in">
      {/* Click-hint tooltip */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 pointer-events-none z-10 mt-32 opacity-40">
        <p className="text-xs text-biolum-400 font-mono tracking-widest">
          CLICK MODEL TO PLACE SURVEY NODE
        </p>
      </div>

      <Canvas
        shadows
        camera={{ position: [0, 2, 8], fov: 60, near: 0.1, far: 1000 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: "#020b12" }}
      >
        {/* ── Lighting ── */}
        <ambientLight intensity={0.4} color="#b0c4de" />
        <directionalLight
          position={[5, 10, 5]}
          intensity={1.2}
          color="#ffffff"
          castShadow
          shadow-mapSize={[2048, 2048]}
        />
        {/* Subtle fill light from below (bioluminescent tint) */}
        <pointLight position={[0, -3, 0]} intensity={0.6} color="#22D3EE" distance={12} />

        {/* ── Environment (soft HDRI-style ambient) ── */}
        <Environment preset="night" />

        {/* ── Cave Geometry ── */}
        <GLTFErrorBoundary fallback={<FallbackCave onNodePlaced={handleNodePlaced} />}>
          <Suspense fallback={<FallbackCave onNodePlaced={handleNodePlaced} />}>
            <CaveModel onNodePlaced={handleNodePlaced} />
          </Suspense>
        </GLTFErrorBoundary>

        {/* ── Placed Survey Nodes ── */}
        {nodes.map((node) => (
          <SurveyNodeSphere key={node.id} node={node} />
        ))}

        {/* ── Ground grid (subtle orientation aid) ── */}
        <Grid
          position={[0, -4, 0]}
          args={[20, 20]}
          cellSize={1}
          cellThickness={0.5}
          cellColor="#22D3EE"
          sectionSize={5}
          sectionThickness={1}
          sectionColor="#0891B2"
          fadeDistance={20}
          fadeStrength={2}
          infiniteGrid={false}
        />

        {/* ── Camera Controls ── */}
        <OrbitControls
          enablePan
          enableZoom
          enableRotate
          minDistance={1}
          maxDistance={20}
          dampingFactor={0.05}
          enableDamping
        />
      </Canvas>

      {/* ── 2D Node legend overlay ── */}
      <NodeLegend nodes={nodes} />
    </div>
  );
}
