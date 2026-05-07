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

  // Get the base URL for the application (ensure this is set in Vercel/Env)
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://routeshare.vercel.app";
  const routeUrl = `${baseUrl}/route/${id}`;

  let ogImageUrl = `${baseUrl}/default-og.png`; // Fallback image

  // 2. Build the Mapbox Static Image URL if data exists
  if (data?.geojson_data && data.geojson_data.features) {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    
    let polylineString = "";
    
    const startFeature = data.geojson_data.features.find((f: any) => f.geometry.type === "Point" && f.properties?.markerType === "start");
    const endFeature = data.geojson_data.features.find((f: any) => f.geometry.type === "Point" && f.properties?.markerType === "end");

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
      const pathOverlay = polylineString ? `path-5+3B82F6-0.8(${encodeURIComponent(polylineString)})` : "";
      const startMarker = `pin-s+22C55E(${startCoord[0]},${startCoord[1]})`;
      const endMarker = `pin-s+EF4444(${endCoord[0]},${endCoord[1]})`;
      
      const overlays = [startMarker, endMarker, pathOverlay].filter(Boolean).join(",");

      // The URL MUST be absolute for scrapers.
      ogImageUrl = `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/${overlays}/auto/1200x630@2x?access_token=${token}&padding=100`;
    }
  }

  const title = "Shared Route - RouteShare";
  const description = "I created a custom route! Tap to view the interactive map, directions, and path.";

  // 4. Return the comprehensive metadata. Next.js injects this into the <head>
  return {
    metadataBase: new URL(baseUrl),
    title,
    description,
    openGraph: {
      title,
      description,
      url: routeUrl,
      siteName: "RouteShare",
      type: "website",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: "Route preview map showing the start and end destinations",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl], // Twitter prefers the large image format
    },
  };
}

export default function RouteLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
