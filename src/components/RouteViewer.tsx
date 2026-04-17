"use client";

// CSS must be imported before any component code so they apply before
// Mapbox GL tries to render into the container.
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";

import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { Copy, Check, ArrowLeft, Info, Navigation } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import OpenInMapsModal, { extractMapCoords } from "./OpenInMapsModal";

interface RouteViewerProps {
  geojson: GeoJSON.FeatureCollection;
}

// ── Marker DOM factory ──────────────────────────────────────────────────────
function createMarkerEl(color: string, label: string): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.style.cssText =
    "display:flex;flex-direction:column;align-items:center;user-select:none;pointer-events:none;";
  const badge = document.createElement("div");
  badge.textContent = label;
  badge.style.cssText = `
    background:${color};color:white;font-size:11px;font-weight:700;
    padding:4px 10px;border-radius:20px;white-space:nowrap;
    font-family:-apple-system,sans-serif;box-shadow:0 3px 12px rgba(0,0,0,0.5);
    margin-bottom:5px;letter-spacing:0.04em;border:1.5px solid rgba(255,255,255,0.3);
  `;
  const pin = document.createElement("div");
  pin.style.cssText = `
    width:20px;height:20px;background:${color};border:3px solid white;
    border-radius:50% 50% 50% 0;transform:rotate(-45deg);
    box-shadow:0 3px 10px rgba(0,0,0,0.5);
  `;
  wrapper.appendChild(badge);
  wrapper.appendChild(pin);
  return wrapper;
}

