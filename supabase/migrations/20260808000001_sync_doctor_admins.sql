begin;

delete from public.doctor_admins
where doctor_id in (
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222'
);

insert into public.doctor_admins (doctor_id, email)
values
  ('11111111-1111-4111-8111-111111111111', 'ahmedbut612@gmail.com'),
  ('22222222-2222-4222-8222-222222222222', 'ahmedbut612@gmail.com')
on conflict (doctor_id, email) do nothing;

commit;
