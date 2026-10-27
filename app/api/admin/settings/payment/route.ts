import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPaymentSettings, savePaymentSettings, type PaymentSettings } from "@/lib/payment-settings";
import { addAuditLog } from "@/lib/audit-log";
import { getAdminEmail } from "@/lib/admin-email";

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

// GET /api/admin/settings/payment
export async function GET() {
  try {
    const { errorResponse } = await verifyAdmin();
    if (errorResponse) return errorResponse;

    const settings = await getPaymentSettings();
    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error("GET payment settings error:", error);
    return NextResponse.json(
      { error: "Failed to load payment settings" },
      { status: 500 }
    );
  }
}

// POST /api/admin/settings/payment
export async function POST(request: Request) {
  try {
    const { user, errorResponse } = await verifyAdmin();
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const adminEmail = await getAdminEmail(user?.email);

    const updated = await savePaymentSettings(body, adminEmail);

    try {
      await addAuditLog({
        action: "UPDATE_PAYMENT_SETTINGS",
        adminEmail,
        targetType: "system",
        targetId: "payment_settings",
        description: `Updated PromptPay QR and Bank Account details (${updated.bank_name}: ${updated.account_number}, PromptPay: ${updated.promptpay_id})`,
      });
    } catch (auditErr) {
      console.warn("Could not log payment settings update:", auditErr);
    }

    try {
      revalidatePath("/[locale]/Payment", "page");
      revalidatePath("/[locale]/admin/settings", "page");
      revalidatePath("/[locale]/admin/payments", "page");
    } catch (revErr) {
      console.warn("Revalidation warning:", revErr);
    }

    return NextResponse.json({
      success: true,
      settings: updated,
    });
  } catch (error: any) {
    console.error("POST payment settings error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update payment settings" },
      { status: 500 }
    );
  }
}