export default function RouteViewer({ geojson }: RouteViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mapsModalOpen, setMapsModalOpen] = useState(false);

  const { startCoord, endCoord, waypoints } = extractMapCoords(geojson);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      console.error("[RouteViewer] NEXT_PUBLIC_MAPBOX_TOKEN is missing");
      return;
    }

    // ── Cancellation flag ─────────────────────────────────────────────────
    // Prevents async callbacks from touching state after React unmounts
    let cancelled = false;

    mapboxgl.accessToken = token;

    // ── Initialize map ────────────────────────────────────────────────────
    // Using explicit height/width guarantees.
    const map = new mapboxgl.Map({
      container,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [-0.1276, 51.5074], // Initial default
      zoom: 12,
      pitch: 20,
      attributionControl: false,
    });
    mapRef.current = map;

    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");

    map.on("load", () => {
      if (cancelled) return;
      console.log("[RouteViewer] Map loaded, features to process:", geojson.features.length);

      // ── Separate feature types ──────────────────────────────────────────
      const lineFeatures = geojson.features.filter(
        (f) => f.geometry && f.geometry.type === "LineString"
      );
      const startFeature = geojson.features.find(
        (f) => f.geometry?.type === "Point" && f.properties?.markerType === "start"
      );
      const endFeature = geojson.features.find(
        (f) => f.geometry?.type === "Point" && f.properties?.markerType === "end"
      );

      console.log("[RouteViewer] Counts - lines:", lineFeatures.length, "start:", !!startFeature, "end:", !!endFeature);

      // ── Add route line source & layer ───────────────────────────────────
      if (lineFeatures.length > 0) {
        map.addSource("route", {
          type: "geojson",
          data: { type: "FeatureCollection", features: lineFeatures },
        });

        // Background glow
        map.addLayer({
          id: "route-glow",
          type: "line",
          source: "route",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": "#FFFFFF",
            "line-width": 14,
            "line-opacity": 0.08,
            "line-blur": 6,
          },
        });

        // Core bright line
        map.addLayer({
          id: "route-line",
          type: "line",
          source: "route",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": "#00E5FF", "line-width": 6 },
        });
      }

      // ── Add markers ─────────────────────────────────────────────────────
      if (startFeature && startFeature.geometry.type === "Point") {
        const [lng, lat] = startFeature.geometry.coordinates as [number, number];
        new mapboxgl.Marker({
          element: createMarkerEl("#3B82F6", "Driver Start"),
          anchor: "bottom",
          offset: [0, 5],
        })
          .setLngLat([lng, lat])
          .addTo(map);
      }

      if (endFeature && endFeature.geometry.type === "Point") {
        const [lng, lat] = endFeature.geometry.coordinates as [number, number];
        new mapboxgl.Marker({
          element: createMarkerEl("#EF4444", "Destination"),
          anchor: "bottom",
          offset: [0, 5],
        })
          .setLngLat([lng, lat])
          .addTo(map);
      }

      // ── Calculate Bounds and Frame ─────────────────────────────────────
      try {
        const bounds = new mapboxgl.LngLatBounds();
        let anyPoint = false;

        geojson.features.forEach((feature) => {
          if (!feature.geometry) return;
          if (feature.geometry.type === "LineString") {
            feature.geometry.coordinates.forEach((coord) => {
              bounds.extend(coord as [number, number]);
              anyPoint = true;
            });
          } else if (feature.geometry.type === "Point") {
            bounds.extend(feature.geometry.coordinates as [number, number]);
            anyPoint = true;
          }
        });

        if (anyPoint) {
          console.log("[RouteViewer] Fitting bounds to route");
          map.fitBounds(bounds, {
            padding: 100,
            maxZoom: 15,
            duration: 1500,
            essential: true,
          });
        }
      } catch (boundsErr) {
        console.warn("[RouteViewer] Bounds calculation failed:", boundsErr);
      }

      setMapReady(true);
    });

    return () => {
      console.log("[RouteViewer] Cleanup");
      cancelled = true;
      map.remove();
      mapRef.current = null;
    };
  }, [geojson]);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        backgroundColor: "#0a0a0a",
        overflow: "hidden",
      }}
    >
      <div
        ref={containerRef}
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          width: "100%",
          height: "100%",
        }}
      />

      {/* Loading overlay for map styles / data rendering */}
      {!mapReady && (
        <div
          style={{ position: "absolute", inset: 0, zIndex: 10 }}
          className="flex flex-col items-center justify-center bg-neutral-950/85 backdrop-blur-sm"
        >
          <div className="w-12 h-12 rounded-full border-[3px] border-cyan-500/20 border-t-cyan-400 animate-spin mb-4" />
          <p className="text-sm text-neutral-300 font-medium">Rendering route…</p>
        </div>
      )}

      {/* Legend & Controls overlay */}
      {mapReady && (
        <div className="absolute top-4 left-4 z-20 flex flex-col gap-3 max-w-[240px]">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-neutral-900/95 backdrop-blur-md border border-white/10 rounded-xl text-sm font-medium text-white hover:bg-neutral-800 transition-colors shadow-2xl w-fit"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            New Route
          </Link>

          <div className="bg-neutral-900/95 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-2xl">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-cyan-400" />
              <h2 className="text-white font-semibold text-sm">Shared Route</h2>
            </div>
            
            <div className="space-y-3">
              {/* Legend items */}
              <div className="grid gap-1.5">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0" />
                  <span className="text-[11px] text-neutral-300 font-medium whitespace-nowrap uppercase tracking-wider">Driver Start</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0" />
                  <span className="text-[11px] text-neutral-300 font-medium whitespace-nowrap uppercase tracking-wider">Destination</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-0.5 w-8 rounded-full bg-cyan-400 flex-shrink-0" />
                  <span className="text-[11px] text-neutral-300 font-medium whitespace-nowrap uppercase tracking-wider">Route Path</span>
                </div>
              </div>

              <div className="h-px bg-white/10" />

              <button
                onClick={copyLink}
                className="w-full h-10 flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all border border-white/10 bg-white/5 hover:bg-white/10 text-white"
              >
                {copied ? (
                  <><Check className="w-4 h-4 text-emerald-400" /><span className="text-emerald-400">Copied!</span></>
                ) : (
                  <><Copy className="w-4 h-4" />Copy Link</>
                )}
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-2 px-3 py-2 bg-black/40 backdrop-blur-md border border-white/5 rounded-xl">
             <Info className="w-3 h-3 text-neutral-500" />
             <p className="text-[10px] text-neutral-400">View-only mode</p>
          </div>
        </div>
      )}

      {/* Floating Primary Action: Open in Maps */}
      <AnimatePresence>
        {mapReady && startCoord && endCoord && (
          <motion.div
            initial={{ y: 100, opacity: 0, x: "-50%" }}
            animate={{ y: 0, opacity: 1, x: "-50%" }}
            className="fixed bottom-10 left-1/2 z-40 w-full max-w-[340px] px-6"
          >
            <div className="bg-neutral-900/80 backdrop-blur-2xl border border-white/5 rounded-[2.5rem] p-6 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] flex flex-col items-center gap-5">
              <div className="text-center">
                <h3 className="text-white font-bold text-lg tracking-tight">Ready to navigate?</h3>
                <p className="text-neutral-500 text-xs mt-1">Export this route directly to your device.</p>
              </div>
              <button
                onClick={() => setMapsModalOpen(true)}
                className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-cyan-500 text-neutral-950 font-bold text-sm shadow-[0_8px_20px_rgba(0,229,255,0.3)] hover:bg-cyan-400 hover:shadow-[0_12px_24px_rgba(0,229,255,0.4)] active:scale-95 transition-all"
              >
                <Navigation className="w-5 h-5" />
                Open in Maps
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <OpenInMapsModal
        isOpen={mapsModalOpen}
        onClose={() => setMapsModalOpen(false)}
        startCoord={startCoord}
        endCoord={endCoord}
        waypoints={waypoints}
      />
    </main>
  );
}
