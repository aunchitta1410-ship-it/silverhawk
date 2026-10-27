import { readJsonStorage, writeJsonStorage } from "@/lib/serverless-store";

export type AuditLogEntry = {
  id: string;
  timestamp: string;
  action:
    | "APPROVE_BOOKING"
    | "CANCEL_BOOKING"
    | "EDIT_BOOKING"
    | "REJECT_BOOKING"
    | "UPDATE_TOUR"
    | "UPDATE_PICKUP"
    | "PAYMENT_RECORDED"
    | "STRIPE_PAYMENT_SUCCESS"
    | "VERIFY_PAYMENT_SLIP"
    | "REJECT_PAYMENT_SLIP"
    | "ADMIN_LOGIN"
    | "UPDATE_STATUS"
    | "UPDATE_POLICIES"
    | "UPDATE_HOMEPAGE_CMS"
    | "UPDATE_ADMIN_SETTINGS"
    | "UPDATE_PAYMENT_SETTINGS";
  adminEmail: string;
  targetType: "booking" | "tour" | "payment" | "system";
  targetId: string | number;
  description: string;
  metadata?: Record<string, unknown>;
};

export async function getAuditLogs(): Promise<AuditLogEntry[]> {
  try {
    const logs = await readJsonStorage<AuditLogEntry[]>(
      "audit_logs.json",
      [],
      "audit_logs"
    );
    return Array.isArray(logs)
      ? logs.sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
      : [];
  } catch (error) {
    console.error("Error reading audit logs:", error);
    return [];
  }
}

export async function addAuditLog(
  entry: Omit<AuditLogEntry, "id" | "timestamp">
): Promise<AuditLogEntry> {
  const newLog: AuditLogEntry = {
    ...entry,
    id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
  };
  try {
    const logs = await getAuditLogs();
    logs.unshift(newLog);
    // Keep last 1,000 logs
    const trimmed = logs.slice(0, 1000);
    await writeJsonStorage("audit_logs.json", trimmed, "audit_logs");
    return newLog;
  } catch (error) {
    console.error("Error writing audit log:", error);
    return newLog;
  }
}

