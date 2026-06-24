import { createAppServerClient } from "@/lib/supabase/server-app";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export async function getApiUser() {
  if (!isSupabaseConfigured()) return null;
  const client = await createAppServerClient();
  if (!client) return null;
  const {
    data: { user },
  } = await client.auth.getUser();
  return user;
}

export async function requireApiUser() {
  const user = await getApiUser();
  if (!user) return null;
  return user;
}
