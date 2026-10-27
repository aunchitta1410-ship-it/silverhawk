import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSitePolicies, saveSitePolicies } from "@/lib/site-policies";
import { createClient } from "@/lib/supabase/server";
import { addAuditLog } from "@/lib/audit-log";
import { getAdminEmail } from "@/lib/admin-email";

export async function GET() {
  try {
    const policies = await getSitePolicies();
    return NextResponse.json({ success: true, policies });
  } catch (err) {
    console.error("Admin get policies error:", err);
    return NextResponse.json(
      { error: "Failed to load policies" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const body = await request.json();
    const updated = await saveSitePolicies(body);

    const adminEmail = await getAdminEmail(user?.email);
    await addAuditLog({
      action: "UPDATE_POLICIES",
      adminEmail,
      targetType: "system",
      targetId: 0,
      description: `Updated PDPA and Cancellation Terms & Conditions (PDPA ${updated.pdpa.version})`,
    });

    try {
      revalidatePath("/[locale]/tours", "page");
      revalidatePath("/[locale]/tours/[id]", "page");
      revalidatePath("/[locale]/booking", "page");
    } catch (revErr) {
      console.warn("Policies revalidate error:", revErr);
    }

    return NextResponse.json({ success: true, policies: updated });
  } catch (err) {
    console.error("Admin save policies error:", err);
    return NextResponse.json(
      { error: "Failed to save policies" },
      { status: 500 }
    );
  }
}
