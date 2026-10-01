import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client. Bypasses RLS, so only use it on the server AFTER
 * checking the caller's permissions (see lib/api/auth.ts).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Add them to .env.local."
    );
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export type AdminClient = ReturnType<typeof createAdminClient>;
