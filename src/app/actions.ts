"use server";

import { supabase } from "@/lib/supabase";
import { headers } from "next/headers";
import { z } from "zod";

// ── Rate Limiter Constants ──────────────────────────────────────────────────
const MAX_SAVES_PER_HOUR = 10;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

// Simple in-memory storage (Note: resets on server restart/re-deploy)
const rateLimits = new Map<string, { count: number; resetAt: number }>();

function getRateLimit(ip: string) {
  const now = Date.now();
  const limit = rateLimits.get(ip);

  if (!limit || now > limit.resetAt) {
    const newLimit = { count: 0, resetAt: now + WINDOW_MS };
    rateLimits.set(ip, newLimit);
    return newLimit;
  }
  return limit;
}

// ── Validation Schema ────────────────────────────────────────────────────────
const PointSchema = z.tuple([z.number(), z.number()]);

const GeoJSONSchema = z.object({
  type: z.literal("FeatureCollection"),
  features: z.array(
    z.object({
      type: z.literal("Feature"),
      geometry: z.discriminatedUnion("type", [
        z.object({
          type: z.literal("LineString"),
          coordinates: z.array(PointSchema),
        }),
        z.object({
          type: z.literal("Point"),
          coordinates: PointSchema,
        }),
      ]),
      properties: z.record(z.string(), z.any()).optional(),
    })
  ),
});

// ── Action ───────────────────────────────────────────────────────────────────
export async function saveRouteAction(payload: unknown) {
  try {
    // 1. Get Client IP
    const headerList = await headers();
    const ip = headerList.get("x-forwarded-for")?.split(",")[0] || "unknown";

    // 2. Rate Limiting Check
    const limit = getRateLimit(ip);
    if (limit.count >= MAX_SAVES_PER_HOUR) {
      const waitMinutes = Math.ceil((limit.resetAt - Date.now()) / 60000);
      throw new Error(`Rate limit exceeded. Please try again in ${waitMinutes} minutes.`);
    }

    // 3. Size Validation (Max 50KB)
    const payloadString = JSON.stringify(payload);
    const payloadSizeKB = payloadString.length / 1024;
    if (payloadSizeKB > 50) {
      throw new Error(`Payload too large (${payloadSizeKB.toFixed(1)}KB). Max 50KB allowed.`);
    }

    // 4. Schema Validation
    const validatedData = GeoJSONSchema.parse(payload);

    // 5. Database Insert
    // We use the same 'anon' client, but it runs on the server.
    // RLS policies will still evaluate this as an anonymous user.
    const { data, error: dbError } = await supabase
      .from("routes")
      .insert([{ geojson_data: validatedData }])
      .select("id")
      .single();

    if (dbError) {
      console.error("[saveRouteAction] Supabase error:", dbError);
      throw new Error(dbError.message);
    }

    // 6. Increment Rate Limit on success
    limit.count += 1;

    return { success: true, id: data.id };
  } catch (err: unknown) {
    console.error("[saveRouteAction] Error:", err);
    if (err instanceof z.ZodError) {
      return { success: false, error: "Invalid GeoJSON structure." };
    }
    return { success: false, error: err instanceof Error ? err.message : "Internal Server Error" };
  }
}
