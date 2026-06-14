import type { NextConfig } from "next";
import fs from "fs";
import path from "path";

const hasGoogleServices = fs.existsSync(path.resolve(process.cwd(), "android/app/google-services.json"));

const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  disable: true, // Always disable PWA/Service Worker generation to prevent conflicts inside native Capacitor apps
  register: false,
  skipWaiting: true,
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'export',
  images: {
    unoptimized: true,
  },
  devIndicators: {
    position: "bottom-right",
  },
  allowedDevOrigins: ["nancey-pandemoniacal-candra.ngrok-free.dev", "srm-nest-bridge.loca.lt", "*.loca.lt"],
  env: {
    NEXT_PUBLIC_FCM_ENABLED: String(hasGoogleServices),
  },
};

export default withPWA(nextConfig);
