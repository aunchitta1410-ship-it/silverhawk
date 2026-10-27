"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { AdminEmailConfig } from "@/lib/admin-email";
import type { PaymentSettings } from "@/lib/payment-settings";

type AdminAccount = {
  id: string;
  email: string;
  name?: string;
  created_at?: string;
};

type Props = {
  initialConfig: AdminEmailConfig;
  initialPaymentSettings: PaymentSettings;
  adminAccounts: AdminAccount[];
};

const COMMON_THAI_BANKS = [
  { name: "Kasikornbank (KBank)", code: "KBANK", color: "bg-[#00A950]", short: "K+" },
  { name: "Siam Commercial Bank (SCB)", code: "SCB", color: "bg-[#4E2A84]", short: "SCB" },
  { name: "Bangkok Bank (BBL)", code: "BBL", color: "bg-[#1E3A8A]", short: "BBL" },
  { name: "Krungthai Bank (KTB)", code: "KTB", color: "bg-[#00A3E0]", short: "KTB" },
  { name: "TMBThanachart Bank (ttb)", code: "TTB", color: "bg-[#0050F0]", short: "ttb" },
  { name: "Bank of Ayudhya (Krungsri)", code: "BAY", color: "bg-[#FFC845] text-gray-900", short: "BAY" },
];

