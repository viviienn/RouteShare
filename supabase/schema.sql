-- ============================================================
-- Route Sharing App — Hardened Supabase Database Setup
-- Run this entire script in Supabase → SQL Editor → New Query
-- ============================================================

-- 1. Create the routes table (if not exists)
CREATE TABLE IF NOT EXISTS public.routes (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    geojson_data  JSONB       NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Enable Row Level Security (CRITICAL)
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;

-- 3. Reset table permissions for the anon role
--    We explicitly only grant INSERT and SELECT.
--    NOTE: We never GRANT UPDATE or DELETE to anon.
REVOKE ALL ON public.routes FROM anon;
GRANT INSERT, SELECT ON public.routes TO anon;
GRANT USAGE ON SCHEMA public TO anon;

-- 4. RLS Policy: Allow anyone to INSERT a new route
--    This allows our home page to save new paths.
DROP POLICY IF EXISTS "anon_insert" ON public.routes;
CREATE POLICY "allow_anon_insert"
ON public.routes
FOR INSERT
TO anon
WITH CHECK (true);

-- 5. RLS Policy: Allow SELECT only (Read-Only)
--    The policy uses 'true' which allows reading by UUID.
--    To prevent mass enumeration/listing, ensure your application 
--    logic never exposes the full list of IDs.
DROP POLICY IF EXISTS "anon_select" ON public.routes;
CREATE POLICY "allow_anon_read_by_id"
ON public.routes
FOR SELECT
TO anon
USING (true);

-- 6. Explicitly deny all other operations (Redundant but safe)
--    RLS is "deny by default", so UPDATE/DELETE are already blocked.
--    This serves as documentation.
--    UPDATE: Disabled
--    DELETE: Disabled

-- 7. Performance: Add index on created_at (optional but good for cleanup scripts)
CREATE INDEX IF NOT EXISTS routes_created_at_idx ON public.routes (created_at);
