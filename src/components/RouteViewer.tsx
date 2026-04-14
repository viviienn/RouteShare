"use client";

// CSS must be imported before any component code so they apply before
// Mapbox GL tries to render into the container.
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";

import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { Copy, Check, ArrowLeft, Info } from "lucide-react";
import Link from "next/link";

interface RouteViewerProps {
  geojson: GeoJSON.FeatureCollection;
}

// ── Marker DOM factory ──────────────────────────────────────────────────────
function createMarkerEl(color: string, label: string): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.style.cssText =
    "display:flex;flex-direction:column;align-items:center;user-select:none;pointer-events:none;padding:10px;";
  const badge = document.createElement("div");
  badge.textContent = label;
  badge.style.cssText = `
    background:${color};color:white;font-size:12px;font-weight:700;
    padding:5px 12px;border-radius:20px;white-space:nowrap;
    font-family:-apple-system,sans-serif;box-shadow:0 4px 15px rgba(0,0,0,0.4);
    margin-bottom:6px;letter-spacing:0.02em;border:2px solid rgba(255,255,255,0.4);
    backdrop-filter:blur(4px);
  `;
  const pin = document.createElement("div");
  pin.style.cssText = `
    width:24px;height:24px;background:${color};border:3px solid white;
    border-radius:50% 50% 50% 0;transform:rotate(-45deg);
    box-shadow:0 4px 12px rgba(0,0,0,0.4);
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
  const [isLegendOpen, setIsLegendOpen] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      console.error("[RouteViewer] NEXT_PUBLIC_MAPBOX_TOKEN is missing");
      return;
    }

    let cancelled = false;
    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [-0.1276, 51.5074],
      zoom: 12,
      pitch: 20,
      attributionControl: false,
    });
    mapRef.current = map;

    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");

    map.on("load", () => {
      if (cancelled) return;

      const lineFeatures = geojson.features.filter(
        (f) => f.geometry && f.geometry.type === "LineString"
      );
      const startFeature = geojson.features.find(
        (f) => f.geometry?.type === "Point" && f.properties?.markerType === "start"
      );
      const endFeature = geojson.features.find(
        (f) => f.geometry?.type === "Point" && f.properties?.markerType === "end"
      );

      if (lineFeatures.length > 0) {
        map.addSource("route", {
          type: "geojson",
          data: { type: "FeatureCollection", features: lineFeatures },
        });

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

        map.addLayer({
          id: "route-line",
          type: "line",
          source: "route",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": "#00E5FF", "line-width": 6 },
        });
      }

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
          map.fitBounds(bounds, {
            padding: { top: 80, bottom: 220, left: 40, right: 40 },
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
    <main className="w-screen h-screen relative overflow-hidden bg-neutral-950 flex flex-col">
      <div
        ref={containerRef}
        className="absolute inset-0 z-0"
      />

      {/* Loading overlay */}
      {!mapReady && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-neutral-950/90 backdrop-blur-sm">
          <div className="w-12 h-12 rounded-full border-4 border-cyan-500/20 border-t-cyan-400 animate-spin mb-4" />
          <p className="text-sm text-neutral-300 font-medium">Loading shareable route…</p>
        </div>
      )}

      {/* ── Overlay UI ─────────────────────────────────────────────────── */}
      {mapReady && (
        <>
          {/* Top-left: Action button */}
          <div className="absolute top-[env(safe-area-inset-top,16px)] left-4 z-40">
            <Link
              href="/"
              className="group flex items-center gap-2 px-4 py-2.5 bg-neutral-900/90 backdrop-blur-xl border border-white/10 rounded-2xl text-sm font-bold text-white hover:bg-neutral-800 transition-all shadow-2xl active:scale-95"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              New Route
            </Link>
          </div>

          {/* Bottom-center/Left: Legend & Controls */}
          <div className={`
            absolute z-40 transition-all duration-500 ease-in-out
            left-4 right-4 md:right-auto md:max-w-[300px]
            ${isLegendOpen 
              ? "bottom-[env(safe-area-inset-bottom,16px)]" 
              : "bottom-[-400px]"
            }
          `}>
            {/* Collapse Toggle (Mobile only) */}
            <button 
              onClick={() => setIsLegendOpen(!isLegendOpen)}
              className="md:hidden absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-neutral-900/95 backdrop-blur-xl border border-white/10 rounded-full text-[10px] font-bold uppercase tracking-wider text-neutral-400 shadow-xl"
            >
              {isLegendOpen ? "Hide Info" : "Show Route Info"}
            </button>

            <div className="bg-neutral-900/95 backdrop-blur-2xl border border-white/10 rounded-[24px] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] ring-1 ring-white/5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
                  <h2 className="text-white font-bold text-base">Route Details</h2>
                </div>
                <button 
                  onClick={() => setIsLegendOpen(false)}
                  title="Hide"
                  className="hidden md:block text-neutral-500 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 rotate-[-90deg]" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-3.5 h-3.5 rounded-full bg-blue-500 shadow-lg shadow-blue-500/20 flex-shrink-0" />
                    <span className="text-xs text-neutral-300 font-semibold uppercase tracking-wider">Starting Point</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-3.5 h-3.5 rounded-full bg-red-500 shadow-lg shadow-red-500/20 flex-shrink-0" />
                    <span className="text-xs text-neutral-300 font-semibold uppercase tracking-wider">Destination</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-1 w-10 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.4)] flex-shrink-0" />
                    <span className="text-xs text-neutral-300 font-semibold uppercase tracking-wider">The Route</span>
                  </div>
                </div>

                <div className="h-px bg-white/5" />

                <button
                  onClick={copyLink}
                  className="w-full h-12 flex items-center justify-center gap-2.5 rounded-xl text-sm font-bold transition-all bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 active:scale-[0.98]"
                >
                  {copied ? (
                    <><Check className="w-4 h-4 text-emerald-300" /><span className="text-emerald-300">Link Copied!</span></>
                  ) : (
                    <><Copy className="w-4 h-4" />Copy Share Link</>
                  )}
                </button>

                <div className="flex items-center gap-2 pt-1 border-t border-white/5 mt-2">
                   <Info className="w-3.5 h-3.5 text-neutral-500" />
                   <p className="text-[10px] text-neutral-400 font-medium">You are currently in view-only mode</p>
                </div>
              </div>
            </div>
          </div>

          {/* Mini toggle for desktop when hidden */}
          {!isLegendOpen && (
            <button 
              onClick={() => setIsLegendOpen(true)}
              className="absolute bottom-6 left-4 z-40 p-3 bg-neutral-900 border border-white/10 rounded-2xl text-white hover:bg-neutral-800 transition-all shadow-2xl animate-in fade-in slide-in-from-bottom-2"
            >
              <Info className="w-5 h-5" />
            </button>
          )}
        </>
      )}
    </main>
  );
}
