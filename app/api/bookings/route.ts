import { getDoctor } from "@/lib/clinic";
import { sendBookingConfirmation } from "@/lib/email";
import { createServerSupabaseClient } from "@/lib/supabase";
import { validateBooking, type BookingInput } from "@/lib/validation";

export async function POST(request: Request) {
  let input: BookingInput;
  try {
    input = (await request.json()) as BookingInput;
  } catch {
    return Response.json({ error: "Invalid booking request." }, { status: 400 });
  }

  const { data: booking, errors } = validateBooking(input);
  if (!booking) {
    return Response.json({ error: "Please review the highlighted details.", errors }, { status: 400 });
  }

  const doctor = getDoctor(booking.doctorId);
  const supabase = createServerSupabaseClient();
  if (!doctor || !supabase) {
    return Response.json(
      { error: "Online booking is not connected yet. Please contact us on WhatsApp." },
      { status: 503 },
    );
  }

  const { data, error } = await supabase.rpc("book_appointment", {
    p_doctor_id: booking.doctorId,
    p_appointment_date: booking.appointmentDate,
    p_start_time: booking.startTime,
    p_patient_name: booking.patientName,
    p_patient_email: booking.patientEmail,
    p_patient_phone: booking.patientPhone,
    p_reason: booking.reason || null,
    p_whatsapp_opt_in: booking.whatsappOptIn,
  });

  if (error) {
    console.error("Booking failed", error.message);
    const slotUnavailable = /slot_unavailable|already booked|not available/i.test(error.message);
    return Response.json(
      {
        error: slotUnavailable
          ? "That time was just booked by someone else. Please choose another available slot."
          : /too_many_bookings/i.test(error.message)
            ? "Please wait a moment before making another booking."
            : "We could not complete the booking. Please try again or contact us on WhatsApp.",
        code: slotUnavailable ? "slot_unavailable" : "booking_failed",
      },
      { status: slotUnavailable ? 409 : 500 },
    );
  }

  const result = Array.isArray(data) ? data[0] : data;
  const reference = result?.booking_reference as string | undefined;
  const appointmentId = result?.appointment_id as string | undefined;

  if (!reference || !appointmentId) {
    return Response.json({ error: "The booking response was incomplete." }, { status: 500 });
  }

  let emailSent = false;
  try {
    const email = await sendBookingConfirmation({
      reference,
      patientName: booking.patientName,
      patientEmail: booking.patientEmail,
      appointmentDate: booking.appointmentDate,
      startTime: booking.startTime,
      doctor,
    });
    emailSent = email.sent;
  } catch (emailError) {
    console.error("Confirmation email failed", emailError);
  }

  return Response.json(
    {
      appointmentId,
      reference,
      emailSent,
      message: "Your appointment is confirmed.",
    },
    { status: 201 },
  );
}
