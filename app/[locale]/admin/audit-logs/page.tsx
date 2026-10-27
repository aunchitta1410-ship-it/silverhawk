import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuditLogs } from "@/lib/audit-log";
import AuditLogClient from "./AuditLogClient";

type Props = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function AuditLogsPage({ params }: Props) {
  const { locale } = await params;

  // 1. Verify user session
  const sessionClient = await createClient();
  const {
    data: { user },
    error: authError,
  } = await sessionClient.auth.getUser();

  if (authError || !user) {
    redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/admin/audit-logs`)}`);
  }

  // 2. Verify admin permission
  const adminClient = createAdminClient();
  const { data: adminRecord } = await adminClient
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminRecord) {
    redirect(`/${locale}`);
  }

  const logs = await getAuditLogs();

  return (
    <AuditLogClient
      initialLogs={logs}
      locale={locale}
    />
  );
}

