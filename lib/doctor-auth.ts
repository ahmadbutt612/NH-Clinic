import { createServerSupabaseClient, getBearerToken } from "./supabase";

export async function getAuthorizedDoctor(request: Request) {
  const token = getBearerToken(request);
  if (!token) {
    return { error: "Please sign in again.", status: 401 } as const;
  }

  const supabase = createServerSupabaseClient(token);
  if (!supabase) {
    return { error: "Supabase is not configured yet.", status: 503 } as const;
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) {
    return { error: "Your session has expired. Please sign in again.", status: 401 } as const;
  }

  const { data: profile, error: profileError } = await supabase
    .from("doctor_admins")
    .select("doctor_id, email, doctors(id, slug, name, title, credentials)")
    .eq("email", userData.user.email?.toLowerCase() ?? "")
    .maybeSingle();

  if (profileError || !profile) {
    return { error: "This account is not authorised for the doctor portal.", status: 403 } as const;
  }

  return {
    supabase,
    user: userData.user,
    profile,
    doctorId: profile.doctor_id as string,
  } as const;
}
