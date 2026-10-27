import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getAdminEmailConfig,
  updateAdminEmailConfig,
  getAdminEmail,
} from "@/lib/admin-email";
import { addAuditLog } from "@/lib/audit-log";

export const runtime = "nodejs";

async function verifyAdmin() {
  const sessionClient = await createClient();
  const {
    data: { user },
    error: authError,
  } = await sessionClient.auth.getUser();

  if (authError || !user) {
    return {
      user: null,
      errorResponse: NextResponse.json(
        { error: "Please log in to continue." },
        { status: 401 }
      ),
    };
  }

  const adminClient = createAdminClient();
  const { data: admin, error: adminError } = await adminClient
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (adminError || !admin) {
    return {
      user: null,
      errorResponse: NextResponse.json(
        { error: "Admin access required." },
        { status: 403 }
      ),
    };
  }

  return { user, errorResponse: null };
}

// GET /api/admin/settings/email
export async function GET() {
  try {
    const { errorResponse } = await verifyAdmin();
    if (errorResponse) return errorResponse;

    const config = await getAdminEmailConfig();

    // Also fetch all admin accounts from database
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
              name: (u?.user_metadata?.name as string) || (u?.user_metadata?.full_name as string) || "Administrator",
              created_at: row.created_at,
            };
          });
        }
      }
    } catch (e) {
      console.warn("Could not list admin accounts:", e);
    }

    return NextResponse.json({
      success: true,
      config,
      adminAccounts,
    });
  } catch (error) {
    console.error("GET admin email settings error:", error);
    return NextResponse.json(
      { error: "Failed to load admin email settings" },
      { status: 500 }
    );
  }
}

// POST /api/admin/settings/email
export async function POST(request: Request) {
  try {
    const { user, errorResponse } = await verifyAdmin();
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const newEmail = typeof body.email === "string" ? body.email.trim() : "";

    if (!newEmail || !newEmail.includes("@")) {
      return NextResponse.json(
        { error: "A valid admin email address is required." },
        { status: 400 }
      );
    }

    let notificationEmails: string[] = [];
    if (Array.isArray(body.notification_emails)) {
      notificationEmails = body.notification_emails
        .map((e: unknown) => (typeof e === "string" ? e.trim() : ""))
        .filter((e: string) => e.length > 0 && e.includes("@"));
    }

    const updated = await updateAdminEmailConfig({
      email: newEmail,
      label: typeof body.label === "string" ? body.label.trim() : "Primary System Administrator",
      ...(notificationEmails.length > 0 ? { notification_emails: notificationEmails } : {}),
    });

    const activeAdminEmail = await getAdminEmail(user?.email);
    await addAuditLog({
      action: "UPDATE_ADMIN_SETTINGS",
      adminEmail: activeAdminEmail,
      targetType: "system",
      targetId: 0,
      description: `Updated system admin email in database to: ${newEmail}`,
    });

    return NextResponse.json({
      success: true,
      config: updated,
    });
  } catch (error) {
    console.error("POST admin email settings error:", error);
    return NextResponse.json(
      { error: "Failed to update admin email settings in database" },
      { status: 500 }
    );
  }
}
