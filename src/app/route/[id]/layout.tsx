import { Metadata } from "next";
import { supabase } from "@/lib/supabase";

// Google Polyline encoding algorithm
function encodePolyline(coordinates: [number, number][], precision = 5) {
  const factor = Math.pow(10, precision);
  let result = "";
  let lastLat = 0;
  let lastLng = 0;

  for (const coord of coordinates) {
    const lat = Math.round(coord[1] * factor);
    const lng = Math.round(coord[0] * factor);
    
    const dLat = lat - lastLat;
    const dLng = lng - lastLng;
    
    result += encodeValue(dLat) + encodeValue(dLng);
    
    lastLat = lat;
    lastLng = lng;
  }
  return result;
}

function encodeValue(value: number) {
  let val = value < 0 ? ~(value << 1) : value << 1;
  let result = "";
  while (val >= 0x20) {
    result += String.fromCharCode((0x20 | (val & 0x1f)) + 63);
    val >>= 5;
  }
  result += String.fromCharCode(val + 63);
  return result;
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const id = params.id;

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
    
    // Extract the LineString and encode it
    const lineFeature = data.geojson_data.features.find((f: any) => f.geometry.type === "LineString");
    if (lineFeature && lineFeature.geometry.coordinates) {
      polylineString = encodePolyline(lineFeature.geometry.coordinates);
    }
    
    // Inject simplestyle-spec properties for the markers
    const pointFeatures = data.geojson_data.features.filter((f: any) => f.geometry.type === "Point").map((feature: any) => {
      const markerColor = feature.properties?.markerType === "start" ? "#3B82F6" : "#EF4444";
      return {
        ...feature,
        properties: {
          ...feature.properties,
          "marker-color": markerColor,
          "marker-size": "medium",
        },
      };
    });

    const styledGeojson = {
      ...data.geojson_data,
      features: pointFeatures,
    };

    const encodedGeoJson = encodeURIComponent(JSON.stringify(styledGeojson));
    
    // If we have a polyline, use the path- parameter. Otherwise just plot the markers.
    // path-5+00E5FF-1 means stroke width 5, color #00E5FF, opacity 1
    const pathOverlay = polylineString ? `path-5+00E5FF-1(${encodeURIComponent(polylineString)}),` : "";
    
    ogImageUrl = `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/${pathOverlay}geojson(${encodedGeoJson})/auto/1200x630@2x?access_token=${token}&padding=100`;
  }

  // 3. Return the metadata. Next.js injects this into the <head>
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
