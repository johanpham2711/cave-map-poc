import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CaveMap POC — 3D Cave Diving Platform",
  description:
    "A proof-of-concept 3D cave diving mapping platform built with Next.js, Resium (CesiumJS), and React Three Fiber.",
  keywords: ["cave diving", "3D map", "CesiumJS", "Three.js", "speleology"],
  authors: [{ name: "Cave Map Team" }],
  openGraph: {
    title: "CaveMap POC",
    description: "Interactive 3D cave diving mapping platform",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/*
          CESIUM_BASE_URL must be set before Cesium loads.
          We inject it as a script tag so it's available globally.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.CESIUM_BASE_URL = "/cesium/";`,
          }}
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
