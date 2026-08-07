import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !publishableKey) {
    return null;
  }

  return { url, publishableKey };
}

export function isSupabaseConfigured() {
  return getSupabaseConfig() !== null;
}

let browserClient: SupabaseClient | null | undefined;

export function getBrowserSupabaseClient() {
  if (browserClient !== undefined) {
    return browserClient;
  }

  const config = getSupabaseConfig();
  if (!config) {
    browserClient = null;
    return null;
  }

  browserClient = createClient(config.url, config.publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return browserClient;
}

export function createServerSupabaseClient(accessToken?: string) {
  const config = getSupabaseConfig();
  if (!config) {
    return null;
  }

  return createClient(config.url, config.publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
  });
}

export function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  return authorization.toLowerCase().startsWith("bearer ")
    ? authorization.slice(7).trim()
    : null;
}
