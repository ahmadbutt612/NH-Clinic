import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, "..");
const templatePath = resolve(projectRoot, "supabase/templates/clinic_schema.sql");
const migrationPath = resolve(
  projectRoot,
  "supabase/migrations/20260808000000_nh_clinic_schema.sql",
);
const adminSyncMigrationPath = resolve(
  projectRoot,
  "supabase/migrations/20260808000001_sync_doctor_admins.sql",
);

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required in .env.local`);
  return value;
}

function validateEmail(name, value) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw new Error(`${name} must be a valid email address`);
  }
}

function sqlLiteral(value) {
  return value.toLowerCase().replaceAll("'", "''");
}

export async function prepareMigration() {
  const umarEmail = required("DOCTOR_UMAR_EMAIL");
  const sofiaEmail = required("DOCTOR_SOFIA_EMAIL");
  validateEmail("DOCTOR_UMAR_EMAIL", umarEmail);
  validateEmail("DOCTOR_SOFIA_EMAIL", sofiaEmail);

  const template = await readFile(templatePath, "utf8");
  const migration = template
    .replaceAll("__DOCTOR_UMAR_EMAIL__", sqlLiteral(umarEmail))
    .replaceAll("__DOCTOR_SOFIA_EMAIL__", sqlLiteral(sofiaEmail));

  await mkdir(dirname(migrationPath), { recursive: true });
  await writeFile(migrationPath, migration, "utf8");
  const adminSyncMigration = `begin;

delete from public.doctor_admins
where doctor_id in (
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222'
);

insert into public.doctor_admins (doctor_id, email)
values
  ('11111111-1111-4111-8111-111111111111', '${sqlLiteral(umarEmail)}'),
  ('22222222-2222-4222-8222-222222222222', '${sqlLiteral(sofiaEmail)}')
on conflict (doctor_id, email) do nothing;

commit;
`;
  await writeFile(adminSyncMigrationPath, adminSyncMigration, "utf8");
  return migrationPath;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const path = await prepareMigration();
    console.log(`Prepared Supabase migration: ${path}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
