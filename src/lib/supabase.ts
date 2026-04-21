import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'placeholder';

// Publishable key: safe to use in both Client and Server Components.
// RLS policies on your Supabase tables govern what this client can access.
export const supabase = createClient(supabaseUrl, supabasePublishableKey);
