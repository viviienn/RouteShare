"use client";

import { useState, useRef, useCallback } from "react";
import MapCanvas, {
  type MapCanvasHandle,
  type RouteUpdateData,
  type ToolMode,
} from "@/components/MapCanvas";
import { saveRouteAction } from "./actions";
import {
  Share2, Check, Copy, AlertCircle, Loader2,
  PencilLine, Trash2, MapPin, Crosshair,
} from "lucide-react";
import { Drawer } from "vaul";

// ── Tool palette button ──────────────────────────────────────────────────────
function ToolBtn({
  icon,
  label,
  active,
  disabled,
  accentColor,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  disabled?: boolean;
  accentColor: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`
        group relative w-full flex items-center gap-4 px-4 py-3 min-h-[48px] rounded-xl text-[15px] font-medium
        transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed
        ${active
          ? "text-neutral-950 shadow-lg"
          : "text-neutral-300 hover:text-white hover:bg-white/10 active:bg-white/15"
        }
      `}
      style={active ? { background: accentColor, boxShadow: `0 4px 20px ${accentColor}55` } : {}}
    >
      <span className="flex-shrink-0 scale-110">{icon}</span>
      <span className="whitespace-nowrap">{label}</span>
      {active && (
        <span className="ml-auto w-2 h-2 rounded-full bg-neutral-950/50" />
      )}
    </button>
  );
}

// ── Hint text per tool ───────────────────────────────────────────────────────
const HINTS: Record<ToolMode, string | null> = {
  idle: null,
  "set-start": "Click anywhere on the map to place the Driver Start",
  "set-end": "Click anywhere on the map to place the Destination",
  draw: "Click to drop route points · Double-click to finish",
};

