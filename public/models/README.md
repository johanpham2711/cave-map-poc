# mock_cave.glb — Placeholder

Place a GLTF binary (`.glb`) file here named `mock_cave.glb`.

## Quick options

### Option A — Use a free sample model

Download any `.glb` from https://market.pmnd.rs/ or https://sketchfab.com (filter: free, downloadable GLTF).
Rename it to `mock_cave.glb` and drop it in this directory.

### Option B — Generate a minimal GLB with Blender

1. Open Blender → Delete the default cube
2. Add → Mesh → Monkey (or any mesh)
3. File → Export → glTF 2.0 → Format: GLB
4. Save as `public/models/mock_cave.glb`

### Option C — Use the built-in fallback

If no `.glb` is present, `CaveMap.tsx` has a `FallbackCave` component that renders
a procedural cave (sphere interior + stalactites) so the raycaster demo still works.
