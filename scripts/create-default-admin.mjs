import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!url || !secretKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local");
  process.exit(1);
}

const adminClient = createClient(url, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const email = process.argv[2] || "admin@silverhawk.com";
const password = process.argv[3] || "silver@26";

async function main() {
  console.log(`Setting up admin user: ${email}`);

  const { data: listData, error: listErr } = await adminClient.auth.admin.listUsers();
  if (listErr) {
    console.error("Failed to list users:", listErr);
    process.exit(1);
  }

  let user = listData.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

  if (!user) {
    console.log("Creating user in Supabase Auth...");
    const { data: createData, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: "admin", name: "Default Admin" },
    });

    if (createErr) {
      console.error("Error creating user:", createErr.message);
      process.exit(1);
    }
    user = createData.user;
    console.log(`Created user with ID: ${user.id}`);
  } else {
    console.log(`User exists (${user.id}). Updating password and confirming email...`);
    const { error: updateErr } = await adminClient.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
    });
    if (updateErr) {
      console.error("Error updating password:", updateErr.message);
      process.exit(1);
    }
  }

  // Check admin_users table
  const { data: existingAdmin } = await adminClient
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existingAdmin) {
    console.log("Granting admin privileges in admin_users table...");
    const { error: insertErr } = await adminClient
      .from("admin_users")
      .insert({ user_id: user.id });

    if (insertErr) {
      console.error("Error inserting into admin_users:", insertErr.message);
      process.exit(1);
    }
  }

  // Also record/sync the admin email in site_settings database table
  console.log("Syncing admin email in database (site_settings)...");
  await adminClient.from("site_settings").upsert({
    key: "admin_email",
    value: {
      email,
      label: "Primary System Administrator",
      notification_emails: [email],
      updated_at: new Date().toISOString(),
    },
    updated_at: new Date().toISOString(),
  }, { onConflict: "key" });

  console.log("\n========================================");
  console.log("Admin account is ready!");
  console.log(`Email:    ${email}`);
  console.log(`Password: ${password}`);
  console.log("========================================\n");
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});

