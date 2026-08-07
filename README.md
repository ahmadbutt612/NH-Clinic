# NH Gyne Clinic

A responsive clinic website with live 30-minute appointment availability,
Supabase-backed bookings, doctor sign-in, holiday management, appointment
cancellation, WhatsApp contact, and optional Resend email notifications.

## Local setup

1. Copy `.env.example` to `.env.local` and add the Supabase project values plus
   the two doctors' setup credentials.
2. Run `npm run supabase:setup` once. This links the Supabase project, previews
   and applies the migration, and creates the doctor Auth accounts. The first
   run may ask you to sign in to Supabase and enter the database password.
3. If Supabase email confirmation is enabled, open the confirmation message for
   each doctor account.
4. Run `npm run dev` and open `http://localhost:3000`.

Resend is optional during development. Add `RESEND_API_KEY` and a verified
`RESEND_FROM_EMAIL` when confirmation and cancellation email delivery is ready.

All clinic availability is calculated in `Asia/Karachi` time. Sunday is closed;
Monday and Wednesday through Saturday run 5:00–10:00 PM, while Tuesday runs
5:00–10:30 PM.
