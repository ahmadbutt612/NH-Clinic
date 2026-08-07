import { DOCTORS } from "@/lib/clinic";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const doctorId = url.searchParams.get("doctorId") ?? "";
  const date = url.searchParams.get("date") ?? "";

  if (!DOCTORS.some((doctor) => doctor.id === doctorId)) {
    return Response.json({ error: "Please select a valid doctor." }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ error: "Please select a valid date." }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  if (!supabase) {
    return Response.json(
      { error: "Online booking is being connected. Please contact the clinic on WhatsApp." },
      { status: 503 },
    );
  }

  const { data, error } = await supabase.rpc("get_available_slots", {
    p_doctor_id: doctorId,
    p_date: date,
  });

  if (error) {
    console.error("Availability lookup failed", error.message);
    const setupMissing = /function .*get_available_slots.* does not exist/i.test(error.message);
    return Response.json(
      {
        error: setupMissing
          ? "The booking database still needs its one-time setup."
          : "We could not load appointments right now. Please try again.",
      },
      { status: setupMissing ? 503 : 500 },
    );
  }

  const slots = (Array.isArray(data) ? data : [])
    .map((row) =>
      typeof row === "string"
        ? row
        : typeof row?.slot_start === "string"
          ? row.slot_start
          : "",
    )
    .filter(Boolean)
    .map((slot) => slot.slice(0, 5));

  return Response.json({ slots });
}
