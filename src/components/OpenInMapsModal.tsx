"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Navigation } from "lucide-react";

interface OpenInMapsModalProps {
  isOpen: boolean;
  onClose: () => void;
  startCoord: [number, number] | null; // [lng, lat]
  endCoord: [number, number] | null;   // [lng, lat]
  waypoints?: [number, number][];      // [lng, lat] pairs
}

// ── URL Builders ─────────────────────────────────────────────────────────────

function buildGoogleMapsUrl(
  start: [number, number],
  end: [number, number],
  waypoints: [number, number][]
): string {
  const origin = `${start[1]},${start[0]}`;
  const destination = `${end[1]},${end[0]}`;
  const waypointStr = waypoints
    .map(([lng, lat]) => `${lat},${lng}`)
    .join("|");

  const url = new URL("https://www.google.com/maps/dir/");
  url.searchParams.set("api", "1");
  url.searchParams.set("origin", origin);
  url.searchParams.set("destination", destination);
  if (waypointStr) url.searchParams.set("waypoints", waypointStr);
  url.searchParams.set("travelmode", "driving");
  return url.toString();
}

function buildAppleMapsUrl(
  start: [number, number],
  end: [number, number]
): string {
  // Apple Maps does not support intermediate waypoints via URL scheme,
  // so we pass start+destination only.
  const url = new URL("http://maps.apple.com/");
  url.searchParams.set("saddr", `${start[1]},${start[0]}`);
  url.searchParams.set("daddr", `${end[1]},${end[0]}`);
  url.searchParams.set("dirflg", "d");
  return url.toString();
}

/**
 * Sub-sample a polyline to at most `maxPoints` evenly-spaced intermediate
 * waypoints (excludes the first and last coordinate since those are the
 * start/end pins). Google Maps supports up to 8 waypoints in the free tier.
 */
function sampleWaypoints(
  coords: [number, number][],
  maxPoints = 6
): [number, number][] {
  if (coords.length <= 2) return [];
  const inner = coords.slice(1, -1);
  if (inner.length <= maxPoints) return inner as [number, number][];
  const step = (inner.length - 1) / (maxPoints - 1);
  return Array.from({ length: maxPoints }, (_, i) =>
    inner[Math.round(i * step)]
  ) as [number, number][];
}

// ── Platform detection ────────────────────────────────────────────────────────