// ── Page ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const mapRef = useRef<MapCanvasHandle>(null);

  const [activeTool, setActiveTool] = useState<ToolMode>("idle");
  const [routeData, setRouteData] = useState<RouteUpdateData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [shareId, setShareId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasRoute = !!(routeData?.geojson && routeData.geojson.features.length > 0);

  const selectTool = (tool: ToolMode) => {
    // Toggle off if already active
    setActiveTool((prev) => (prev === tool ? "idle" : tool));
  };

  const handleRouteUpdate = useCallback((data: RouteUpdateData) => {
    setRouteData(data);
    setError(null);
    setSaved(false);
    setShareId(null);
  }, []);

  // Called by MapCanvas after marker placement or draw completion
  const handleModeComplete = useCallback(() => {
    setActiveTool("idle");
  }, []);

  const handleClearAll = () => {
    mapRef.current?.clearAll();
    setSaved(false);
    setShareId(null);
    setError(null);
    setRouteData(null);
    setActiveTool("idle");
  };

  const handleSaveRoute = async () => {
    if (!hasRoute) {
      setError("Draw a route on the map first.");
      return;
    }

    setError(null);
    setIsSaving(true);

    // Build combined FeatureCollection: route LineStrings + optional marker Points
    const features: GeoJSON.Feature[] = [...(routeData!.geojson!.features)];
    if (routeData!.startMarker) {
      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: routeData!.startMarker },
        properties: { markerType: "start" },
      });
    }
    if (routeData!.endMarker) {
      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: routeData!.endMarker },
        properties: { markerType: "end" },
      });
    }

    const combined: GeoJSON.FeatureCollection = { type: "FeatureCollection", features };

    try {
      const result = await saveRouteAction(combined);

      if (!result.success) {
        throw new Error(result.error);
      }

      setShareId(result.id);
      setSaved(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save route.");
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = () => {
    if (!shareId) return;
    navigator.clipboard.writeText(`${window.location.origin}/route/${shareId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderToolButtons = () => (
    <>
      <ToolBtn
        icon={<MapPin className="w-5 h-5" style={{ color: "#3B82F6" }} />}
        label="Driver Start"
        active={activeTool === "set-start"}
        disabled={saved}
        accentColor="#3B82F6"
        onClick={() => selectTool("set-start")}
      />
      <ToolBtn
        icon={<MapPin className="w-5 h-5" style={{ color: "#EF4444" }} />}
        label="Destination"
        active={activeTool === "set-end"}
        disabled={saved}
        accentColor="#EF4444"
        onClick={() => selectTool("set-end")}
      />
      <ToolBtn
        icon={<PencilLine className="w-5 h-5" style={{ color: "#00E5FF" }} />}
        label="Draw Route"
        active={activeTool === "draw"}
        disabled={saved}
        accentColor="#00C2D4"
        onClick={() => selectTool("draw")}
      />

      <div className="h-px bg-white/10 mx-1 my-2" />

      <ToolBtn
        icon={<Crosshair className="w-5 h-5 text-neutral-400" />}
        label="Undo Point"
        active={false}
        disabled={saved || !hasRoute}
        accentColor="#71717a"
        onClick={() => mapRef.current?.undoLastPoint()}
      />
      <ToolBtn
        icon={<Trash2 className="w-5 h-5 text-red-400" />}
        label="Clear All"
        active={false}
        disabled={!hasRoute && !routeData?.startMarker && !routeData?.endMarker}
        accentColor="#EF4444"
        onClick={handleClearAll}
      />
    </>
  );

  return (
    <main className="w-screen h-[100dvh] relative overflow-hidden bg-neutral-950">
      {/* ── Full-screen map ─────────────────────────────────────────────── */}
      <MapCanvas
        ref={mapRef}
        activeMode={activeTool}
        onModeComplete={handleModeComplete}
        onRouteUpdate={handleRouteUpdate}
      />

      {/* ── Desktop floating tool palette (hidden on mobile) ────────────── */}
      <div className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-20 flex-col gap-1 bg-neutral-950/90 backdrop-blur-md border border-white/10 rounded-2xl p-3 shadow-2xl min-w-[200px]">
        <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest px-2 pt-1 pb-1">
          Tools
        </p>
        {renderToolButtons()}
      </div>

      {/* ── Mobile Swipeable Drawer (hidden on desktop) ─────────────────── */}
      <div className="md:hidden">
        <Drawer.Root open={true} dismissible={false} modal={false} snapPoints={["160px", "450px"]} activeSnapPoint="160px">
          <Drawer.Portal>
            {/* The overlay is intentionally omitted so the map remains interactive behind the drawer */}
            <Drawer.Content className="fixed flex flex-col bg-neutral-900 border-t border-white/10 bottom-0 left-0 right-0 h-full max-h-[90%] rounded-t-3xl focus:outline-none z-30 pb-10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
              <Drawer.Handle className="bg-neutral-600 w-12 h-1.5 rounded-full mx-auto mt-4 mb-3" />
              <div className="flex-1 overflow-y-auto px-5 pb-40 flex flex-col gap-1.5">
                <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest px-1 py-1">Tools</p>
                {renderToolButtons()}
              </div>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      </div>

      {/* ── Bottom bar (Docked Actions) ─────────────────────────────────── */}
      <div className="absolute bottom-0 inset-x-0 z-50 p-4 pointer-events-none pb-[env(safe-area-inset-bottom,16px)]">
        <div className="max-w-md mx-auto flex flex-col gap-3 pointer-events-auto">

          {/* Active tool hint */}
          {HINTS[activeTool] && (
            <div className="flex items-center gap-2 bg-neutral-950/85 backdrop-blur-md border border-cyan-500/30 text-cyan-300 text-sm px-4 py-2.5 rounded-xl shadow-lg">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse flex-shrink-0" />
              {HINTS[activeTool]}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-xl text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p className="leading-snug">{error}</p>
            </div>
          )}

          {/* Generate button / Share link */}
          {!saved ? (
            <button
              onClick={handleSaveRoute}
              disabled={isSaving || !hasRoute}
              className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-emerald-500 text-white font-bold text-base transition-all shadow-2xl shadow-emerald-500/25"
            >
              {isSaving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Share2 className="w-6 h-6" />
              )}
              {isSaving ? "Saving…" : "Generate Share Link"}
            </button>
          ) : (
            <div className="flex flex-col gap-3 bg-neutral-950/90 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-2xl">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                  Route saved — link ready
                </p>
              </div>
              <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl p-1.5">
                <input
                  readOnly
                  type="text"
                  value={`${typeof window !== "undefined" ? window.location.origin : ""}/route/${shareId}`}
                  onClick={(e) => e.currentTarget.select()}
                  className="bg-transparent text-sm text-neutral-300 w-full outline-none px-2 cursor-text"
                />
                <button
                  onClick={copyToClipboard}
                  className={`flex-shrink-0 flex items-center gap-1.5 py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
                    copied
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-indigo-600 hover:bg-indigo-500 text-white"
                  }`}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <button
                onClick={handleClearAll}
                className="text-xs text-neutral-500 hover:text-neutral-400 underline underline-offset-2 transition-colors w-fit mx-auto"
              >
                Draw another route
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
