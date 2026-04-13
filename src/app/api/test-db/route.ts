import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * GET /api/test-db
 * Quick health check — verifies the Supabase connection and that the
 * 'routes' table exists and is accessible by the anon role.
 * Remove or protect this endpoint before going to production.
 */
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("routes")
      .select("id, created_at")
      .limit(1);

    if (error) {
      return NextResponse.json(
        { ok: false, error: { message: error.message, code: error.code, hint: error.hint, details: error.details } },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, rowCount: data?.length ?? 0 });
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
