begin;

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.doctors (
  id uuid primary key,
  slug text not null unique,
  name text not null,
  title text not null,
  credentials text not null,
  bio text not null,
  active boolean not null default true,
  display_order smallint not null default 0,
  created_at timestamptz not null default now()
);

insert into public.doctors (id, slug, name, title, credentials, bio, display_order)
values
  (
    '11111111-1111-4111-8111-111111111111',
    'umar-farooq-shahzada',
    'Dr. Umar Farooq Shahzada',
    'Consultant Anesthetist & Pain Specialist',
    'MBBS, MCPS, PMP, PMDC',
    'Consultant anesthetist and interventional pain specialist providing safe anesthesia care and evidence-based treatment for acute and chronic pain.',
    1
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'sofia-bano',
    'Dr. Sofia Bano',
    'Gynecologist & Obstetrician',
    'MBBS, MS (trained) Gynae & Obs, RMP, PMDC',
    'Dedicated to women''s health at every stage, from routine gynecological care and prenatal support to postnatal wellness and family planning.',
    2
  )
on conflict (id) do update set
  slug = excluded.slug,
  name = excluded.name,
  title = excluded.title,
  credentials = excluded.credentials,
  bio = excluded.bio,
  display_order = excluded.display_order;

create table if not exists public.clinic_schedule (
  id uuid primary key default extensions.gen_random_uuid(),
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  opens_at time not null,
  closes_at time not null,
  slot_minutes smallint not null default 30 check (slot_minutes = 30),
  check (closes_at > opens_at),
  unique (doctor_id, weekday)
);

insert into public.clinic_schedule (doctor_id, weekday, opens_at, closes_at)
select doctor.id, hours.weekday, hours.opens_at, hours.closes_at
from public.doctors as doctor
cross join (
  values
    (1::smallint, '17:00'::time, '22:00'::time),
    (2::smallint, '17:00'::time, '22:30'::time),
    (3::smallint, '17:00'::time, '22:00'::time),
    (4::smallint, '17:00'::time, '22:00'::time),
    (5::smallint, '17:00'::time, '22:00'::time),
    (6::smallint, '17:00'::time, '22:00'::time)
) as hours(weekday, opens_at, closes_at)
on conflict (doctor_id, weekday) do update set
  opens_at = excluded.opens_at,
  closes_at = excluded.closes_at,
  slot_minutes = 30;

create table if not exists public.doctor_admins (
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now(),
  primary key (doctor_id, email),
  check (email = lower(btrim(email)))
);

create unique index if not exists doctor_admins_email_unique
  on public.doctor_admins (lower(email));

insert into public.doctor_admins (doctor_id, email)
values
  ('11111111-1111-4111-8111-111111111111', '__DOCTOR_UMAR_EMAIL__'),
  ('22222222-2222-4222-8222-222222222222', '__DOCTOR_SOFIA_EMAIL__')
on conflict (doctor_id, email) do nothing;

create table if not exists public.doctor_holidays (
  id uuid primary key default extensions.gen_random_uuid(),
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  holiday_date date not null,
  note text,
  created_at timestamptz not null default now(),
  unique (doctor_id, holiday_date),
  check (note is null or char_length(note) <= 180)
);

create table if not exists public.appointments (
  id uuid primary key default extensions.gen_random_uuid(),
  booking_reference text not null unique default (
    'NH-' || upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 8))
  ),
  doctor_id uuid not null references public.doctors(id),
  appointment_date date not null,
  start_time time not null,
  end_time time generated always as (start_time + interval '30 minutes') stored,
  patient_name text not null check (char_length(patient_name) between 2 and 100),
  patient_email text not null check (
    patient_email = lower(btrim(patient_email)) and char_length(patient_email) <= 160
  ),
  patient_phone text not null check (patient_phone ~ '^\\+923[0-9]{9}$'),
  reason text check (reason is null or char_length(reason) <= 600),
  whatsapp_opt_in boolean not null default false,
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled', 'completed')),
  cancellation_reason text check (cancellation_reason is null or char_length(cancellation_reason) <= 240),
  cancelled_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists appointments_one_confirmed_slot
  on public.appointments (doctor_id, appointment_date, start_time)
  where status = 'confirmed';

create index if not exists appointments_doctor_date_index
  on public.appointments (doctor_id, appointment_date, start_time, status);

create index if not exists appointments_recent_contact_index
  on public.appointments (patient_email, patient_phone, created_at desc);

