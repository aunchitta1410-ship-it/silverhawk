import { readJsonStorage, writeJsonStorage } from "@/lib/serverless-store";

export type PaymentSettings = {
  // PromptPay QR Details
  promptpay_enabled: boolean;
  promptpay_qr_image_url: string;
  promptpay_id: string;
  promptpay_account_name: string;
  promptpay_notes: string;

  // Direct Bank Transfer Details
  bank_transfer_enabled: boolean;
  bank_name: string;
  bank_code: string;
  bank_branch: string;
  account_name: string;
  account_number: string;
  swift_code?: string;
  bank_instructions: string;

  // Metadata
  updated_at?: string;
  updated_by?: string;
};

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  promptpay_enabled: true,
  promptpay_qr_image_url: "/images/promptpay-qr.svg",
  promptpay_id: "063-606-4199",
  promptpay_account_name: "Silver Hawk Group Co., Ltd.",
  promptpay_notes: "Scan QR with any Thai Mobile Banking app and upload your transfer slip.",

  bank_transfer_enabled: true,
  bank_name: "Kasikornbank (KBank)",
  bank_code: "KBANK",
  bank_branch: "Phuket Town Branch",
  account_name: "Silver Hawk Group Co., Ltd.",
  account_number: "045-8-91234-0",
  swift_code: "KASITHBK",
  bank_instructions: "Please transfer the exact booking amount to the account above and upload the transfer slip below for verification.",
  updated_at: "2026-10-26T12:00:00.000Z",
  updated_by: "system",
};

export async function getPaymentSettings(): Promise<PaymentSettings> {
  try {
    const data = await readJsonStorage<PaymentSettings>(
      "payment_settings.json",
      DEFAULT_PAYMENT_SETTINGS,
      "payment_settings"
    );

    return {
      ...DEFAULT_PAYMENT_SETTINGS,
      ...(data || {}),
    };
  } catch (error) {
    console.error("Error reading payment settings:", error);
    return DEFAULT_PAYMENT_SETTINGS;
  }
}

export async function savePaymentSettings(
  settings: Partial<PaymentSettings>,
  updatedBy: string = "admin"
): Promise<PaymentSettings> {
  const current = await getPaymentSettings();
  const updated: PaymentSettings = {
    ...current,
    ...settings,
    updated_at: new Date().toISOString(),
    updated_by: updatedBy,
  };

  await writeJsonStorage("payment_settings.json", updated, "payment_settings");
  return updated;
}
