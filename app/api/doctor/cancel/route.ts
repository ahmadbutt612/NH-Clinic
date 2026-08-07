import { getAuthorizedDoctor } from "@/lib/doctor-auth";
import { sendCancellationEmail } from "@/lib/email";

export async function POST(request: Request) {
  const auth = await getAuthorizedDoctor(request);
  if ("error" in auth) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await request.json().catch(() => ({}))) as {
    appointmentId?: string;
    reason?: string;
  };
  const appointmentId = body.appointmentId?.trim() ?? "";
  const reason = body.reason?.trim().slice(0, 240) || "Cancelled by the clinic";

  if (!appointmentId) {
    return Response.json({ error: "Appointment ID is required." }, { status: 400 });
  }

  const { data: appointment, error: findError } = await auth.supabase
    .from("appointments")
    .select(
      "id, booking_reference, appointment_date, start_time, patient_name, patient_email, status",
    )
    .eq("id", appointmentId)
    .eq("doctor_id", auth.doctorId)
    .maybeSingle();

  if (findError || !appointment) {
    return Response.json({ error: "Appointment not found." }, { status: 404 });
  }

  if (appointment.status === "cancelled") {
    return Response.json({ cancelled: true, alreadyCancelled: true, emailSent: false });
  }

  const { data: updatedAppointment, error: updateError } = await auth.supabase
    .from("appointments")
    .update({
      status: "cancelled",
      cancellation_reason: reason,
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", appointmentId)
    .eq("doctor_id", auth.doctorId)
    .eq("status", "confirmed")
    .select("id")
    .maybeSingle();

  if (updateError) {
    return Response.json({ error: "Could not cancel the appointment." }, { status: 500 });
  }
  if (!updatedAppointment) {
    return Response.json({ cancelled: true, alreadyCancelled: true, emailSent: false });
  }

  const doctorValue = auth.profile.doctors as
    | { name?: string; title?: string }
    | Array<{ name?: string; title?: string }>
    | null;
  const doctor = Array.isArray(doctorValue) ? doctorValue[0] : doctorValue;

  let emailSent = false;
  if (doctor?.name && doctor?.title) {
    try {
      const email = await sendCancellationEmail({
        reference: appointment.booking_reference,
        patientName: appointment.patient_name,
        patientEmail: appointment.patient_email,
        appointmentDate: appointment.appointment_date,
        startTime: appointment.start_time,
        doctor: { name: doctor.name, title: doctor.title },
        cancellationReason: reason,
      });
      emailSent = email.sent;
    } catch (emailError) {
      console.error("Cancellation email failed", emailError);
    }
  }

  return Response.json({ cancelled: true, emailSent });
}
