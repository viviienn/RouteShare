"use client";

// CSS must be imported before any component code so they apply before
// Mapbox GL tries to render into the container.
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";

import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";

// ── Exported types ──────────────────────────────────────────────────────────
export type ToolMode = "idle" | "set-start" | "set-end" | "draw";

export interface RouteUpdateData {
  geojson: GeoJSON.FeatureCollection | null;
  startMarker: [number, number] | null;
  endMarker: [number, number] | null;
}

interface MapCanvasProps {
  activeMode: ToolMode;
  onModeComplete: () => void;
  onRouteUpdate: (data: RouteUpdateData) => void;
}

export interface MapCanvasHandle {
  clearAll: () => void;
  undoLastPoint: () => void;
  generateAutoRoute: () => Promise<void>;
}

// ── Constants ───────────────────────────────────────────────────────────────
const LONDON: [number, number] = [-0.1276, 51.5074];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DRAW_STYLES: any[] = [
  {
    id: "gl-draw-line-inactive",
    type: "line",
    filter: ["all", ["==", "active", "false"], ["==", "$type", "LineString"]],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": "#00E5FF", "line-width": 6 },
  },
  {
    id: "gl-draw-line-active",
    type: "line",
    filter: ["all", ["==", "active", "true"], ["==", "$type", "LineString"]],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": "#00E5FF", "line-width": 7 },
  },
  {
    id: "gl-draw-vertex-halo-active",
    type: "circle",
    filter: ["all", ["==", "meta", "vertex"], ["==", "$type", "Point"], ["!=", "mode", "static"]],
    paint: { "circle-radius": 14, "circle-color": "#FFFFFF" }, // Increased for mobile touch
  },
  {
    id: "gl-draw-vertex-active",
    type: "circle",
    filter: ["all", ["==", "meta", "vertex"], ["==", "$type", "Point"], ["!=", "mode", "static"]],
    paint: { "circle-radius": 8, "circle-color": "#00E5FF" }, // Increased for mobile touch
  },
  {
    id: "gl-draw-midpoint",
    type: "circle",
    filter: ["all", ["==", "$type", "Point"], ["==", "meta", "midpoint"]],
    paint: { "circle-radius": 7, "circle-color": "#00E5FF", "circle-opacity": 0.7 }, // Increased for mobile touch
  },
];

// ── Marker DOM factory ──────────────────────────────────────────────────────
function createMarkerEl(color: string, label: string): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.style.cssText =
    "display:flex;flex-direction:column;align-items:center;cursor:pointer;user-select:none;touch-action:manipulation;";

  const badge = document.createElement("div");
  badge.textContent = label;
  badge.style.cssText = `
    background:${color};color:white;font-size:12px;font-weight:700;
    padding:5px 12px;border-radius:20px;white-space:nowrap;
    font-family:-apple-system,sans-serif;box-shadow:0 3px 12px rgba(0,0,0,0.5);
    margin-bottom:6px;letter-spacing:0.04em;border:1.5px solid rgba(255,255,255,0.3);
  `; // Increased padding and font size for better mobile reading/touch
  const pin = document.createElement("div");
  pin.style.cssText = `
    width:24px;height:24px;background:${color};border:3px solid white;
    border-radius:50% 50% 50% 0;transform:rotate(-45deg);
    box-shadow:0 3px 10px rgba(0,0,0,0.5);
  `; // Increased pin size slightly
  wrapper.appendChild(badge);
  wrapper.appendChild(pin);
  return wrapper;
}

