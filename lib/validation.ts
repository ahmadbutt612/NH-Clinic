import { DOCTORS, getPakistanDate } from "./clinic";

export type BookingInput = {
  doctorId?: unknown;
  appointmentDate?: unknown;
  startTime?: unknown;
  patientName?: unknown;
  patientEmail?: unknown;
  patientPhone?: unknown;
  reason?: unknown;
  whatsappOptIn?: unknown;
  website?: unknown;
};

export type ValidBooking = {
  doctorId: string;
  appointmentDate: string;
  startTime: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  reason: string;
  whatsappOptIn: boolean;
};

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export function normalizePakistanPhone(value: string) {
  const compact = value.replace(/[\s()-]/g, "");
  if (/^03\d{9}$/.test(compact)) return `+92${compact.slice(1)}`;
  if (/^923\d{9}$/.test(compact)) return `+${compact}`;
  if (/^\+923\d{9}$/.test(compact)) return compact;
  return null;
}

export function validateBooking(input: BookingInput) {
  const errors: Record<string, string> = {};
  const doctorId = cleanText(input.doctorId, 64);
  const appointmentDate = cleanText(input.appointmentDate, 10);
  const startTime = cleanText(input.startTime, 5);
  const patientName = cleanText(input.patientName, 100);
  const patientEmail = cleanText(input.patientEmail, 160).toLowerCase();
  const patientPhoneRaw = cleanText(input.patientPhone, 32);
  const patientPhone = normalizePakistanPhone(patientPhoneRaw);
  const reason = cleanText(input.reason, 600);

  if (cleanText(input.website, 200)) {
    errors.form = "Unable to submit this booking.";
  }
  if (!DOCTORS.some((doctor) => doctor.id === doctorId)) {
    errors.doctorId = "Please select a doctor.";
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(appointmentDate)) {
    errors.appointmentDate = "Please select a valid date.";
  } else if (appointmentDate < getPakistanDate()) {
    errors.appointmentDate = "Please select today or a future date.";
  } else if (appointmentDate > getPakistanDate(60)) {
    errors.appointmentDate = "Appointments can be booked up to 60 days ahead.";
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime)) {
    errors.startTime = "Please select an available time.";
  }
  if (patientName.length < 2) {
    errors.patientName = "Please enter the patient's full name.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patientEmail)) {
    errors.patientEmail = "Please enter a valid email address.";
  }
  if (!patientPhone) {
    errors.patientPhone = "Enter a Pakistani mobile number, such as 0344 4406456.";
  }

  if (Object.keys(errors).length > 0 || !patientPhone) {
    return { data: null, errors };
  }

  const data: ValidBooking = {
    doctorId,
    appointmentDate,
    startTime,
    patientName,
    patientEmail,
    patientPhone,
    reason,
    whatsappOptIn: input.whatsappOptIn === true,
  };

  return { data, errors };
}
