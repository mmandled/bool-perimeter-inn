import { getSupabase, isSupabaseConfigured } from "./supabase";

export async function isAuthorizedAdmin(): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;

  const { data, error } = await sb.rpc("is_admin");
  if (error) {
    console.error("Admin authorization check failed");
    return false;
  }
  return data === true;
}

export async function signInAdmin(email: string, password: string): Promise<void> {
  const sb = getSupabase();
  if (!sb || !isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    throw new Error("Invalid credentials.");
  }

  const authorized = await isAuthorizedAdmin();
  if (!authorized) {
    await sb.auth.signOut();
    throw new Error("This account is not authorized for admin access.");
  }
}

export async function signOutAdmin(): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.auth.signOut();
}
