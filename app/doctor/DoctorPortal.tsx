"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import Link from "next/link";
import { formatClinicDate, formatClinicTime, getPakistanDate } from "@/lib/clinic";
import { getBrowserSupabaseClient } from "@/lib/supabase";

type DoctorInfo = { id: string; slug: string; name: string; title: string; credentials: string };
type Appointment = {
  id: string;
  booking_reference: string;
  appointment_date: string;
  start_time: string;
  patient_name: string;
  patient_email: string;
  patient_phone: string;
  reason: string | null;
  whatsapp_opt_in: boolean;
  status: "confirmed" | "cancelled" | "completed";
  cancellation_reason: string | null;
  created_at: string;
};
type Holiday = { id: string; holiday_date: string; note: string | null; created_at: string };
type Overview = { doctor: DoctorInfo | DoctorInfo[]; email: string; appointments: Appointment[]; holidays: Holiday[] };

export function DoctorPortal() {
  const supabase = useMemo(() => getBrowserSupabaseClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(Boolean(supabase));
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState("");
  const [notice, setNotice] = useState("");
  const [holidayDate, setHolidayDate] = useState("");
  const [holidayNote, setHolidayNote] = useState("");
  const [holidayBusy, setHolidayBusy] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelBusy, setCancelBusy] = useState(false);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
      if (!nextSession) setOverview(null);
    });
    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  const loadOverview = useCallback(async (activeSession: Session) => {
    setDashboardLoading(true);
    setDashboardError("");
    try {
      const response = await fetch("/api/doctor/overview", {
        headers: { Authorization: `Bearer ${activeSession.access_token}` },
      });
      const payload = (await response.json()) as Overview & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not load the dashboard.");
      setOverview(payload);
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : "Could not load the dashboard.");
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!session) return;
    const timer = window.setTimeout(() => void loadOverview(session), 0);
    return () => window.clearTimeout(timer);
  }, [loadOverview, session]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setLoginBusy(true);
    setLoginError("");
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail.trim(),
      password: loginPassword,
    });
    if (error) setLoginError("The email or password is incorrect, or the account still needs email confirmation.");
    setLoginBusy(false);
  }

  async function logout() {
    await getBrowserSupabaseClient()?.auth.signOut();
    setOverview(null);
  }

  async function addHoliday(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !holidayDate) return;
    setHolidayBusy(true);
    setDashboardError("");
    setNotice("");
    try {
      const response = await fetch("/api/doctor/holidays", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ date: holidayDate, note: holidayNote }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not add the holiday.");
      setHolidayDate("");
      setHolidayNote("");
      setNotice("Holiday added. This date will no longer appear in patient availability.");
      await loadOverview(session);
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : "Could not add the holiday.");
    } finally {
      setHolidayBusy(false);
    }
  }

  async function removeHoliday(holidayId: string) {
    if (!session) return;
    setDashboardError("");
    setNotice("");
    const response = await fetch("/api/doctor/holidays", {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ holidayId }),
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setDashboardError(payload.error ?? "Could not remove the holiday.");
      return;
    }
    setNotice("Holiday removed. Available slots on that date can be booked again.");
    await loadOverview(session);
  }

  async function cancelAppointment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !cancelTarget) return;
    setCancelBusy(true);
    setDashboardError("");
    setNotice("");
    try {
      const response = await fetch("/api/doctor/cancel", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ appointmentId: cancelTarget.id, reason: cancelReason }),
      });
      const payload = (await response.json()) as { error?: string; emailSent?: boolean };
      if (!response.ok) throw new Error(payload.error ?? "Could not cancel the appointment.");
      setCancelTarget(null);
      setCancelReason("");
      setNotice(
        payload.emailSent
          ? "Appointment cancelled and the patient was notified by email."
          : "Appointment cancelled. Email delivery is not configured yet, so please contact the patient directly.",
      );
      await loadOverview(session);
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : "Could not cancel the appointment.");
    } finally {
      setCancelBusy(false);
    }
  }

  const doctor = useMemo(() => {
    if (!overview) return null;
    return Array.isArray(overview.doctor) ? overview.doctor[0] : overview.doctor;
  }, [overview]);
  const confirmedAppointments = overview?.appointments.filter((item) => item.status === "confirmed") ?? [];
  const todayAppointments = confirmedAppointments.filter((item) => item.appointment_date === getPakistanDate());

  if (authLoading) {
    return <div className="portal-loading" role="status"><i /><span>Opening the doctor portal…</span></div>;
  }

  if (!supabase) {
    return (
      <section className="portal-message">
        <span className="portal-lock" aria-hidden="true">⌁</span>
        <h1>Doctor portal setup pending</h1>
        <p>Add the Supabase environment values and run the one-time setup command before signing in.</p>
        <Link className="button button-primary" href="/">Return to clinic home</Link>
      </section>
    );
  }

  if (!session) {
    return (
      <section className="doctor-login-shell">
        <div className="login-story">
          <p className="eyebrow eyebrow-light">NH Doctor Portal</p>
          <h1>Care continues behind the scenes.</h1>
          <p>Review upcoming patients, manage clinic holidays, and keep the schedule accurate.</p>
          <div className="login-story-note"><span aria-hidden="true">✦</span><p>Secure access is available only to authorised clinic doctors.</p></div>
        </div>
        <form className="doctor-login-card" onSubmit={login}>
          <span className="portal-lock" aria-hidden="true">⌁</span>
          <p className="eyebrow">Welcome back</p>
          <h2>Sign in to your schedule</h2>
          <div className="form-field">
            <label htmlFor="doctor-email">Email address</label>
            <input id="doctor-email" type="email" autoComplete="username" value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} required />
          </div>
          <div className="form-field">
            <label htmlFor="doctor-password">Password</label>
            <input id="doctor-password" type="password" autoComplete="current-password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} required />
          </div>
          {loginError && <p className="login-error" role="alert">{loginError}</p>}
          <button className="button button-primary" disabled={loginBusy} type="submit">{loginBusy ? "Signing in…" : "Sign in securely"}</button>
          <Link href="/">← Back to clinic website</Link>
        </form>
      </section>
    );
  }

  return (
    <section className="dashboard-shell">
      <header className="dashboard-topbar">
        <div><p className="eyebrow">Doctor dashboard</p><h1>{doctor?.name ?? "Your schedule"}</h1><span>{doctor?.title}</span></div>
        <button className="button button-quiet button-small" type="button" onClick={logout}>Sign out</button>
      </header>

      {dashboardError && <div className="dashboard-alert dashboard-alert-error" role="alert">{dashboardError}</div>}
      {notice && <div className="dashboard-alert" role="status">{notice}</div>}

      <div className="dashboard-stats">
        <article><span>Today</span><strong>{todayAppointments.length}</strong><small>confirmed appointment{todayAppointments.length === 1 ? "" : "s"}</small></article>
        <article><span>Upcoming</span><strong>{confirmedAppointments.length}</strong><small>confirmed bookings</small></article>
        <article><span>Time off</span><strong>{overview?.holidays.length ?? 0}</strong><small>upcoming holiday{overview?.holidays.length === 1 ? "" : "s"}</small></article>
        <article><span>Clinic time</span><strong>PKT</strong><small>Asia / Karachi</small></article>
      </div>

      <div className="dashboard-grid">
        <div className="appointments-panel dashboard-panel">
          <div className="dashboard-panel-heading">
            <div><p className="eyebrow">Appointments</p><h2>Upcoming patients</h2></div>
            <button type="button" onClick={() => session && void loadOverview(session)} disabled={dashboardLoading}>{dashboardLoading ? "Refreshing…" : "Refresh"}</button>
          </div>
          {dashboardLoading && !overview ? (
            <div className="portal-loading inline-loading" role="status"><i /><span>Loading appointments…</span></div>
          ) : overview?.appointments.length ? (
            <div className="appointment-list">
              {overview.appointments.map((appointment) => (
                <article className={`appointment-card appointment-${appointment.status}`} key={appointment.id}>
                  <div className="appointment-time"><strong>{formatClinicTime(appointment.start_time)}</strong><span>{formatClinicDate(appointment.appointment_date, "short")}</span></div>
                  <div className="appointment-patient">
                    <div><h3>{appointment.patient_name}</h3><span className={`status-badge status-${appointment.status}`}>{appointment.status}</span></div>
                    <p>{appointment.patient_phone} · {appointment.patient_email}</p>
                    {appointment.reason && <small><strong>Visit note:</strong> {appointment.reason}</small>}
                    <span className="reference-chip">{appointment.booking_reference}</span>
                  </div>
                  <div className="appointment-actions">
                    {appointment.whatsapp_opt_in && <a href={`https://wa.me/${appointment.patient_phone.replace("+", "")}`} target="_blank" rel="noreferrer">WhatsApp</a>}
                    {appointment.status === "confirmed" && <button type="button" onClick={() => setCancelTarget(appointment)}>Cancel</button>}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state"><span aria-hidden="true">○</span><h3>No upcoming appointments</h3><p>New bookings will appear here automatically.</p></div>
          )}
        </div>

        <aside className="holiday-panel dashboard-panel">
          <div className="dashboard-panel-heading"><div><p className="eyebrow">Availability</p><h2>Clinic holidays</h2></div></div>
          <p className="holiday-intro">Mark a date unavailable before patients book it. Dates with confirmed appointments must be cleared first.</p>
          <form className="holiday-form" onSubmit={addHoliday}>
            <div className="form-field"><label htmlFor="holiday-date">Date</label><input id="holiday-date" type="date" min={getPakistanDate()} value={holidayDate} onChange={(event) => setHolidayDate(event.target.value)} required /></div>
            <div className="form-field"><label htmlFor="holiday-note">Note <span>Optional</span></label><input id="holiday-note" value={holidayNote} onChange={(event) => setHolidayNote(event.target.value)} placeholder="e.g. Conference" maxLength={180} /></div>
            <button className="button button-primary" disabled={holidayBusy} type="submit">{holidayBusy ? "Adding…" : "Mark as holiday"}</button>
          </form>
          <div className="holiday-list">
            <h3>Upcoming time off</h3>
            {overview?.holidays.length ? overview.holidays.map((holiday) => (
              <div key={holiday.id}><span><strong>{formatClinicDate(holiday.holiday_date, "short")}</strong><small>{holiday.note || "Clinic unavailable"}</small></span><button type="button" onClick={() => void removeHoliday(holiday.id)} aria-label={`Remove holiday on ${formatClinicDate(holiday.holiday_date)}`}>Remove</button></div>
            )) : <p>No upcoming holidays are marked.</p>}
          </div>
        </aside>
      </div>

      {cancelTarget && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !cancelBusy && setCancelTarget(null)}>
          <form className="cancel-dialog" role="dialog" aria-modal="true" aria-labelledby="cancel-title" onSubmit={cancelAppointment}>
            <span className="dialog-icon" aria-hidden="true">!</span>
            <p className="eyebrow">Cancel appointment</p>
            <h2 id="cancel-title">Notify {cancelTarget.patient_name}?</h2>
            <p>{formatClinicDate(cancelTarget.appointment_date)} at {formatClinicTime(cancelTarget.start_time)} · {cancelTarget.booking_reference}</p>
            <div className="form-field"><label htmlFor="cancel-reason">Message for the patient <span>Optional</span></label><textarea id="cancel-reason" rows={3} maxLength={240} value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} placeholder="Cancelled by the clinic" /></div>
            <div className="dialog-actions"><button className="button button-quiet" type="button" disabled={cancelBusy} onClick={() => setCancelTarget(null)}>Keep appointment</button><button className="button button-danger" type="submit" disabled={cancelBusy}>{cancelBusy ? "Cancelling…" : "Cancel appointment"}</button></div>
          </form>
        </div>
      )}
    </section>
  );
}
