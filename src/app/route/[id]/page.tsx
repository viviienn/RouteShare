"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import RouteViewer from "@/components/RouteViewer";
import Link from "next/link";
import { ArrowLeft, AlertCircle, Loader2 } from "lucide-react";

export default function RoutePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [geojson, setGeojson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError("Invalid route URL.");
      setLoading(false);
      return;
    }

    // Basic UUID format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      setError("Invalid route ID format.");
      setLoading(false);
      return;
    }

    async function fetchRoute() {
      try {
        const { data, error: dbErr } = await supabase
          .from("routes")
          .select("geojson_data")
          .eq("id", id)
          .single();

        if (dbErr) {
          console.error("[RoutePage] Supabase fetch error:", dbErr);
          const parts = [dbErr.message];
          if (dbErr.hint) parts.push(`Hint: ${dbErr.hint}`);
          if (dbErr.code) parts.push(`(code: ${dbErr.code})`);
          setError(parts.join(" — "));
        } else if (!data?.geojson_data) {
          console.warn("[RoutePage] Route found but geojson_data is missing");
          setError("Route data is empty or corrupted.");
        } else {
          console.log("[RoutePage] Successfully fetched route data");
          setGeojson(data.geojson_data as GeoJSON.FeatureCollection);
        }
      } catch (err) {
        console.error("[RoutePage] Unexpected error:", err);
        setError(String(err));
      } finally {
        setLoading(false);
      }
    }

    fetchRoute();
  }, [id]);

  if (loading) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-neutral-950">
        <div className="w-12 h-12 rounded-full border-[3px] border-cyan-500/20 border-t-cyan-400 animate-spin mb-4" />
        <p className="text-neutral-300 font-medium">Loading route…</p>
      </div>
    );
  }

  if (error || !geojson) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-neutral-950 p-6">
        <div className="max-w-sm w-full bg-neutral-900 border border-red-500/20 rounded-2xl p-6 text-center shadow-2xl">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <h1 className="text-white font-bold text-lg mb-2">Route Not Found</h1>
          <p className="text-sm text-neutral-400 mb-5 leading-relaxed">
            {error ?? "This route doesn't exist or may have been removed."}
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Create a New Route
          </Link>
        </div>
      </div>
    );
  }

  return <RouteViewer geojson={geojson} />;
}
