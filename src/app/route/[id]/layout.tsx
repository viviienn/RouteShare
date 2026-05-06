import { Metadata } from "next";
import { supabase } from "@/lib/supabase";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;

  // 1. Fetch the route data on the Server
  const { data } = await supabase
    .from("routes")
    .select("geojson_data")
    .eq("id", id)
    .single();

  let ogImageUrl = "https://yourdomain.com/default-og.png"; // Fallback image

  // 2. Build the Mapbox Static Image URL if data exists
  if (data?.geojson_data && data.geojson_data.features) {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    
    let polylineString = "";
    
    // Check if the route has a pre-existing LineString
    const lineFeature = data.geojson_data.features.find((f: any) => f.geometry.type === "LineString");
    
    const startFeature = data.geojson_data.features.find((f: any) => f.geometry.type === "Point" && f.properties?.markerType === "start");
    const endFeature = data.geojson_data.features.find((f: any) => f.geometry.type === "Point" && f.properties?.markerType === "end");

    if (lineFeature && lineFeature.geometry.coordinates) {
      // If we have a LineString, we can encode it or we can just fetch from API to get it encoded directly.
      // For simplicity, if we don't have encodePolyline, we can just fetch it anyway or rely on points.
      // But we removed encodePolyline, so we will fetch the polyline directly!
    }

    if (startFeature && endFeature) {
      const startCoord = startFeature.geometry.coordinates;
      const endCoord = endFeature.geometry.coordinates;
      
      try {
        // Fetch encoded polyline directly from Mapbox Directions API on the server
        const dirRes = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/driving/${startCoord[0]},${startCoord[1]};${endCoord[0]},${endCoord[1]}?geometries=polyline&access_token=${token}`
        );
        const dirData = await dirRes.json();
        if (dirData.code === "Ok" && dirData.routes && dirData.routes.length > 0) {
          polylineString = dirData.routes[0].geometry;
        }
      } catch (err) {
        console.error("Error fetching polyline for OG image:", err);
      }

      // 3. Mapbox Static Images API supports precise overlays
      // pin-s+color(lng,lat) for markers, path-width+color-opacity(encodedPolyline) for paths
      const pathOverlay = polylineString ? `path-5+00E5FF-1(${encodeURIComponent(polylineString)})` : "";
      const startMarker = `pin-s+3B82F6(${startCoord[0]},${startCoord[1]})`;
      const endMarker = `pin-s+EF4444(${endCoord[0]},${endCoord[1]})`;
      
      const overlays = [startMarker, endMarker, pathOverlay].filter(Boolean).join(",");

      ogImageUrl = `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/${overlays}/auto/1200x630@2x?access_token=${token}&padding=100`;
    }
  }

  // 4. Return the metadata. Next.js injects this into the <head>
  return {
    title: "View My Route",
    description: "I created a custom route. Tap to view it on the map!",
    openGraph: {
      title: "Shared Route",
      description: "Interactive map route.",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: "Map route preview",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      images: [ogImageUrl],
    },
  };
}

export default function RouteLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
