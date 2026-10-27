import { getAdminEmailConfig } from "@/lib/admin-email";
import { getPaymentSettings } from "@/lib/payment-settings";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminSettingsClient from "./AdminSettingsClient";

export const metadata = {
  title: "Settings | Silver Hawk Admin",
};

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const [config, paymentSettings] = await Promise.all([
    getAdminEmailConfig(),
    getPaymentSettings(),
  ]);

  let adminAccounts: Array<{
    id: string;
    email: string;
    name?: string;
    created_at?: string;
  }> = [];

  try {
    const adminClient = createAdminClient();
    const { data: adminRows } = await adminClient
      .from("admin_users")
      .select("user_id, created_at");

    if (adminRows && adminRows.length > 0) {
      const { data: authUsers } = await adminClient.auth.admin.listUsers();
      if (authUsers?.users) {
        const userMap = new Map(authUsers.users.map((u) => [u.id, u]));
        adminAccounts = adminRows.map((row) => {
          const u = userMap.get(row.user_id);
          return {
            id: row.user_id,
            email: u?.email || "Unknown",
            name:
              (u?.user_metadata?.name as string) ||
              (u?.user_metadata?.full_name as string) ||
              "Administrator",
            created_at: row.created_at,
          };
        });
      }
    }
  } catch (err) {
    console.warn("Could not load admin accounts for settings page:", err);
  }

  return (
    <AdminSettingsClient
      initialConfig={config}
      initialPaymentSettings={paymentSettings}
      adminAccounts={adminAccounts}
    />
  );
}
