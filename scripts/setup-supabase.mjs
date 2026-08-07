import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { prepareMigration } from "./prepare-supabase.mjs";

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required in .env.local`);
  return value;
}

function runSupabase(args, options = {}) {
  const isWindows = process.platform === "win32";
  const command = isWindows
    ? process.execPath
    : "npx";
  const commandArgs = isWindows
    ? [join(dirname(process.execPath), "node_modules", "npm", "bin", "npx-cli.js"), "supabase", ...args]
    : ["supabase", ...args];
  const result = spawnSync(command, commandArgs, {
    stdio: options.quiet ? "ignore" : "inherit",
    env: process.env,
    shell: false,
  });
  if (result.error && !options.quiet) {
    console.error(`Could not start Supabase CLI: ${result.error.message}`);
  }
  return result.status === 0;
}

async function provisionDoctor(url, key, emailName, passwordName) {
  const email = required(emailName).toLowerCase();
  const password = required(passwordName);
  if (password.length < 10) throw new Error(`${passwordName} must contain at least 10 characters`);

  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await client.auth.signUp({ email, password });

  if (error && !/already registered|already exists/i.test(error.message)) {
    throw new Error(`Could not create ${email}: ${error.message}`);
  }

  if (data.session) {
    console.log(`Doctor account is ready: ${email}`);
  } else {
    console.log(`Doctor account created: ${email}. Open its Supabase confirmation email before signing in.`);
  }
}

async function main() {
  const url = required("NEXT_PUBLIC_SUPABASE_URL");
  const key = required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  const hostname = new URL(url).hostname;
  const projectRef = hostname.split(".")[0];
  if (!projectRef || !hostname.endsWith(".supabase.co")) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must be a hosted Supabase project URL");
  }

  await prepareMigration();
  console.log("Prepared the NH Gyne Clinic database migration.");

  if (!process.env.SUPABASE_ACCESS_TOKEN && !runSupabase(["projects", "list"], { quiet: true })) {
    console.log("Supabase CLI sign-in is required once. Follow the prompt, then setup will continue.");
    if (!runSupabase(["login"])) throw new Error("Supabase login was not completed");
  }

  if (!runSupabase(["link", "--project-ref", projectRef])) {
    throw new Error("Could not link the Supabase project. Check its database password and try again.");
  }
  if (!runSupabase(["db", "push", "--dry-run"])) {
    throw new Error("The migration dry run failed; no schema changes were applied.");
  }
  if (!runSupabase(["db", "push"])) {
    throw new Error("The Supabase migration could not be applied.");
  }

  await provisionDoctor(url, key, "DOCTOR_UMAR_EMAIL", "DOCTOR_UMAR_PASSWORD");
  await provisionDoctor(url, key, "DOCTOR_SOFIA_EMAIL", "DOCTOR_SOFIA_PASSWORD");
  console.log("NH Gyne Clinic Supabase setup is complete.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
