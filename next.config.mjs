// @ts-check
import { createRequire } from "module";
import { fileURLToPath } from "url";
import CopyWebpackPlugin from "copy-webpack-plugin";
import path from "path";

/**
 * CesiumJS requires several static assets (Workers, Assets, Widgets, ThirdParty)
 * to be served from the public directory. We copy them in here via CopyWebpackPlugin.
 *
 * NOTE: .mjs files are pure ESM — we use createRequire() to get require.resolve(),
 * and fileURLToPath(import.meta.url) to get __dirname equivalent.
 */

// ESM replacements for CommonJS globals
const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Resolve the Cesium package root
      const cesiumDir = path.dirname(require.resolve("cesium/package.json"));

      // Copy Cesium static assets into /public/cesium at build time
      config.plugins.push(
        new CopyWebpackPlugin({
          patterns: [
            {
              from: path.join(cesiumDir, "Build/Cesium/Workers"),
              to: path.join(__dirname, "public/cesium/Workers"),
            },
            {
              from: path.join(cesiumDir, "Build/Cesium/ThirdParty"),
              to: path.join(__dirname, "public/cesium/ThirdParty"),
            },
            {
              from: path.join(cesiumDir, "Build/Cesium/Assets"),
              to: path.join(__dirname, "public/cesium/Assets"),
            },
            {
              from: path.join(cesiumDir, "Build/Cesium/Widgets"),
              to: path.join(__dirname, "public/cesium/Widgets"),
            },
          ],
        })
      );
    }

    return config;
  },

  // Headers required for CesiumJS SharedArrayBuffer support (WASM workers)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ],
      },
    ];
  },
};

export default nextConfig;
