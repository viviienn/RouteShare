import { Metadata } from "next";
import { supabase } from "@/lib/supabase";

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
  if (data?.geojson_data) {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    
    // We must stringify and URI encode the GeoJSON so it fits safely in a URL string
    const encodedGeoJson = encodeURIComponent(JSON.stringify(data.geojson_data));
    
    // Construct the URL:
    // /static/geojson({data})/auto/1200x630@2x
    // "auto" automatically zooms and centers the camera to fit the geojson line!
    // "@2x" generates a high-res retina image
    ogImageUrl = `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/geojson(${encodedGeoJson})/auto/1200x630@2x?access_token=${token}&padding=50`;
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