type Platform = "ios" | "android" | "desktop";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function OpenInMapsModal({
  isOpen,
  onClose,
  startCoord,
  endCoord,
  waypoints = [],
}: OpenInMapsModalProps) {
  const [platform, setPlatform] = useState<Platform>("desktop");

  useEffect(() => {
    setPlatform(detectPlatform());
  }, []);

  const canOpen = !!(startCoord && endCoord);

  const googleUrl = canOpen
    ? buildGoogleMapsUrl(startCoord!, endCoord!, waypoints)
    : "#";
  const appleUrl = canOpen
    ? buildAppleMapsUrl(startCoord!, endCoord!)
    : "#";

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal / Bottom sheet */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.97 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="fixed z-50 bottom-0 left-0 right-0 md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[380px]"
          >
            <div className="bg-neutral-900 border border-white/10 rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
                <div>
                  <h2 className="text-white font-semibold text-base">Open in Maps</h2>
                  <p className="text-neutral-500 text-xs mt-0.5">Choose your preferred navigation app</p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors text-neutral-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Options */}
              <div className="p-4 flex flex-col gap-3">
                {!canOpen && (
                  <p className="text-center text-sm text-neutral-500 py-4">
                    Place a Driver Start and Destination pin first.
                  </p>
                )}

                {/* Apple Maps */}
                {canOpen && (
                  <a
                    href={appleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`group flex items-center gap-4 w-full p-4 rounded-2xl border transition-all ${
                      platform === "ios"
                        ? "border-white/20 bg-white/5 hover:bg-white/10"
                        : "border-white/10 bg-white/[0.03] hover:bg-white/[0.07]"
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg ${
                      platform === "ios" ? "bg-gradient-to-br from-sky-400 to-blue-600" : "bg-neutral-800"
                    }`}>
                      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="white">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                      </svg>
                    </div>
                    <div className="text-left flex-1">
                      <p className="text-white font-semibold text-sm">Apple Maps</p>
                      <p className="text-neutral-500 text-xs mt-0.5">
                        {platform === "ios" ? "Recommended for your device" : "Best for iPhone & Mac"}
                      </p>
                    </div>
                    {platform === "ios" && (
                      <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider px-2 py-1 rounded-full bg-sky-500/10 border border-sky-500/20">
                        Recommended
                      </span>
                    )}
                  </a>
                )}

                {/* Google Maps */}
                {canOpen && (
                  <a
                    href={googleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`group flex items-center gap-4 w-full p-4 rounded-2xl border transition-all ${
                      platform !== "ios"
                        ? "border-white/20 bg-white/5 hover:bg-white/10"
                        : "border-white/10 bg-white/[0.03] hover:bg-white/[0.07]"
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg ${
                      platform !== "ios" ? "bg-white" : "bg-neutral-800"
                    }`}>
                      <svg className="w-7 h-7" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#EA4335"/>
                        <path d="M12 2c-1.93 0-3.68.78-4.95 2.05L12 9l4.95-4.95C15.68 2.78 13.93 2 12 2z" fill="#4285F4"/>
                        <path d="M7.05 4.05C5.78 5.32 5 7.07 5 9c0 2.42 1.09 4.59 2.81 6.07L12 9 7.05 4.05z" fill="#FBBC05"/>
                        <path d="M16.95 4.05L12 9l4.19 6.07C17.91 13.59 19 11.42 19 9c0-1.93-.78-3.68-2.05-4.95z" fill="#34A853"/>
                        <circle cx="12" cy="9" r="2.5" fill="white"/>
                      </svg>
                    </div>
                    <div className="text-left flex-1">
                      <p className="text-white font-semibold text-sm">Google Maps</p>
                      <p className="text-neutral-500 text-xs mt-0.5">
                        {platform !== "ios"
                          ? (platform === "android" ? "Recommended for your device" : "Best for desktop & Android")
                          : "Works on all platforms"}
                      </p>
                    </div>
                    {platform !== "ios" && (
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                        Recommended
                      </span>
                    )}
                  </a>
                )}

                {/* Note about waypoints */}
                {canOpen && waypoints.length > 0 && (
                  <p className="text-center text-[11px] text-neutral-600 px-2">
                    Route includes {waypoints.length} intermediate waypoint{waypoints.length !== 1 ? "s" : ""} for Google Maps accuracy.
                  </p>
                )}
              </div>

              {/* Safe area spacer for mobile */}
              <div className="h-[env(safe-area-inset-bottom,12px)] md:hidden" />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Helper export ─────────────────────────────────────────────────────────────

/**
 * Given a GeoJSON FeatureCollection (the full saved route), extract
 * start/end pins and intermediate waypoints from the route line.
 */
export function extractMapCoords(geojson: GeoJSON.FeatureCollection): {
  startCoord: [number, number] | null;
  endCoord: [number, number] | null;
  waypoints: [number, number][];
} {
  const startFeature = geojson.features.find(
    (f) => f.geometry?.type === "Point" && f.properties?.markerType === "start"
  );
  const endFeature = geojson.features.find(
    (f) => f.geometry?.type === "Point" && f.properties?.markerType === "end"
  );
  const lineFeature = geojson.features.find(
    (f) => f.geometry?.type === "LineString"
  );

  const startCoord =
    startFeature && startFeature.geometry.type === "Point"
      ? (startFeature.geometry.coordinates as [number, number])
      : null;

  const endCoord =
    endFeature && endFeature.geometry.type === "Point"
      ? (endFeature.geometry.coordinates as [number, number])
      : null;

  let waypoints: [number, number][] = [];
  if (lineFeature && lineFeature.geometry.type === "LineString") {
    waypoints = sampleWaypoints(
      lineFeature.geometry.coordinates as [number, number][]
    );
  }

  return { startCoord, endCoord, waypoints };
}
