
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { createInterface } from "node:readline/promises";

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

try {
  const email = (await rl.question("Admin email: ")).trim();
  const password = await rl.question("New password (minimum 8 characters): ");

  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error("Missing environment variables in .env.local.");
  }

  const supabase = createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  let targetUser = null;
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 100,
    });

    if (error) throw error;

    targetUser = data.users.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase()
    );

    if (targetUser || data.users.length < 100) break;
    page += 1;
  }

  if (!targetUser) {
    throw new Error("No existing user found for that email.");
  }

  const { error: updateError } =
    await supabase.auth.admin.updateUserById(targetUser.id, {
      password,
    });

  if (updateError) throw updateError;

  console.log("Password updated for the existing user.");
  console.log("The account was not recreated.");
} catch (error) {
  console.error("Failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  rl.close();
}
