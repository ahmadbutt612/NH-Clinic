import {
  CLINIC,
  formatClinicDate,
  formatClinicTime,
  type Doctor,
} from "./clinic";

type AppointmentEmail = {
  reference: string;
  patientName: string;
  patientEmail: string;
  appointmentDate: string;
  startTime: string;
  doctor: Doctor | { name: string; title: string };
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function sendEmail(payload: {
  to: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
}) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();

  if (!apiKey || !from) {
    return { sent: false, reason: "not_configured" as const };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": payload.idempotencyKey,
    },
    body: JSON.stringify({
      from,
      to: [payload.to],
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error("Resend delivery failed", response.status, detail.slice(0, 300));
    return { sent: false, reason: "delivery_failed" as const };
  }

  return { sent: true, reason: null };
}

function emailShell(title: string, lead: string, details: string) {
  return `
    <div style="background:#f8f3f1;padding:32px 16px;font-family:Arial,sans-serif;color:#422d38">
      <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #eadeda;border-radius:22px;overflow:hidden">
        <div style="background:#6e4058;color:#fff;padding:28px 32px">
          <div style="font-size:13px;letter-spacing:.12em;text-transform:uppercase;opacity:.82">${CLINIC.name}</div>
          <h1 style="font-family:Georgia,serif;font-weight:500;font-size:30px;margin:10px 0 0">${title}</h1>
        </div>
        <div style="padding:30px 32px">
          <p style="font-size:16px;line-height:1.65;margin:0 0 24px">${lead}</p>
          <div style="background:#fbf7f5;border-radius:16px;padding:20px;font-size:15px;line-height:1.8">${details}</div>
          <p style="color:#7e6a74;font-size:13px;line-height:1.6;margin:24px 0 0">${escapeHtml(CLINIC.address)}<br>${CLINIC.phoneDisplay} · ${CLINIC.timezoneLabel}</p>
        </div>
      </div>
    </div>`;
}

export function sendBookingConfirmation(appointment: AppointmentEmail) {
  const date = formatClinicDate(appointment.appointmentDate);
  const time = formatClinicTime(appointment.startTime);
  const details = [
    `<strong>Doctor:</strong> ${escapeHtml(appointment.doctor.name)}`,
    `<strong>Date:</strong> ${escapeHtml(date)}`,
    `<strong>Time:</strong> ${escapeHtml(time)} PKT`,
    `<strong>Reference:</strong> ${escapeHtml(appointment.reference)}`,
  ].join("<br>");

  return sendEmail({
    to: appointment.patientEmail,
    subject: `Appointment confirmed · ${appointment.reference}`,
    html: emailShell(
      "Your appointment is confirmed",
      `Hello ${escapeHtml(appointment.patientName)}, your visit has been reserved. Please arrive 10 minutes early.`,
      details,
    ),
    text: `Hello ${appointment.patientName}, your appointment with ${appointment.doctor.name} is confirmed for ${date} at ${time} PKT. Reference: ${appointment.reference}. ${CLINIC.address}`,
    idempotencyKey: `booking-${appointment.reference}`,
  });
}

export function sendCancellationEmail(
  appointment: AppointmentEmail & { cancellationReason?: string },
) {
  const date = formatClinicDate(appointment.appointmentDate);
  const time = formatClinicTime(appointment.startTime);
  const reason = appointment.cancellationReason?.trim();
  const details = [
    `<strong>Doctor:</strong> ${escapeHtml(appointment.doctor.name)}`,
    `<strong>Original date:</strong> ${escapeHtml(date)}`,
    `<strong>Original time:</strong> ${escapeHtml(time)} PKT`,
    `<strong>Reference:</strong> ${escapeHtml(appointment.reference)}`,
    reason ? `<strong>Note:</strong> ${escapeHtml(reason)}` : "",
  ]
    .filter(Boolean)
    .join("<br>");

  return sendEmail({
    to: appointment.patientEmail,
    subject: `Appointment cancelled · ${appointment.reference}`,
    html: emailShell(
      "Your appointment was cancelled",
      `Hello ${escapeHtml(appointment.patientName)}, this appointment is no longer scheduled. You can book another available time on our website or contact us on WhatsApp.`,
      details,
    ),
    text: `Hello ${appointment.patientName}, your appointment with ${appointment.doctor.name} on ${date} at ${time} PKT has been cancelled. Reference: ${appointment.reference}.${reason ? ` Note: ${reason}` : ""}`,
    idempotencyKey: `cancellation-${appointment.reference}`,
  });
}