// ── Component ───────────────────────────────────────────────────────────────
const MapCanvas = forwardRef<MapCanvasHandle, MapCanvasProps>(
  ({ activeMode, onModeComplete, onRouteUpdate }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const drawRef = useRef<MapboxDraw | null>(null);
    const mapReadyRef = useRef(false);

    const startMarkerRef = useRef<mapboxgl.Marker | null>(null);
    const endMarkerRef = useRef<mapboxgl.Marker | null>(null);
    const startCoord = useRef<[number, number] | null>(null);
    const endCoord = useRef<[number, number] | null>(null);

    // Always-current callbacks — avoids stale closures inside event handlers
    const activeModeRef = useRef<ToolMode>(activeMode);
    const onModeCompleteRef = useRef(onModeComplete);
    const onRouteUpdateRef = useRef(onRouteUpdate);
    activeModeRef.current = activeMode;
    onModeCompleteRef.current = onModeComplete;
    onRouteUpdateRef.current = onRouteUpdate;

    // "locating" shows spinner; "ready" reveals the map
    const [locStatus, setLocStatus] = useState<"locating" | "ready">("locating");

    // Emit current draw + marker state to parent
    const emitUpdate = () => {
      const data = drawRef.current?.getAll();
      let snappedGeojson = null;

      // Magnetic Snapping
      if (data && data.features.length > 0) {
        const feature = data.features[0];
        if (feature.geometry.type === "LineString") {
          const coords = [...feature.geometry.coordinates];
          let mutated = false;
          // Snap start if start pin exists
          if (startCoord.current && coords.length > 0) {
            coords[0] = startCoord.current;
            mutated = true;
          }
          // Snap end if end pin exists
          if (endCoord.current && coords.length > 1) {
            coords[coords.length - 1] = endCoord.current;
            mutated = true;
          }

          if (mutated) {
            feature.geometry.coordinates = coords;
            // Update the mapbox draw internal canvas state so the visual line locks onto the pin
            try {
              if (feature.id && drawRef.current) {
                drawRef.current.add(feature);
              }
            } catch { /* ignore sync issues during heavy draw actions */ }
          }
        }
        snappedGeojson = data;
      }

      onRouteUpdateRef.current({
        geojson: snappedGeojson,
        startMarker: startCoord.current,
        endMarker: endCoord.current,
      });
    };

    // ── Imperative API ──────────────────────────────────────────────────────
    useImperativeHandle(ref, () => ({
      clearAll: () => {
        drawRef.current?.deleteAll();
        startMarkerRef.current?.remove();
        startMarkerRef.current = null;
        endMarkerRef.current?.remove();
        endMarkerRef.current = null;
        startCoord.current = null;
        endCoord.current = null;
        onRouteUpdateRef.current({ geojson: null, startMarker: null, endMarker: null });
      },
      undoLastPoint: () => {
        drawRef.current?.trash();
      },
      generateAutoRoute: async () => {
        const start = startCoord.current;
        const end = endCoord.current;
        const map = mapRef.current;
        const draw = drawRef.current;
        
        if (!start || !end || !map || !draw) return;

        try {
          const url = `https://router.project-osrm.org/route/v1/driving/${start[0]},${start[1]};${end[0]},${end[1]}?geometries=geojson&overview=full`;
          const res = await fetch(url);
          const data = await res.json();
          if (data.code === "Ok" && data.routes && data.routes.length > 0) {
            const geometry = data.routes[0].geometry;
            draw.deleteAll(); // Erase manually drawn routes
            draw.add({
              type: "Feature",
              geometry: geometry,
              properties: {}
            });
            emitUpdate(); // Push to parent explicitly
            
            const bounds = new mapboxgl.LngLatBounds();
            bounds.extend(start);
            bounds.extend(end);
            map.fitBounds(bounds, { padding: 60, duration: 1000 });
          }
        } catch (err) {
          console.error("[MapCanvas] OSRM Routing failed:", err);
        }
      }
    }));

    // ── React to activeMode prop changes ────────────────────────────────────
    // Runs whenever the parent changes the active tool
    useEffect(() => {
      if (!mapReadyRef.current || !drawRef.current || !mapRef.current) return;
      const canvas = mapRef.current.getCanvas();

      if (activeMode === "draw") {
        drawRef.current.changeMode("draw_line_string");
      } else {
        // Enforcing 'static' mode prevents hijack of touch gestures (enables pinch to zoom!)
        try { drawRef.current.changeMode("static"); } catch { /* safe */ }
        canvas.style.cursor =
          activeMode === "set-start" || activeMode === "set-end" ? "crosshair" : "";
      }
    }, [activeMode]);

    // ── Map initialisation ───────────────────────────────────────────────────
    useEffect(() => {
      if (typeof window === "undefined") return;

      const container = containerRef.current;
      if (!container) return;

      // Force unmount any zombie Mapbox instances and clear the DOM element entirely
      if (mapRef.current) {
        try { mapRef.current.remove(); } catch (e) { /* ignore */ }
        mapRef.current = null;
      }
      container.innerHTML = "";

      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      if (!token) {
        console.error("[MapCanvas] NEXT_PUBLIC_MAPBOX_TOKEN is not set");
        setLocStatus("ready");
        return;
      }

      // ── Cancellation flag ─────────────────────────────────────────────────
      // Prevents async callbacks (geolocation, map load) from touching state
      // after React unmounts this component (important in dev Strict Mode).
      let cancelled = false;

      mapboxgl.accessToken = token;

      // ── Initialize map immediately with London fallback ───────────────────
      const map = new mapboxgl.Map({
        container,
        style: "mapbox://styles/mapbox/dark-v11",
        center: LONDON,
        zoom: 12,
        pitch: 20,
        attributionControl: false,
        clickTolerance: 15, // Greatly increased to prevent mobile wobbles acting as pans
      });
      mapRef.current = map;

      // Ensure map resizes correctly if container dimensions change 
      // (crucial for Framer Motion PageTransitions and layout changes)
      const resizeObserver = new ResizeObserver(() => {
        map.resize();
      });
      resizeObserver.observe(container);

      // Failsafe: Hard trigger a resize just after the 400ms Framer Motion mounting animation finishes
      const fallbackResizeTimer = setTimeout(() => {
        map.resize();
      }, 450);

      // ── MapboxDraw ────────────────────────────────────────────────────────
      const draw = new MapboxDraw({
        displayControlsDefault: false,
        defaultMode: "simple_select",
        styles: DRAW_STYLES,
        touchEnabled: true,
        touchBuffer: 40, // Increased buffer area around points for touch
        clickBuffer: 15, // Increased buffer area around points for mouse
      });
      drawRef.current = draw;
      map.addControl(draw as unknown as mapboxgl.IControl);
      map.addControl(new mapboxgl.NavigationControl(), "top-right");
      map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");

      // ── After style is fully loaded ───────────────────────────────────────
      map.on("load", () => {
        if (cancelled) return;
        console.log("[MapCanvas] map loaded");
        mapReadyRef.current = true;

        // Apply any mode that was set before the map finished loading
        if (activeModeRef.current === "draw") {
          draw.changeMode("draw_line_string");
        } else if (
          activeModeRef.current === "set-start" ||
          activeModeRef.current === "set-end"
        ) {
          map.getCanvas().style.cursor = "crosshair";
        }

        // ── Geolocation (post-load) ─────────────────────────────────────────
        // Requested AFTER map load so there is no race condition.
        // Wrapped in try-catch so any unexpected geolocation API error
        // still lets the map show with the London fallback.
        try {
          if (typeof navigator !== "undefined" && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                if (cancelled) return;
                console.log("[MapCanvas] geolocation granted", pos.coords.latitude, pos.coords.longitude);
                map.flyTo({
                  center: [pos.coords.longitude, pos.coords.latitude],
                  zoom: 13,
                  duration: 1800,
                  essential: true,
                });
                setLocStatus("ready");
              },
              (err) => {
                if (cancelled) return;
                console.warn("[MapCanvas] geolocation denied/failed:", err.message);
                setLocStatus("ready");
              },
              { timeout: 8000, maximumAge: 60_000 }
            );
          } else {
            setLocStatus("ready");
          }
        } catch (geoErr) {
          console.warn("[MapCanvas] geolocation API error:", geoErr);
          if (!cancelled) setLocStatus("ready");
        }
      });



      // ── Map click & touch → place marker ──────────────────────────────────
      const handleMarkerPlace = (e: mapboxgl.MapMouseEvent | mapboxgl.MapTouchEvent) => {
        const mode = activeModeRef.current;
        let didPlaceMarker = false;

        if (mode === "set-start") {
          startMarkerRef.current?.remove();
          startMarkerRef.current = new mapboxgl.Marker({
            element: createMarkerEl("#3B82F6", "Driver Start"),
            anchor: "bottom",
            offset: [0, 5],
          })
            .setLngLat(e.lngLat)
            .addTo(map);
          startCoord.current = [e.lngLat.lng, e.lngLat.lat];
          emitUpdate();
          onModeCompleteRef.current();
        } else if (mode === "set-end") {
          endMarkerRef.current?.remove();
          endMarkerRef.current = new mapboxgl.Marker({
            element: createMarkerEl("#EF4444", "Destination"),
            anchor: "bottom",
            offset: [0, 5],
          })
            .setLngLat(e.lngLat)
            .addTo(map);
          endCoord.current = [e.lngLat.lng, e.lngLat.lat];
          emitUpdate();
          onModeCompleteRef.current();
        }
      };

      map.on("click", handleMarkerPlace);
      map.on("touchstart", handleMarkerPlace);

      // ── Draw events ───────────────────────────────────────────────────────
      map.on("draw.create", () => {
        emitUpdate();
        onModeCompleteRef.current(); // back to idle after finishing the line
      });
      map.on("draw.update", emitUpdate);
      map.on("draw.delete", emitUpdate);

      // ── Cleanup ───────────────────────────────────────────────────────────
      return () => {
        console.log("[MapCanvas] cleanup");
        cancelled = true;
        clearTimeout(fallbackResizeTimer);
        resizeObserver.disconnect();
        map.remove();
        mapRef.current = null;
        mapReadyRef.current = false;
      };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Render ───────────────────────────────────────────────────────────────
    // Inline styles are used alongside Tailwind as a hard guarantee that the
    // map container always has non-zero computed dimensions. Mapbox GL will
    // silently refuse to initialise if width or height computes to 0px.
    return (
      <div className="absolute inset-0 w-screen h-[100dvh] overflow-hidden">
        {/* Mapbox GL mounts into this div — must have explicit pixel dimensions */}
        <div
          ref={containerRef}
          className="absolute inset-0 w-full h-full"
        />

        {/* Spinner: shown while map loads and awaiting geolocation */}
        {locStatus === "locating" && (
          <div
            style={{ position: "absolute", inset: 0, zIndex: 30 }}
            className="flex flex-col items-center justify-center bg-neutral-950/90 backdrop-blur-sm"
          >
            <div className="w-11 h-11 rounded-full border-[3px] border-cyan-500/25 border-t-cyan-400 animate-spin mb-4" />
            <p className="text-sm font-medium text-neutral-300">Getting your location…</p>
            <p className="text-xs text-neutral-500 mt-1">Allow location access for best results</p>
          </div>
        )}
      </div>
    );
  }
);

MapCanvas.displayName = "MapCanvas";
export default MapCanvas;
