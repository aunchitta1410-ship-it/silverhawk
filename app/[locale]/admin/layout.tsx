import { Suspense, type ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminSidebar from "./AdminSidebar";

type AdminLayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function AdminLayout({
  children,
  params,
}: AdminLayoutProps) {
  const { locale } = await params;

  // 1. Check whether the user is logged in.
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect(
      `/${locale}/login?next=${encodeURIComponent(`/${locale}/admin`)}`
    );
  }

  // 2. Check whether the logged-in user is an admin.
  const adminClient = createAdminClient();

  const { data: adminRecord, error: adminError } =
    await adminClient
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

  if (adminError) {
    console.error("Admin permission check failed:", adminError);
    throw new Error("Unable to verify admin permission.");
  }

  if (!adminRecord) {
    redirect(`/${locale}`);
  }

  // 3. Render the admin area with the updated sidebar.
  return (
    <div className="flex min-h-screen bg-gray-100">
      <Suspense fallback={<aside className="w-64 bg-[#17352A] p-6 text-white min-h-screen shrink-0" />}>
        <AdminSidebar />
      </Suspense>

      <main className="min-w-0 flex-1">
        {children}
      </main>
    </div>
  );
}