create or replace function public.is_doctor_admin(target_doctor_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.doctor_admins admin
    where admin.doctor_id = target_doctor_id
      and lower(admin.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

create or replace function public.current_doctor_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select admin.doctor_id
  from public.doctor_admins admin
  where lower(admin.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  limit 1;
$$;

create or replace function public.get_available_slots(
  p_doctor_id uuid,
  p_date date
)
returns table (slot_start text)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  schedule_row public.clinic_schedule%rowtype;
  pakistan_today date := (now() at time zone 'Asia/Karachi')::date;
  pakistan_time time := (now() at time zone 'Asia/Karachi')::time;
begin
  if p_date < pakistan_today or p_date > pakistan_today + 60 then
    return;
  end if;

  if not exists (select 1 from public.doctors where id = p_doctor_id and active) then
    return;
  end if;

  if exists (
    select 1 from public.doctor_holidays
    where doctor_id = p_doctor_id and holiday_date = p_date
  ) then
    return;
  end if;

  select * into schedule_row
  from public.clinic_schedule
  where doctor_id = p_doctor_id
    and weekday = extract(dow from p_date)::smallint;

  if not found then
    return;
  end if;

  return query
  select to_char(slot_value, 'HH24:MI')
  from generate_series(
    timestamp '2000-01-01' + schedule_row.opens_at,
    timestamp '2000-01-01' + schedule_row.closes_at - interval '30 minutes',
    interval '30 minutes'
  ) as generated(slot_value)
  where (p_date > pakistan_today or slot_value::time > pakistan_time)
    and not exists (
      select 1 from public.appointments appointment
      where appointment.doctor_id = p_doctor_id
        and appointment.appointment_date = p_date
        and appointment.start_time = slot_value::time
        and appointment.status = 'confirmed'
    )
  order by slot_value;
end;
$$;

create or replace function public.book_appointment(
  p_doctor_id uuid,
  p_appointment_date date,
  p_start_time text,
  p_patient_name text,
  p_patient_email text,
  p_patient_phone text,
  p_reason text,
  p_whatsapp_opt_in boolean
)
returns table (appointment_id uuid, booking_reference text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  normalized_name text := btrim(p_patient_name);
  normalized_email text := lower(btrim(p_patient_email));
  normalized_phone text := btrim(p_patient_phone);
  normalized_reason text := nullif(btrim(p_reason), '');
  parsed_time time;
  inserted_id uuid;
  inserted_reference text;
begin
  if char_length(normalized_name) not between 2 and 100 then
    raise exception 'invalid_patient_name' using errcode = '22023';
  end if;
  if normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\\.[^[:space:]@]+$'
     or char_length(normalized_email) > 160 then
    raise exception 'invalid_patient_email' using errcode = '22023';
  end if;
  if normalized_phone !~ '^\\+923[0-9]{9}$' then
    raise exception 'invalid_patient_phone' using errcode = '22023';
  end if;
  if normalized_reason is not null and char_length(normalized_reason) > 600 then
    raise exception 'reason_too_long' using errcode = '22023';
  end if;

  begin
    parsed_time := p_start_time::time;
  exception when others then
    raise exception 'slot_unavailable' using errcode = 'P0001';
  end;

  perform pg_advisory_xact_lock(
    hashtext(p_doctor_id::text),
    p_appointment_date - date '2000-01-01'
  );

  if not exists (
    select 1 from public.get_available_slots(p_doctor_id, p_appointment_date) slot
    where slot.slot_start = to_char(parsed_time, 'HH24:MI')
  ) then
    raise exception 'slot_unavailable' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.appointments recent
    where recent.created_at > now() - interval '90 seconds'
      and (recent.patient_email = normalized_email or recent.patient_phone = normalized_phone)
  ) then
    raise exception 'too_many_bookings' using errcode = 'P0001';
  end if;

  insert into public.appointments (
    doctor_id,
    appointment_date,
    start_time,
    patient_name,
    patient_email,
    patient_phone,
    reason,
    whatsapp_opt_in
  ) values (
    p_doctor_id,
    p_appointment_date,
    parsed_time,
    normalized_name,
    normalized_email,
    normalized_phone,
    normalized_reason,
    coalesce(p_whatsapp_opt_in, false)
  )
  returning id, appointments.booking_reference into inserted_id, inserted_reference;

  return query select inserted_id, inserted_reference;
exception
  when unique_violation then
    raise exception 'slot_unavailable' using errcode = 'P0001';
end;
$$;

create or replace function public.add_doctor_holiday(p_date date, p_note text)
returns table (id uuid, holiday_date date, note text, created_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  doctor_id_value uuid := public.current_doctor_id();
  holiday_id uuid;
begin
  if doctor_id_value is null then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if p_date < (now() at time zone 'Asia/Karachi')::date then
    raise exception 'holiday_date_is_in_the_past' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtext(doctor_id_value::text),
    p_date - date '2000-01-01'
  );

  if exists (
    select 1 from public.appointments appointment
    where appointment.doctor_id = doctor_id_value
      and appointment.appointment_date = p_date
      and appointment.status = 'confirmed'
  ) then
    raise exception 'cancel_existing_appointments_first' using errcode = 'P0001';
  end if;

  insert into public.doctor_holidays (doctor_id, holiday_date, note)
  values (doctor_id_value, p_date, nullif(btrim(p_note), ''))
  returning doctor_holidays.id into holiday_id;

  return query
  select holiday.id, holiday.holiday_date, holiday.note, holiday.created_at
  from public.doctor_holidays holiday
  where holiday.id = holiday_id;
exception
  when unique_violation then
    raise exception 'holiday_already_exists' using errcode = 'P0001';
end;
$$;

create or replace function public.remove_doctor_holiday(p_holiday_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  deleted_count integer;
begin
  delete from public.doctor_holidays holiday
  where holiday.id = p_holiday_id
    and public.is_doctor_admin(holiday.doctor_id);
  get diagnostics deleted_count = row_count;
  return deleted_count > 0;
end;
$$;

alter table public.doctors enable row level security;
alter table public.clinic_schedule enable row level security;
alter table public.doctor_admins enable row level security;
alter table public.doctor_holidays enable row level security;
alter table public.appointments enable row level security;

drop policy if exists doctors_public_read on public.doctors;
create policy doctors_public_read on public.doctors
  for select to anon, authenticated using (active);

drop policy if exists clinic_schedule_public_read on public.clinic_schedule;
create policy clinic_schedule_public_read on public.clinic_schedule
  for select to anon, authenticated using (true);

drop policy if exists doctor_admins_read_own on public.doctor_admins;
create policy doctor_admins_read_own on public.doctor_admins
  for select to authenticated
  using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

drop policy if exists appointments_doctor_read on public.appointments;
create policy appointments_doctor_read on public.appointments
  for select to authenticated using (public.is_doctor_admin(doctor_id));

drop policy if exists appointments_doctor_update on public.appointments;
create policy appointments_doctor_update on public.appointments
  for update to authenticated
  using (public.is_doctor_admin(doctor_id))
  with check (public.is_doctor_admin(doctor_id));

drop policy if exists holidays_doctor_read on public.doctor_holidays;
create policy holidays_doctor_read on public.doctor_holidays
  for select to authenticated using (public.is_doctor_admin(doctor_id));

revoke all on public.doctor_admins from anon, authenticated;
revoke all on public.doctor_holidays from anon, authenticated;
revoke all on public.appointments from anon, authenticated;

grant select on public.doctors, public.clinic_schedule to anon, authenticated;
grant select on public.doctor_admins, public.doctor_holidays, public.appointments to authenticated;
grant update (status, cancellation_reason, cancelled_at) on public.appointments to authenticated;

revoke all on function public.is_doctor_admin(uuid) from public, anon, authenticated;
revoke all on function public.current_doctor_id() from public, anon, authenticated;
revoke all on function public.get_available_slots(uuid, date) from public, anon, authenticated;
revoke all on function public.book_appointment(uuid, date, text, text, text, text, text, boolean) from public, anon, authenticated;
revoke all on function public.add_doctor_holiday(date, text) from public, anon, authenticated;
revoke all on function public.remove_doctor_holiday(uuid) from public, anon, authenticated;

grant execute on function public.is_doctor_admin(uuid) to authenticated;
grant execute on function public.current_doctor_id() to authenticated;
grant execute on function public.get_available_slots(uuid, date) to anon, authenticated;
grant execute on function public.book_appointment(uuid, date, text, text, text, text, text, boolean) to anon, authenticated;
grant execute on function public.add_doctor_holiday(date, text) to authenticated;
grant execute on function public.remove_doctor_holiday(uuid) to authenticated;

commit;