export default function AdminSettingsClient({
  initialConfig,
  initialPaymentSettings,
  adminAccounts,
}: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Tab State: "payment" | "email" | "accounts"
  const tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<"payment" | "email" | "accounts">(
    tabFromUrl === "email" || tabFromUrl === "accounts" ? tabFromUrl : "payment"
  );

  // Email Config State
  const [email, setEmail] = useState(initialConfig.email || "admin@silverhawk.com");
  const [label, setLabel] = useState(initialConfig.label || "Primary System Administrator");
  const [notificationEmailsStr, setNotificationEmailsStr] = useState(
    (initialConfig.notification_emails || [initialConfig.email || "admin@silverhawk.com"]).join(", ")
  );
  const [savingEmail, setSavingEmail] = useState(false);

  // Payment Settings State
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>(initialPaymentSettings);
  const [promptpayEnabled, setPromptpayEnabled] = useState(initialPaymentSettings.promptpay_enabled ?? true);
  const [promptpayQrUrl, setPromptpayQrUrl] = useState(initialPaymentSettings.promptpay_qr_image_url || "/images/promptpay-qr.svg");
  const [promptpayId, setPromptpayId] = useState(initialPaymentSettings.promptpay_id || "063-606-4199");
  const [promptpayAccountName, setPromptpayAccountName] = useState(initialPaymentSettings.promptpay_account_name || "Silver Hawk Group Co., Ltd.");
  const [promptpayNotes, setPromptpayNotes] = useState(
    initialPaymentSettings.promptpay_notes || "Scan QR with any Thai Mobile Banking app and upload your transfer slip."
  );

  const [bankTransferEnabled, setBankTransferEnabled] = useState(initialPaymentSettings.bank_transfer_enabled ?? true);
  const [bankName, setBankName] = useState(initialPaymentSettings.bank_name || "Kasikornbank (KBank)");
  const [bankCode, setBankCode] = useState(initialPaymentSettings.bank_code || "KBANK");
  const [bankBranch, setBankBranch] = useState(initialPaymentSettings.bank_branch || "Phuket Town Branch");
  const [accountName, setAccountName] = useState(initialPaymentSettings.account_name || "Silver Hawk Group Co., Ltd.");
  const [accountNumber, setAccountNumber] = useState(initialPaymentSettings.account_number || "045-8-91234-0");
  const [swiftCode, setSwiftCode] = useState(initialPaymentSettings.swift_code || "KASITHBK");
  const [bankInstructions, setBankInstructions] = useState(
    initialPaymentSettings.bank_instructions ||
      "Please transfer the exact booking amount to the account above and upload the transfer slip below for verification."
  );

  // QR Upload State
  const [selectedQrFile, setSelectedQrFile] = useState<File | null>(null);
  const [qrFilePreview, setQrFilePreview] = useState<string | null>(null);
  const [isUploadingQr, setIsUploadingQr] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);

  // Alerts
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(
    initialPaymentSettings.updated_at || initialConfig.updated_at || null
  );

  // Handle Tab Switch
  const handleTabChange = (tab: "payment" | "email" | "accounts") => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`?${params.toString()}`);
  };

  // Handle QR File Selection
  const handleQrFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage("File size exceeds 5MB. Please choose a smaller image.");
        return;
      }
      setSelectedQrFile(file);
      const url = URL.createObjectURL(file);
      setQrFilePreview(url);
    }
  };

  // Handle Instant QR Upload
  const handleUploadQr = async () => {
    if (!selectedQrFile) return;
    setIsUploadingQr(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedQrFile);

      const res = await fetch("/api/admin/settings/payment/upload-qr", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to upload PromptPay QR code.");
      }

      setPromptpayQrUrl(data.image_url);
      setQrFilePreview(null);
      setSelectedQrFile(null);
      setSuccessMessage("PromptPay QR code uploaded and saved to settings successfully!");
      setLastSavedAt(new Date().toISOString());
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to upload QR image.");
    } finally {
      setIsUploadingQr(false);
    }
  };

  // Reset QR to Default SVG
  const handleResetDefaultQr = () => {
    if (confirm("Reset PromptPay QR code to default template?")) {
      setPromptpayQrUrl("/images/promptpay-qr.svg");
      setQrFilePreview(null);
      setSelectedQrFile(null);
    }
  };

  // Handle Bank Selection
  const handleBankSelect = (bName: string, bCode: string) => {
    setBankName(bName);
    setBankCode(bCode);
  };

  // Save Payment & Bank Settings
  async function handleSavePaymentSettings(e: React.FormEvent) {
    e.preventDefault();
    setSavingPayment(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    if (!accountNumber.trim()) {
      setErrorMessage("Please enter a valid bank account number.");
      setSavingPayment(false);
      return;
    }

    if (!promptpayId.trim()) {
      setErrorMessage("Please enter a valid PromptPay phone number or Tax ID.");
      setSavingPayment(false);
      return;
    }

    try {
      const payload: Partial<PaymentSettings> = {
        promptpay_enabled: promptpayEnabled,
        promptpay_qr_image_url: promptpayQrUrl,
        promptpay_id: promptpayId.trim(),
        promptpay_account_name: promptpayAccountName.trim(),
        promptpay_notes: promptpayNotes.trim(),

        bank_transfer_enabled: bankTransferEnabled,
        bank_name: bankName.trim(),
        bank_code: bankCode.trim(),
        bank_branch: bankBranch.trim(),
        account_name: accountName.trim(),
        account_number: accountNumber.trim(),
        swift_code: swiftCode.trim(),
        bank_instructions: bankInstructions.trim(),
      };

      const res = await fetch("/api/admin/settings/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update payment settings.");
      }

      setPaymentSettings(data.settings);
      setSuccessMessage("PromptPay QR & Bank Account settings saved to database successfully.");
      setLastSavedAt(data.settings?.updated_at || new Date().toISOString());
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setErrorMessage(err?.message || "Error saving payment settings.");
    } finally {
      setSavingPayment(false);
    }
  }

  // Save Admin Email Settings
  async function handleSaveEmail(e: React.FormEvent) {
    e.preventDefault();
    setSavingEmail(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setErrorMessage("Please enter a valid primary admin email address.");
      setSavingEmail(false);
      return;
    }

    const notificationEmails = notificationEmailsStr
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0 && item.includes("@"));

    try {
      const res = await fetch("/api/admin/settings/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmedEmail,
          label: label.trim(),
          notification_emails: notificationEmails,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update admin email settings");
      }

      setSuccessMessage("Admin email configuration updated and saved to database successfully.");
      setLastSavedAt(data.config?.updated_at || new Date().toISOString());
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error saving settings";
      setErrorMessage(msg);
    } finally {
      setSavingEmail(false);
    }
  }

  const selectedBankInfo = COMMON_THAI_BANKS.find((b) => b.name === bankName) || {
    name: bankName,
    code: bankCode || "BANK",
    color: "bg-[#17352A]",
    short: bankCode?.slice(0, 3) || "BNK",
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">System & Payment Settings</h1>
            <p className="text-sm text-gray-500 mt-1">
              Configure official PromptPay QR code, bank account numbers for transfers, admin notification emails, and accounts.
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Supabase Persistent Sync
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-6 border-b border-gray-200 flex gap-2">
          <button
            type="button"
            onClick={() => handleTabChange("payment")}
            className={`pb-3 px-4 text-sm font-bold border-b-2 flex items-center gap-2 transition ${
              activeTab === "payment"
                ? "border-[#B89450] text-[#17352A]"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <span>💳</span>
            <span>PromptPay QR & Bank Accounts</span>
            <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
              Checkout
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("email")}
            className={`pb-3 px-4 text-sm font-bold border-b-2 flex items-center gap-2 transition ${
              activeTab === "email"
                ? "border-[#B89450] text-[#17352A]"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <span>📧</span>
            <span>Admin Email & Notifications</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("accounts")}
            className={`pb-3 px-4 text-sm font-bold border-b-2 flex items-center gap-2 transition ${
              activeTab === "accounts"
                ? "border-[#B89450] text-[#17352A]"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <span>👥</span>
            <span>Authorized Accounts</span>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
              {adminAccounts.length}
            </span>
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <span>✅</span>
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-600 hover:text-emerald-900 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-600 hover:text-rose-900 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* TAB 1: PROMPTPAY QR & BANK ACCOUNT SETTINGS */}
      {activeTab === "payment" && (
        <div className="space-y-8">
          <form onSubmit={handleSavePaymentSettings} className="space-y-8">
            {/* SECTION 1: PROMPTPAY QR METHOD */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
              <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-[#FAF8F3] border border-[#B89450]/30 flex items-center justify-center text-lg">
                    📱
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">
                      Thai QR / PromptPay Payment Settings
                    </h2>
                    <p className="text-xs text-gray-500">
                      Upload your official PromptPay QR code image and specify the PromptPay ID shown to customers at checkout.
                    </p>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-gray-200 shadow-2xs">
                  <input
                    type="checkbox"
                    checked={promptpayEnabled}
                    onChange={(e) => setPromptpayEnabled(e.target.checked)}
                    className="accent-[#B89450] h-4 w-4 rounded"
                  />
                  <span className="text-xs font-bold text-gray-700">
                    {promptpayEnabled ? "PromptPay Active" : "Disabled at Checkout"}
                  </span>
                </label>
              </div>

              <div className="p-6 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
                {/* QR Code Upload & Preview Area */}
                <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#B89450]/40 bg-[#FAF8F3] p-5 text-center">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#B89450] mb-3">
                    Active PromptPay QR
                  </p>

                  <div className="relative group bg-white p-2.5 rounded-xl border border-gray-200 shadow-xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrFilePreview || promptpayQrUrl || "/images/promptpay-qr.svg"}
                      alt="PromptPay QR Code Preview"
                      className="h-48 w-48 object-contain rounded-lg"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = "/images/promptpay-qr.svg";
                      }}
                    />
                  </div>

                  <p className="mt-3 text-xs font-bold text-gray-900">
                    {promptpayAccountName || "Silver Hawk Group"}
                  </p>
                  <p className="text-[11px] font-mono text-gray-500">
                    ID: {promptpayId || "063-606-4199"}
                  </p>

                  {/* QR Image Upload Controls */}
                  <div className="mt-4 w-full space-y-2">
                    <input
                      type="file"
                      id="qr-file-input"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={handleQrFileChange}
                    />

                    <label
                      htmlFor="qr-file-input"
                      className="block w-full cursor-pointer rounded-xl bg-white border border-[#B89450] px-3 py-2 text-xs font-bold text-[#17352A] hover:bg-[#FAF8F3] transition shadow-2xs"
                    >
                      {selectedQrFile ? "Change Selected File" : "Choose New QR Image"}
                    </label>

                    {selectedQrFile && (
                      <div className="rounded-lg bg-amber-50 p-2 text-[11px] text-amber-800 border border-amber-200 text-left">
                        <span className="font-semibold block truncate">
                          📄 {selectedQrFile.name}
                        </span>
                        <span className="text-gray-500">
                          ({(selectedQrFile.size / 1024).toFixed(1)} KB)
                        </span>
                        <div className="mt-2 flex gap-1.5">
                          <button
                            type="button"
                            disabled={isUploadingQr}
                            onClick={handleUploadQr}
                            className="rounded-md bg-[#17352A] text-[#D1B16A] px-2.5 py-1 text-xs font-bold hover:bg-[#122b22] transition disabled:opacity-50"
                          >
                            {isUploadingQr ? "Uploading..." : "Save & Use This QR"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedQrFile(null);
                              setQrFilePreview(null);
                            }}
                            className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-2 text-[10px] text-gray-400">
                      <span>Supports PNG, JPG, WebP, SVG</span>
                      <button
                        type="button"
                        onClick={handleResetDefaultQr}
                        className="text-[#B89450] hover:underline"
                      >
                        Reset to default
                      </button>
                    </div>
                  </div>
                </div>

                {/* PromptPay Fields Form */}
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        PromptPay ID (Phone / Tax ID / Biller ID) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={promptpayId}
                        onChange={(e) => setPromptpayId(e.target.value)}
                        placeholder="e.g. 063-606-4199 or 0105562018888"
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#17352A] transition"
                      />
                      <p className="text-[11px] text-gray-500 mt-1">
                        Thai registered mobile phone number, National ID, or 13-digit Corporate Tax ID.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        PromptPay Merchant / Account Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={promptpayAccountName}
                        onChange={(e) => setPromptpayAccountName(e.target.value)}
                        placeholder="Silver Hawk Group Co., Ltd."
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#17352A] transition"
                      />
                      <p className="text-[11px] text-gray-500 mt-1">
                        Exact recipient company name displayed on customer banking app when QR is scanned.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      PromptPay Customer Instructions & Guidance
                    </label>
                    <textarea
                      rows={2}
                      value={promptpayNotes}
                      onChange={(e) => setPromptpayNotes(e.target.value)}
                      placeholder="Instructions shown to customers below the QR code..."
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#17352A] transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Current QR Image URL / Storage Path
                    </label>
                    <input
                      type="text"
                      value={promptpayQrUrl}
                      onChange={(e) => setPromptpayQrUrl(e.target.value)}
                      placeholder="/images/promptpay-qr.svg"
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 text-xs font-mono text-gray-600 focus:outline-none"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">
                      Direct asset URL or Supabase storage link. Updates automatically when uploading a new file.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: DIRECT BANK ACCOUNT DETAILS */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
              <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-lg">
                    🏦
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">
                      Direct Bank Transfer Account Details
                    </h2>
                    <p className="text-xs text-gray-500">
                      Bank name, branch, account number, and holder name displayed to customers choosing bank transfer.
                    </p>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-gray-200 shadow-2xs">
                  <input
                    type="checkbox"
                    checked={bankTransferEnabled}
                    onChange={(e) => setBankTransferEnabled(e.target.checked)}
                    className="accent-emerald-600 h-4 w-4 rounded"
                  />
                  <span className="text-xs font-bold text-gray-700">
                    {bankTransferEnabled ? "Bank Transfer Active" : "Disabled at Checkout"}
                  </span>
                </label>
              </div>

              <div className="p-6 space-y-6">
                {/* Popular Bank Selection Chips */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Select Bank Institution:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {COMMON_THAI_BANKS.map((b) => {
                      const isSelected = bankName === b.name;
                      return (
                        <button
                          key={b.code}
                          type="button"
                          onClick={() => handleBankSelect(b.name, b.code)}
                          className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                            isSelected
                              ? "border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20"
                              : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          <span
                            className={`flex h-5 w-5 items-center justify-center rounded-md font-bold text-white text-[9px] ${b.color}`}
                          >
                            {b.short}
                          </span>
                          <span>{b.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Bank Fields Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Bank Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="Kasikornbank (KBank)"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#17352A] transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Branch Name
                    </label>
                    <input
                      type="text"
                      value={bankBranch}
                      onChange={(e) => setBankBranch(e.target.value)}
                      placeholder="Phuket Town Branch"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#17352A] transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Beneficiary Account Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      placeholder="Silver Hawk Group Co., Ltd."
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#17352A] transition"
                    />
                    <p className="text-[11px] text-gray-500 mt-1">
                      Must match the official registered bank account title.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Bank Account Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="045-8-91234-0"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-base font-mono font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#17352A] tracking-wider transition"
                    />
                    <p className="text-[11px] text-gray-500 mt-1">
                      Includes hyphens for clarity (e.g. 045-8-91234-0). Customers can copy this with 1 click.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      SWIFT / BIC Code (For International Wire Transfers)
                    </label>
                    <input
                      type="text"
                      value={swiftCode}
                      onChange={(e) => setSwiftCode(e.target.value)}
                      placeholder="e.g. KASITHBK"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#17352A] transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Bank Code / Identifier
                    </label>
                    <input
                      type="text"
                      value={bankCode}
                      onChange={(e) => setBankCode(e.target.value)}
                      placeholder="e.g. KBANK"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#17352A] transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Customer Transfer Notice & Instructions
                  </label>
                  <textarea
                    rows={2}
                    value={bankInstructions}
                    onChange={(e) => setBankInstructions(e.target.value)}
                    placeholder="Instructions displayed to customer..."
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#17352A] transition"
                  />
                </div>
              </div>
            </div>

            {/* LIVE CUSTOMER CHECKOUT PREVIEW CARD */}
            <div className="rounded-2xl border border-[#B89450]/30 bg-[#FAF8F3] p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-[#17352A]">
                    Customer Checkout Preview
                  </h3>
                  <p className="text-xs text-gray-500">
                    Live simulation of how your PromptPay QR & Bank Account cards will appear to tourists on the checkout page.
                  </p>
                </div>
                <span className="text-[11px] font-semibold text-[#B89450] bg-white px-2.5 py-1 rounded-full border border-[#B89450]/30">
                  Preview Mode
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* PromptPay QR Preview Card */}
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-2xs">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b">
                    <span className="text-xs font-bold text-[#17352A]">PromptPay Thai QR</span>
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                      No Fee
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="bg-[#FAF8F3] p-1.5 rounded-lg border border-gray-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={qrFilePreview || promptpayQrUrl || "/images/promptpay-qr.svg"}
                        alt="QR Preview"
                        className="h-20 w-20 object-contain"
                      />
                    </div>
                    <div className="text-xs space-y-1">
                      <p className="font-bold text-gray-900">{promptpayAccountName}</p>
                      <p className="font-mono text-gray-600">ID: {promptpayId}</p>
                      <p className="text-[11px] text-[#B89450] font-semibold">฿3,500.00 (Example Total)</p>
                    </div>
                  </div>
                </div>

                {/* Bank Account Preview Card */}
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-2xs">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b">
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex h-6 w-6 items-center justify-center rounded-md font-bold text-white text-[10px] ${selectedBankInfo.color}`}
                      >
                        {selectedBankInfo.short}
                      </div>
                      <span className="text-xs font-bold text-gray-900">{bankName}</span>
                    </div>
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                      Official Account
                    </span>
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Name:</span>
                      <strong className="text-gray-900">{accountName}</strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Account No:</span>
                      <strong className="font-mono text-sm text-[#B89450]">{accountNumber}</strong>
                    </div>
                    {bankBranch && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Branch:</span>
                        <span className="text-gray-700">{bankBranch}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-wrap items-center justify-between gap-4 shadow-xs">
              <div className="text-xs text-gray-500">
                {lastSavedAt ? (
                  <span>Last saved to database: {new Date(lastSavedAt).toLocaleString()}</span>
                ) : (
                  <span>Ready to save payment settings</span>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={savingPayment}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#D1B16A] to-[#B89450] text-[#17352A] font-bold text-sm shadow hover:brightness-105 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {savingPayment ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      <span>Saving to Database...</span>
                    </>
                  ) : (
                    <>
                      <span>💾</span>
                      <span>Save PromptPay & Bank Settings</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: SYSTEM EMAIL SETTINGS */}
      {activeTab === "email" && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Admin Email & Notification Settings</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Stored persistently in Supabase table <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-700 font-mono">public.site_settings (key: admin_email)</code>.
              </p>
            </div>
            {lastSavedAt && (
              <span className="text-xs text-gray-400">
                Last saved: {new Date(lastSavedAt).toLocaleString()}
              </span>
            )}
          </div>

          <form onSubmit={handleSaveEmail} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Primary Admin Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@silverhawk.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#17352A] focus:border-transparent transition"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Used as the default admin sender, payment slip verification recorder, and fallback contact.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Administrator Role / Label
                </label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Primary System Administrator"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#17352A] focus:border-transparent transition"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Descriptive label displayed in system notifications and database audit records.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Notification Recipient Emails
              </label>
              <input
                type="text"
                value={notificationEmailsStr}
                onChange={(e) => setNotificationEmailsStr(e.target.value)}
                placeholder="admin@silverhawk.com, silverhawkgroup.dmc@gmail.com"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#17352A] focus:border-transparent transition"
              />
              <p className="text-xs text-gray-500 mt-1">
                Separate multiple emails with commas. These addresses will be notified of incoming bookings and payment receipts.
              </p>
            </div>

            <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                type="submit"
                disabled={savingEmail}
                className="px-6 py-2.5 rounded-xl bg-[#17352A] text-[#D1B16A] font-bold text-sm hover:bg-[#122b22] transition disabled:opacity-50 disabled:cursor-not-allowed shadow-xs flex items-center gap-2"
              >
                {savingEmail ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    <span>Saving to Database...</span>
                  </>
                ) : (
                  <>
                    <span>💾</span>
                    <span>Save Email Settings to Database</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: AUTHORIZED ADMIN ACCOUNTS */}
      {activeTab === "accounts" && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-lg font-bold text-gray-900">Authorized Admin Accounts</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Accounts stored in the Supabase database with active permissions in <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-700 font-mono">admin_users</code>.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3">Account / Email</th>
                  <th className="px-6 py-3">Display Name</th>
                  <th className="px-6 py-3">User ID</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {adminAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                      No admin accounts found.
                    </td>
                  </tr>
                ) : (
                  adminAccounts.map((acc) => (
                    <tr key={acc.id} className="hover:bg-gray-50/50 transition">
                      <td className="px-6 py-4 font-semibold text-gray-900 flex items-center gap-2">
                        <span className="text-gray-400">👤</span>
                        <span>{acc.email}</span>
                        {acc.email === email && (
                          <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-bold border border-amber-200">
                            Primary
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">{acc.name || "Administrator"}</td>
                      <td className="px-6 py-4 font-mono text-xs text-gray-500">
                        {acc.id}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500">
                        {acc.created_at ? new Date(acc.created_at).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
