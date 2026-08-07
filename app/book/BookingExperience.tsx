"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  CLINIC,
  DOCTORS,
  formatClinicDate,
  formatClinicTime,
  getPakistanDate,
  getWhatsAppUrl,
} from "@/lib/clinic";

type BookingResult = {
  appointmentId: string;
  reference: string;
  emailSent: boolean;
};

type PatientDetails = {
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  reason: string;
  whatsappOptIn: boolean;
  website: string;
};

const emptyPatient: PatientDetails = {
  patientName: "",
  patientEmail: "",
  patientPhone: "",
  reason: "",
  whatsappOptIn: true,
  website: "",
};

export function BookingExperience() {
  const [doctorId, setDoctorId] = useState(() => {
    if (typeof window === "undefined") return "";
    const requestedDoctor = new URLSearchParams(window.location.search).get("doctor");
    return DOCTORS.find((item) => item.slug === requestedDoctor)?.id ?? "";
  });
  const [date, setDate] = useState(getPakistanDate());
  const [selectedTime, setSelectedTime] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState("");
  const [patient, setPatient] = useState<PatientDetails>(emptyPatient);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [result, setResult] = useState<BookingResult | null>(null);

  const minDate = getPakistanDate();
  const maxDate = getPakistanDate(60);
  const doctor = DOCTORS.find((item) => item.id === doctorId);

  const loadSlots = useCallback(async (signal?: AbortSignal) => {
    if (!doctorId || !date) {
      setSlots([]);
      return;
    }

    setSlotsLoading(true);
    setSlotsError("");
    try {
      const response = await fetch(
        `/api/availability?doctorId=${encodeURIComponent(doctorId)}&date=${encodeURIComponent(date)}`,
        { signal },
      );
      const payload = (await response.json()) as { slots?: string[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not load available times.");
      setSlots(payload.slots ?? []);
      setSelectedTime((current) => (payload.slots?.includes(current) ? current : ""));
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setSlots([]);
      setSlotsError(error instanceof Error ? error.message : "Could not load available times.");
    } finally {
      setSlotsLoading(false);
    }
  }, [date, doctorId]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void loadSlots(controller.signal), 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [loadSlots]);

  const bookingMessage = useMemo(() => {
    if (!doctor || !selectedTime || !date) {
      return "Hello NH Gyne Clinic, I need help with an appointment.";
    }
    return `Hello NH Gyne Clinic, I am booking with ${doctor.name} on ${formatClinicDate(date)} at ${formatClinicTime(selectedTime)} PKT.`;
  }, [date, doctor, selectedTime]);

  function selectDoctor(nextDoctorId: string) {
    setDoctorId(nextDoctorId);
    setSelectedTime("");
    setSubmitError("");
  }

  function updatePatient<Key extends keyof PatientDetails>(key: Key, value: PatientDetails[Key]) {
    setPatient((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  async function submitBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError("");
    setFieldErrors({});

    if (!doctorId || !date || !selectedTime) {
      setSubmitError("Choose a doctor, date, and available time before continuing.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId,
          appointmentDate: date,
          startTime: selectedTime,
          ...patient,
        }),
      });
      const payload = (await response.json()) as BookingResult & {
        error?: string;
        code?: string;
        errors?: Record<string, string>;
      };

      if (!response.ok) {
        setFieldErrors(payload.errors ?? {});
        setSubmitError(payload.error ?? "We could not complete your booking.");
        if (response.status === 409 || payload.code === "slot_unavailable") {
          setSelectedTime("");
          await loadSlots();
        }
        return;
      }

      setResult(payload);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setSubmitError("We lost the connection before the booking was completed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (result && doctor) {
    const successWhatsApp = getWhatsAppUrl(
      `Hello NH Gyne Clinic, my booking reference is ${result.reference}. I am booked with ${doctor.name} on ${formatClinicDate(date)} at ${formatClinicTime(selectedTime)} PKT.`,
    );

    return (
      <section className="booking-success" aria-labelledby="booking-success-title">
        <div className="success-mark" aria-hidden="true"><span>✓</span></div>
        <p className="eyebrow">Appointment confirmed</p>
        <h1 id="booking-success-title">You&apos;re all set.</h1>
        <p className="success-lead">
          Your visit is reserved. Please save the reference below and arrive 10 minutes early.
        </p>
        <div className="success-details">
          <div><span>Doctor</span><strong>{doctor.name}</strong><small>{doctor.title}</small></div>
          <div><span>Date</span><strong>{formatClinicDate(date)}</strong><small>{CLINIC.timezoneLabel}</small></div>
          <div><span>Time</span><strong>{formatClinicTime(selectedTime)}</strong><small>30-minute appointment</small></div>
          <div><span>Reference</span><strong>{result.reference}</strong><small>Keep this for your records</small></div>
        </div>
        <p className={`email-status ${result.emailSent ? "email-status-sent" : ""}`} role="status">
          {result.emailSent
            ? `A confirmation email has been sent to ${patient.patientEmail}.`
            : "Your booking is confirmed. Email delivery will be enabled when the clinic connects its mail service."}
        </p>
        <div className="success-actions">
          <a className="button button-primary" href={successWhatsApp} target="_blank" rel="noreferrer">
            Send details on WhatsApp
          </a>
          <Link className="button button-quiet" href="/">Return to clinic home</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="booking-shell" aria-labelledby="booking-title">
      <div className="booking-heading">
        <p className="eyebrow">Online appointment</p>
        <h1 id="booking-title">Choose the care and time that suit you.</h1>
        <p>
          Only currently available 30-minute appointments are shown. Your booking is confirmed instantly.
        </p>
      </div>

      <div className="booking-layout">
        <form className="booking-form" onSubmit={submitBooking} noValidate>
          <div className="booking-progress" aria-label="Booking progress">
            <span className={doctorId ? "complete" : "active"}><i>1</i> Doctor</span>
            <b aria-hidden="true" />
            <span className={selectedTime ? "complete" : doctorId ? "active" : ""}><i>2</i> Time</span>
            <b aria-hidden="true" />
            <span className={selectedTime ? "active" : ""}><i>3</i> Details</span>
          </div>

          <fieldset className="booking-panel">
            <legend><span>01</span> Select your doctor</legend>
            <div className="doctor-picker">
              {DOCTORS.map((item) => (
                <button
                  type="button"
                  className={`doctor-option${doctorId === item.id ? " selected" : ""}`}
                  onClick={() => selectDoctor(item.id)}
                  aria-pressed={doctorId === item.id}
                  key={item.id}
                >
                  <span className={`option-avatar option-avatar-${item.tone}`}>{item.initials}</span>
                  <span><strong>{item.name}</strong><small>{item.title}</small></span>
                  <i aria-hidden="true">✓</i>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="booking-panel" disabled={!doctorId}>
            <legend><span>02</span> Choose date and time</legend>
            <div className="date-row">
              <label htmlFor="appointment-date">Appointment date</label>
              <input
                id="appointment-date"
                type="date"
                min={minDate}
                max={maxDate}
                value={date}
                onChange={(event) => {
                  setDate(event.target.value);
                  setSelectedTime("");
                }}
              />
              <small>Appointments are available up to 60 days ahead.</small>
            </div>

            <div className="time-heading">
              <div>
                <strong>{date ? formatClinicDate(date) : "Choose a date"}</strong>
                <small>{CLINIC.timezoneLabel}</small>
              </div>
              {!slotsLoading && !slotsError && <span aria-live="polite">{slots.length} available</span>}
            </div>

            {slotsLoading ? (
              <div className="slot-loading" role="status"><i /><i /><i /><span>Checking live availability…</span></div>
            ) : slotsError ? (
              <div className="booking-notice booking-notice-error" role="alert">
                <strong>Availability is temporarily unavailable.</strong>
                <p>{slotsError}</p>
                <button type="button" onClick={() => void loadSlots()}>Try again</button>
              </div>
            ) : slots.length === 0 ? (
              <div className="booking-notice">
                <strong>No appointments are open on this date.</strong>
                <p>The clinic may be closed, the doctor may be away, or all appointments may be booked. Please try another date.</p>
              </div>
            ) : (
              <div className="slot-grid" role="radiogroup" aria-label="Available appointment times">
                {slots.map((slot) => (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={selectedTime === slot}
                    className={selectedTime === slot ? "selected" : ""}
                    onClick={() => setSelectedTime(slot)}
                    key={slot}
                  >
                    {formatClinicTime(slot)}
                  </button>
                ))}
              </div>
            )}
          </fieldset>

          <fieldset className="booking-panel" disabled={!selectedTime}>
            <legend><span>03</span> Your details</legend>
            <div className="form-grid">
              <div className="form-field form-field-wide">
                <label htmlFor="patient-name">Patient&apos;s full name</label>
                <input
                  id="patient-name"
                  autoComplete="name"
                  value={patient.patientName}
                  onChange={(event) => updatePatient("patientName", event.target.value)}
                  aria-invalid={Boolean(fieldErrors.patientName)}
                  aria-describedby={fieldErrors.patientName ? "patient-name-error" : undefined}
                  placeholder="Your full name"
                />
                {fieldErrors.patientName && <small className="field-error" id="patient-name-error">{fieldErrors.patientName}</small>}
              </div>
              <div className="form-field">
                <label htmlFor="patient-phone">Mobile number</label>
                <input
                  id="patient-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={patient.patientPhone}
                  onChange={(event) => updatePatient("patientPhone", event.target.value)}
                  aria-invalid={Boolean(fieldErrors.patientPhone)}
                  aria-describedby={fieldErrors.patientPhone ? "patient-phone-error" : undefined}
                  placeholder="03XX XXXXXXX"
                />
                {fieldErrors.patientPhone && <small className="field-error" id="patient-phone-error">{fieldErrors.patientPhone}</small>}
              </div>
              <div className="form-field">
                <label htmlFor="patient-email">Email address</label>
                <input
                  id="patient-email"
                  type="email"
                  autoComplete="email"
                  value={patient.patientEmail}
                  onChange={(event) => updatePatient("patientEmail", event.target.value)}
                  aria-invalid={Boolean(fieldErrors.patientEmail)}
                  aria-describedby={fieldErrors.patientEmail ? "patient-email-error" : "patient-email-help"}
                  placeholder="you@example.com"
                />
                {fieldErrors.patientEmail ? (
                  <small className="field-error" id="patient-email-error">{fieldErrors.patientEmail}</small>
                ) : (
                  <small id="patient-email-help">Used for confirmation and cancellation updates.</small>
                )}
              </div>
              <div className="form-field form-field-wide">
                <label htmlFor="patient-reason">Reason for visit <span>Optional</span></label>
                <textarea
                  id="patient-reason"
                  rows={4}
                  value={patient.reason}
                  onChange={(event) => updatePatient("reason", event.target.value)}
                  placeholder="A brief note for the doctor. Please avoid highly sensitive detail."
                  maxLength={600}
                />
              </div>
              <div className="honeypot-field" aria-hidden="true">
                <label htmlFor="website">Website</label>
                <input id="website" tabIndex={-1} autoComplete="off" value={patient.website} onChange={(event) => updatePatient("website", event.target.value)} />
              </div>
              <label
                className="check-field form-field-wide"
                htmlFor="whatsapp-opt-in"
                aria-label="Make WhatsApp contact easy"
              >
                <input
                  id="whatsapp-opt-in"
                  type="checkbox"
                  checked={patient.whatsappOptIn}
                  onChange={(event) => updatePatient("whatsappOptIn", event.target.checked)}
                />
                <span><strong>Make WhatsApp contact easy</strong><small>Show a ready-to-send message with my booking details after confirmation.</small></span>
              </label>
            </div>
          </fieldset>

          {submitError && <div className="form-submit-error" role="alert">{submitError}</div>}
          <button className="button button-primary booking-submit" disabled={submitting || !selectedTime} type="submit">
            {submitting ? "Confirming your appointment…" : "Confirm appointment"}
          </button>
          <p className="booking-consent">
            By booking, you agree that the clinic may use these details to manage this appointment and send related updates.
          </p>
        </form>

        <aside className="booking-summary" aria-label="Appointment summary">
          <p className="eyebrow">Your appointment</p>
          <h2>{doctor ? doctor.name : "Choose a doctor"}</h2>
          <p className="summary-specialty">{doctor?.title ?? "Your selection will appear here."}</p>
          <dl>
            <div><dt>Date</dt><dd>{date ? formatClinicDate(date, "short") : "Not selected"}</dd></div>
            <div><dt>Time</dt><dd>{selectedTime ? `${formatClinicTime(selectedTime)} PKT` : "Not selected"}</dd></div>
            <div><dt>Duration</dt><dd>30 minutes</dd></div>
            <div><dt>Confirmation</dt><dd>Instant</dd></div>
          </dl>
          <div className="summary-location">
            <span aria-hidden="true">⌖</span>
            <p><strong>NH Gyne Clinic</strong>{CLINIC.address}</p>
          </div>
          <a className="summary-whatsapp" href={getWhatsAppUrl(bookingMessage)} target="_blank" rel="noreferrer">
            Need help? Message us on WhatsApp <span aria-hidden="true">→</span>
          </a>
        </aside>
      </div>
    </section>
  );
}
