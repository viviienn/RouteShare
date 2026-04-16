"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MapCanvas, {
  type MapCanvasHandle,
  type RouteUpdateData,
  type ToolMode,
} from "@/components/MapCanvas";
import Link from "next/link";
import { saveRouteAction } from "./actions";
import {
  Share2, Check, Copy, AlertCircle, Loader2,
  PencilLine, Trash2, MapPin, Crosshair, ChevronDown, ChevronUp, Route, Settings, FileText
} from "lucide-react";

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
  const boundsRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const [activeTool, setActiveTool] = useState<ToolMode>("idle");
  const [activeTab, setActiveTab] = useState<"tools" | "settings">("tools");
  const [routeMode, setRouteMode] = useState<"automatic" | "manual">("automatic");
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const [isDesktop, setIsDesktop] = useState(true);
  const [routeData, setRouteData] = useState<RouteUpdateData | null>(null);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
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
      {routeMode === "manual" && (
        <ToolBtn
          icon={<PencilLine className="w-5 h-5" style={{ color: "#00E5FF" }} />}
          label="Draw Route"
          active={activeTool === "draw"}
          disabled={saved}
          accentColor="#00C2D4"
          onClick={() => selectTool("draw")}
        />
      )}

      <div className="h-px bg-white/10 mx-1 my-2" />

      {routeMode === "manual" && (
        <ToolBtn
          icon={<Crosshair className="w-5 h-5 text-neutral-400" />}
          label="Undo Point"
          active={false}
          disabled={saved || !hasRoute}
          accentColor="#71717a"
          onClick={() => mapRef.current?.undoLastPoint()}
        />
      )}
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

  const renderBottomActions = () => (
    <div className="flex flex-col gap-3 w-full pointer-events-auto">
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

      {/* Generate Route (Only Automatic mode) */}
      {!saved && routeMode === "automatic" && !hasRoute && (
        <button
          onClick={() => mapRef.current?.generateAutoRoute()}
          disabled={!routeData?.startMarker || !routeData?.endMarker}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-blue-600 text-white font-bold text-base transition-all shadow-2xl shadow-blue-500/25"
        >
          <Route className="w-5 h-5" />
          Generate Route
        </button>
      )}

      {/* Generate button / Share link */}
      {!saved && (!hasRoute && routeMode === "automatic" ? null : (
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
      ))}
      
      {saved && (
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
  );

  const renderSettings = () => (
    <div className="px-2 py-4 flex flex-col gap-5">
      <div>
        <p className="text-sm font-semibold text-white mb-3">Route Maker Mode</p>
        <div className="flex bg-black/40 rounded-xl p-1.5 border border-white/10 gap-1.5">
          <button 
           onClick={() => {
             setRouteMode("automatic");
             if (activeTool === "draw") setActiveTool("idle");
           }}
           className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${routeMode === "automatic" ? "bg-cyan-500/20 text-cyan-400 shadow-md" : "text-neutral-400 hover:text-white"}`}>
            Automatic
          </button>
          <button 
           onClick={() => setRouteMode("manual")}
           className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${routeMode === "manual" ? "bg-cyan-500/20 text-cyan-400 shadow-md" : "text-neutral-400 hover:text-white"}`}>
            Manual
          </button>
        </div>
        <p className="text-[11px] text-neutral-500 mt-3 leading-relaxed px-1">
          <strong className="text-neutral-300">Automatic:</strong> Fetches real driving routes from the road network. <br/>
          <strong className="text-neutral-300 mt-1 block">Manual:</strong> Allows drawing arbitrary custom lines anywhere off-road.
        </p>
      </div>

      <div className="h-px bg-white/10 w-full" />

      <div>
        <Link 
          href="/changelog" 
          className="flex items-center gap-3 w-full px-3 py-3 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 transition-all text-neutral-300 hover:text-white"
        >
          <FileText className="w-4 h-4 text-neutral-400" />
          <span className="text-sm font-medium">View Changelog</span>
        </Link>
      </div>
    </div>
  );

  return (
    <main ref={boundsRef} className="w-screen h-[100dvh] relative overflow-hidden bg-neutral-950">
      {/* ── Full-screen map ─────────────────────────────────────────────── */}
      <MapCanvas
        ref={mapRef}
        activeMode={activeTool}
        onModeComplete={handleModeComplete}
        onRouteUpdate={handleRouteUpdate}
      />

      {/* ── Unified Floating Toolbox ────────────────────────────────────── */}
      <motion.div
        drag={isDesktop}
        dragConstraints={boundsRef}
        dragMomentum={false}
        layout
        onDragStart={() => { isDragging.current = true; }}
        onDragEnd={() => { setTimeout(() => { isDragging.current = false; }, 50); }}
        className={`absolute z-30 ${isDesktop ? 'left-4 top-20 cursor-grab active:cursor-grabbing' : 'left-4 right-4 bottom-[env(safe-area-inset-bottom,16px)]'} w-auto md:w-[320px] flex flex-col bg-neutral-900/95 backdrop-blur-xl border border-white/10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.4)] overflow-hidden`}
      >
        {/* Header / Toggle */}
        <motion.div 
          layout="position"
          onClick={() => {
            if (isDragging.current) return;
            setIsMenuOpen(!isMenuOpen);
          }}
          className={`flex items-center justify-between w-full px-5 py-4 cursor-pointer select-none ${isMenuOpen ? 'bg-neutral-900/50' : 'bg-transparent'}`}
        >
          <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest">
            RouteShare Menu
          </p>
          <button className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 transition-colors pointer-events-none">
            <motion.div animate={{ rotate: isMenuOpen ? 0 : -180 }} transition={{ duration: 0.3 }}>
              <ChevronDown className="w-4 h-4 text-neutral-300" />
            </motion.div>
          </button>
        </motion.div>

        {/* Expandable Content */}
        <AnimatePresence initial={false}>
          {isMenuOpen && (
            <motion.div
              layout
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="flex-col flex"
            >
              <div className="flex border-b border-white/10 bg-neutral-900/50">
                 <button onClick={() => setActiveTab("tools")} className={`flex-1 py-3 text-[11px] font-bold uppercase tracking-widest transition-colors ${activeTab === "tools" ? "text-cyan-400 border-b-2 border-cyan-400 bg-white/5" : "text-neutral-500 hover:text-neutral-300"}`}>Tools</button>
                 <button onClick={() => setActiveTab("settings")} className={`flex-1 py-3 text-[11px] font-bold uppercase tracking-widest transition-colors ${activeTab === "settings" ? "text-cyan-400 border-b-2 border-cyan-400 bg-white/5" : "text-neutral-500 hover:text-neutral-300"}`}>Settings</button>
              </div>

              <div className="max-h-[60vh] md:max-h-[75vh] flex flex-col pt-1.5">
                {/* Scrollable Area */}
                <div className="flex-1 overflow-y-auto px-3 pb-3 flex flex-col gap-1.5 custom-scrollbar">
                  {activeTab === "tools" ? renderToolButtons() : renderSettings()}
                </div>
                
                {/* Docked Bottom Actions (Share, Error, Hint) */}
                <div className="flex-shrink-0 px-4 pt-4 pb-4 bg-black/20 border-t border-white/5">
                  {renderBottomActions()}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </main>
  );
}
