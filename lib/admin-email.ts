import { readJsonStorage, writeJsonStorage } from "@/lib/serverless-store";
import { createAdminClient } from "@/lib/supabase/admin";

export type AdminEmailConfig = {
  email: string;
  notification_emails?: string[];
  label?: string;
  updated_at?: string;
};

const DEFAULT_ADMIN_EMAIL = "admin@silverhawk.com";

/**
 * Retrieves the admin email configuration stored in the database (site_settings table).
 * If not yet initialized, automatically persists and returns the default configuration.
 */
export async function getAdminEmailConfig(): Promise<AdminEmailConfig> {
  try {
    const config = await readJsonStorage<AdminEmailConfig | null>(
      "admin_email.json",
      null,
      "admin_email"
    );

    if (config?.email) {
      return config;
    }

    // If not found in site_settings, check Supabase auth & admin_users
    let discoveredEmail = DEFAULT_ADMIN_EMAIL;
    try {
      const adminClient = createAdminClient();
      const { data: adminUsers } = await adminClient
        .from("admin_users")
        .select("user_id")
        .limit(1);

      if (adminUsers && adminUsers.length > 0) {
        const { data: userData } = await adminClient.auth.admin.getUserById(
          adminUsers[0].user_id
        );
        if (userData?.user?.email) {
          discoveredEmail = userData.user.email;
        }
      }
    } catch (e) {
      console.warn("[admin-email] Could not look up admin user from auth table:", e);
    }

    const initialConfig: AdminEmailConfig = {
      email: discoveredEmail,
      notification_emails: [
        discoveredEmail,
        "silverhawkgroup.dmc@gmail.com",
        "aunchitta1410@gmail.com",
      ],
      label: "Primary System Administrator",
      updated_at: new Date().toISOString(),
    };

    // Save to database
    await writeJsonStorage("admin_email.json", initialConfig, "admin_email");
    return initialConfig;
  } catch (error) {
    console.error("Error reading admin email configuration from database:", error);
    return {
      email: DEFAULT_ADMIN_EMAIL,
      notification_emails: [DEFAULT_ADMIN_EMAIL],
      label: "Default System Administrator",
      updated_at: new Date().toISOString(),
    };
  }
}

/**
 * Returns the resolved admin email.
 * 1. If an active session user email is passed and valid, returns that active admin's email.
 * 2. Otherwise, returns the primary admin email retrieved from the database.
 */
export async function getAdminEmail(sessionUserEmail?: string | null): Promise<string> {
  const trimmed = sessionUserEmail?.trim();
  if (trimmed && trimmed.includes("@")) {
    return trimmed;
  }

  const config = await getAdminEmailConfig();
  return config.email || DEFAULT_ADMIN_EMAIL;
}

/**
 * Updates the admin email configuration in the database (site_settings table).
 */
export async function updateAdminEmailConfig(
  updates: Partial<AdminEmailConfig>
): Promise<AdminEmailConfig> {
  const current = await getAdminEmailConfig();
  const updated: AdminEmailConfig = {
    ...current,
    ...updates,
    updated_at: new Date().toISOString(),
  };

  await writeJsonStorage("admin_email.json", updated, "admin_email");
  return updated;
}
