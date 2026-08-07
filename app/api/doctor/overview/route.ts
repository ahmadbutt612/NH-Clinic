import { getAuthorizedDoctor } from "@/lib/doctor-auth";
import { getPakistanDate } from "@/lib/clinic";

export async function GET(request: Request) {
  const auth = await getAuthorizedDoctor(request);
  if ("error" in auth) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  const [appointmentsResult, holidaysResult] = await Promise.all([
    auth.supabase
      .from("appointments")
      .select(
        "id, booking_reference, appointment_date, start_time, patient_name, patient_email, patient_phone, reason, whatsapp_opt_in, status, cancellation_reason, created_at",
      )
      .eq("doctor_id", auth.doctorId)
      .gte("appointment_date", getPakistanDate())
      .order("appointment_date", { ascending: true })
      .order("start_time", { ascending: true })
      .limit(120),
    auth.supabase
      .from("doctor_holidays")
      .select("id, holiday_date, note, created_at")
      .eq("doctor_id", auth.doctorId)
      .gte("holiday_date", getPakistanDate())
      .order("holiday_date", { ascending: true })
      .limit(60),
  ]);

  if (appointmentsResult.error || holidaysResult.error) {
    console.error(
      "Doctor overview failed",
      appointmentsResult.error?.message,
      holidaysResult.error?.message,
    );
    return Response.json({ error: "We could not load the dashboard." }, { status: 500 });
  }

  return Response.json({
    doctor: auth.profile.doctors,
    email: auth.profile.email,
    appointments: appointmentsResult.data ?? [],
    holidays: holidaysResult.data ?? [],
  });
}
