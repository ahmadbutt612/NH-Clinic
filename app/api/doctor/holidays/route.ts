import { getAuthorizedDoctor } from "@/lib/doctor-auth";
import { getPakistanDate } from "@/lib/clinic";

export async function POST(request: Request) {
  const auth = await getAuthorizedDoctor(request);
  if ("error" in auth) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await request.json().catch(() => ({}))) as {
    date?: string;
    note?: string;
  };
  const date = body.date?.trim() ?? "";
  const note = body.note?.trim().slice(0, 180) || null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < getPakistanDate()) {
    return Response.json({ error: "Choose today or a future date." }, { status: 400 });
  }

  const { data, error } = await auth.supabase.rpc("add_doctor_holiday", {
    p_date: date,
    p_note: note,
  });

  if (error) {
    const duplicate = /holiday_already_exists|duplicate|unique/i.test(error.message);
    const conflicts = /cancel_existing_appointments_first/i.test(error.message);
    return Response.json(
      {
        error: duplicate
          ? "This date is already marked as a holiday."
          : conflicts
            ? "There are confirmed appointments on this date. Cancel them before marking the holiday."
            : "Could not add the holiday.",
      },
      { status: duplicate || conflicts ? 409 : 500 },
    );
  }

  return Response.json({ holiday: Array.isArray(data) ? data[0] : data }, { status: 201 });
}

export async function DELETE(request: Request) {
  const auth = await getAuthorizedDoctor(request);
  if ("error" in auth) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await request.json().catch(() => ({}))) as { holidayId?: string };
  const holidayId = body.holidayId?.trim() ?? "";
  if (!holidayId) {
    return Response.json({ error: "Holiday ID is required." }, { status: 400 });
  }

  const { data, error } = await auth.supabase.rpc("remove_doctor_holiday", {
    p_holiday_id: holidayId,
  });

  if (error || data !== true) {
    return Response.json({ error: "Could not remove the holiday." }, { status: 500 });
  }

  return Response.json({ removed: true });
}
