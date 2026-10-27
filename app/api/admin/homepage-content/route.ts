import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getHomepageContent, saveHomepageContent } from "@/lib/homepage-content";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { addAuditLog } from "@/lib/audit-log";
import { getAdminEmail } from "@/lib/admin-email";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const content = await getHomepageContent();
    return NextResponse.json(
      { success: true, content },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (err) {
    console.error("Admin get homepage content error:", err);
    return NextResponse.json(
      { error: "Failed to load homepage content" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    let sessionEmail: string | undefined;
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email) {
        sessionEmail = user.email;
      }
    } catch (authErr) {
      console.warn("Non-fatal auth lookup warning in homepage CMS save:", authErr);
    }
    const adminEmail = await getAdminEmail(sessionEmail);

    const body = await request.json();
    const updated = await saveHomepageContent(body);

    try {
      await addAuditLog({
        action: "UPDATE_HOMEPAGE_CMS",
        adminEmail,
        targetType: "system",
        targetId: 0,
        description: `Updated Homepage CMS content and media in 3 languages`,
      });
    } catch (auditErr) {
      console.warn("Non-fatal audit log error:", auditErr);
    }

    // Invalidate cached pages so updates are immediately reflected live
    try {
      revalidatePath("/[locale]", "layout");
      revalidatePath("/[locale]", "page");
      revalidatePath("/", "layout");
      revalidatePath("/en");
      revalidatePath("/th");
      revalidatePath("/zh");
      revalidatePath("/admin/homepage-cms");
    } catch (cacheErr) {
      console.warn("Non-fatal revalidate warning:", cacheErr);
    }

    // Check if Supabase site_settings table exists
    let supabasePersisted = false;
    let warning: string | undefined;
    try {
      const admin = createAdminClient();
      const { data, error } = await admin
        .from("site_settings")
        .select("key")
        .eq("key", "homepage_content")
        .maybeSingle();

      if (!error && data) {
        supabasePersisted = true;
      } else if (error && error.code === "PGRST205") {
        warning =
          "Supabase table 'public.site_settings' was not found. Your changes are saved locally, but for persistent live updates across Vercel/serverless instances, please run the SQL migration (supabase/migrations/20261026_create_site_settings.sql) in your Supabase dashboard.";
      }
    } catch {
      // Supabase credentials or network issue
    }

    return NextResponse.json(
      { success: true, content: updated, supabasePersisted, warning },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (err: unknown) {
    console.error("Admin save homepage content error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save homepage content" },
      { status: 500 }
    );
  }
}
