"use client";

import { useState } from "react";
import type {
  SitePolicies,
  TourType,
  TourTypePDPAPolicy,
  TourTypeCancellationPolicy,
} from "@/lib/site-policies-base";
import {
  DEFAULT_TOUR_TYPE_PDPA,
  DEFAULT_TOUR_TYPE_CANCELLATION,
} from "@/lib/site-policies-base";

type Props = {
  initialPolicies: SitePolicies;
};

const TOUR_TYPES: { key: TourType; label: string; icon: string }[] = [
  { key: "Tour Package", label: "Tour Package", icon: "🏝️" },
  { key: "Ticket Only", label: "Ticket Only", icon: "🎫" },
  { key: "Transfer Only", label: "Transfer Only", icon: "🚐" },
  { key: "Private Tour", label: "Private Tour", icon: "🛥️" },
  { key: "Activity Only", label: "Activity / Attraction", icon: "🧗" },
];

export default function PoliciesManagementClient({ initialPolicies }: Props) {
  const [policies, setPolicies] = useState<SitePolicies>(initialPolicies);
  const [activeTab, setActiveTab] = useState<"pdpa" | "cancellation">("pdpa");
  const [activeScope, setActiveScope] = useState<"shared" | TourType>("shared");
  const [activeLang, setActiveLang] = useState<"en" | "th" | "zh">("en");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setSaveMessage(null);
    try {
      const res = await fetch("/api/admin/policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(policies),
      });

      if (!res.ok) throw new Error("Failed to save policies");
      const json = await res.json();
      if (json.policies) {
        setPolicies(json.policies);
      }
      setSaveMessage("Policies & Tour Type Terms saved and updated live successfully!");
      setTimeout(() => setSaveMessage(null), 4000);
    } catch (err: any) {
      console.error(err);
      setSaveMessage(err.message || "Error saving policies");
    } finally {
      setSaving(false);
    }
  }

  // Safe accessor for tour-type specific PDPA
  const currentTourTypePdpa: TourTypePDPAPolicy =
    activeScope === "shared"
      ? DEFAULT_TOUR_TYPE_PDPA["Tour Package"]
      : policies.pdpa.by_tour_type?.[activeScope] ||
        DEFAULT_TOUR_TYPE_PDPA[activeScope] ||
        DEFAULT_TOUR_TYPE_PDPA["Tour Package"];

  // Safe accessor for tour-type specific Cancellation
  const currentTourTypeCancellation: TourTypeCancellationPolicy =
    activeScope === "shared"
      ? DEFAULT_TOUR_TYPE_CANCELLATION["Tour Package"]
      : policies.cancellation.by_tour_type?.[activeScope] ||
        DEFAULT_TOUR_TYPE_CANCELLATION[activeScope] ||
        DEFAULT_TOUR_TYPE_CANCELLATION["Tour Package"];

  function updateTourTypePdpa(field: keyof TourTypePDPAPolicy, value: string) {
    if (activeScope === "shared") return;
    setPolicies((prev) => {
      const existing =
        prev.pdpa.by_tour_type?.[activeScope] || DEFAULT_TOUR_TYPE_PDPA[activeScope];
      return {
        ...prev,
        pdpa: {
          ...prev.pdpa,
          by_tour_type: {
            ...prev.pdpa.by_tour_type,
            [activeScope]: {
              ...existing,
              [field]: value,
            },
          },
        },
      };
    });
  }

  function updateTourTypeCancellation(
    field: keyof TourTypeCancellationPolicy,
    value: string
  ) {
    if (activeScope === "shared") return;
    setPolicies((prev) => {
      const existing =
        prev.cancellation.by_tour_type?.[activeScope] ||
        DEFAULT_TOUR_TYPE_CANCELLATION[activeScope];
      return {
        ...prev,
        cancellation: {
          ...prev.cancellation,
          by_tour_type: {
            ...prev.cancellation.by_tour_type,
            [activeScope]: {
              ...existing,
              [field]: value,
            },
          },
        },
      };
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#D1B16A]">
            Legal, PDPA &amp; Compliance Settings
          </span>
          <h1 className="text-2xl font-bold text-[#17352A]">
            PDPA &amp; Cancellation Terms Management
          </h1>
          <p className="text-xs text-gray-500">
            Centrally manage shared privacy principles and customize disclosures, data use, and cancellation conditions for each tour type.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-[#17352A] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#122b22] transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            {saving ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Saving Live...
              </>
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      </div>

      {saveMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 shadow-xs">
          {saveMessage}
        </div>
      )}

      {/* Main Tabs (PDPA vs Cancellation) */}
      <div className="flex border-b border-[#D6CEBD]">
        <button
          type="button"
          onClick={() => setActiveTab("pdpa")}
          className={`px-5 py-3 text-xs font-bold transition-colors border-b-2 -mb-px flex items-center gap-2 cursor-pointer ${
            activeTab === "pdpa"
              ? "border-[#B89450] text-[#17352A] bg-white rounded-t-lg shadow-2xs"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <span>🛡️</span>
          <span>1. PDPA Management (Shared &amp; Per Tour Type)</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("cancellation")}
          className={`px-5 py-3 text-xs font-bold transition-colors border-b-2 -mb-px flex items-center gap-2 cursor-pointer ${
            activeTab === "cancellation"
              ? "border-[#B89450] text-[#17352A] bg-white rounded-t-lg shadow-2xs"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <span>📋</span>
          <span>2. Cancellation Terms (Shared &amp; Per Tour Type)</span>
        </button>
      </div>

      {/* Tour Type Scope Selector Pills */}
      <div className="rounded-2xl border border-[#D6CEBD] bg-[#FAF8F3] p-3.5 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[#17352A] flex items-center gap-1.5">
              <span>Select Policy Scope:</span>
              <span className="text-[11px] font-normal text-gray-500">
                {activeScope === "shared"
                  ? "Editing Shared Baseline Rules"
                  : `Editing terms specific to "${activeScope}"`}
              </span>
            </label>
          </div>
          {/* Language Selector Pills */}
          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <span className="text-[11px] font-semibold text-gray-500 mr-1">Lang:</span>
            {(["en", "th", "zh"] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setActiveLang(lang)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer ${
                  activeLang === lang
                    ? "bg-[#17352A] text-[#D1B16A] shadow-xs"
                    : "bg-white border border-[#D6CEBD] text-gray-600 hover:bg-white/80"
                }`}
              >
                {lang === "en" ? "EN" : lang === "th" ? "TH (ไทย)" : "ZH (中文)"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => setActiveScope("shared")}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              activeScope === "shared"
                ? "bg-[#17352A] text-[#D1B16A] shadow-xs"
                : "border border-[#D6CEBD] bg-white text-gray-600 hover:bg-white/80"
            }`}
          >
            🌐 Shared Baseline Policy
          </button>
          {TOUR_TYPES.map((tt) => {
            const isSel = activeScope === tt.key;
            return (
              <button
                key={tt.key}
                type="button"
                onClick={() => setActiveScope(tt.key)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSel
                    ? "bg-[#17352A] text-[#D1B16A] shadow-xs"
                    : "border border-[#D6CEBD] bg-white text-gray-600 hover:bg-white/80"
                }`}
              >
                <span>{tt.icon}</span>
                <span>{tt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: PDPA MANAGEMENT */}
      {/* ============================================================== */}
      {activeTab === "pdpa" && (
        <div className="space-y-6">
          {activeScope === "shared" ? (
            /* SHARED BASELINE PDPA */
            <div className="rounded-2xl border border-[#D6CEBD] bg-white p-6 shadow-xs space-y-6">
              <div className="border-b border-gray-100 pb-3">
                <h3 className="font-serif text-base font-bold text-[#17352A]">
                  Shared Baseline PDPA Privacy Policy
                </h3>
                <p className="text-xs text-gray-500">
                  Defines general data protection principles, retention limits, security controls, and customer rights under Thailand&apos;s PDPA B.E. 2562.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-[#17352A] mb-1">
                    Policy Version
                  </label>
                  <input
                    type="text"
                    value={policies.pdpa.version}
                    onChange={(e) =>
                      setPolicies((prev) => ({
                        ...prev,
                        pdpa: { ...prev.pdpa, version: e.target.value },
                      }))
                    }
                    className="w-full rounded-xl border border-[#D6CEBD] bg-white px-3 py-2 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#17352A] mb-1">
                    Last Updated Date
                  </label>
                  <input
                    type="text"
                    value={policies.pdpa.last_updated}
                    readOnly
                    className="w-full rounded-xl border border-[#D6CEBD] bg-gray-50 px-3 py-2 text-xs text-gray-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#17352A] mb-1">
                  Consent Checkbox Prompt ({activeLang.toUpperCase()})
                </label>
                <p className="text-[11px] text-gray-400 mb-2">
                  Displayed beside the mandatory agreement checkbox on Booking &amp; Guest Details screens.
                </p>
                <textarea
                  rows={3}
                  value={
                    activeLang === "en"
                      ? policies.pdpa.consent_checkbox_en
                      : activeLang === "th"
                      ? policies.pdpa.consent_checkbox_th
                      : policies.pdpa.consent_checkbox_zh
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    setPolicies((prev) => ({
                      ...prev,
                      pdpa: {
                        ...prev.pdpa,
                        ...(activeLang === "en"
                          ? { consent_checkbox_en: val }
                          : activeLang === "th"
                          ? { consent_checkbox_th: val }
                          : { consent_checkbox_zh: val }),
                      },
                    }));
                  }}
                  className="w-full rounded-xl border border-[#D6CEBD] bg-white p-3 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#17352A] mb-1">
                  PDPA Notice Modal Header ({activeLang.toUpperCase()})
                </label>
                <input
                  type="text"
                  value={
                    activeLang === "en"
                      ? policies.pdpa.modal_title_en
                      : activeLang === "th"
                      ? policies.pdpa.modal_title_th
                      : policies.pdpa.modal_title_zh
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    setPolicies((prev) => ({
                      ...prev,
                      pdpa: {
                        ...prev.pdpa,
                        ...(activeLang === "en"
                          ? { modal_title_en: val }
                          : activeLang === "th"
                          ? { modal_title_th: val }
                          : { modal_title_zh: val }),
                      },
                    }));
                  }}
                  className="w-full rounded-xl border border-[#D6CEBD] bg-white px-3 py-2 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#17352A] mb-1">
                  Baseline Privacy Policy Text ({activeLang.toUpperCase()})
                </label>
                <p className="text-[11px] text-gray-400 mb-2">
                  Full text shown in the customer modal describing general data principles, data retention limits, and data subject rights.
                </p>
                <textarea
                  rows={10}
                  value={
                    activeLang === "en"
                      ? policies.pdpa.full_policy_en
                      : activeLang === "th"
                      ? policies.pdpa.full_policy_th
                      : policies.pdpa.full_policy_zh
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    setPolicies((prev) => ({
                      ...prev,
                      pdpa: {
                        ...prev.pdpa,
                        ...(activeLang === "en"
                          ? { full_policy_en: val }
                          : activeLang === "th"
                          ? { full_policy_th: val }
                          : { full_policy_zh: val }),
                      },
                    }));
                  }}
                  className="w-full font-mono rounded-xl border border-[#D6CEBD] bg-white p-3 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none leading-relaxed"
                />
              </div>
            </div>
          ) : (
            /* TOUR-TYPE SPECIFIC PDPA */
            <div className="rounded-2xl border border-[#D6CEBD] bg-white p-6 shadow-xs space-y-6">
              <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-base font-bold text-[#17352A]">
                    PDPA Requirements for &quot;{activeScope}&quot;
                  </h3>
                  <p className="text-xs text-gray-500">
                    Defines the additional information required, specific purpose of data collection, and disclosures for {activeScope}.
                  </p>
                </div>
                <span className="rounded-full bg-[#17352A]/10 px-3 py-1 text-xs font-bold text-[#17352A]">
                  Tour Type: {activeScope}
                </span>
              </div>

              {/* Required Information */}
              <div>
                <label className="block text-xs font-bold text-[#17352A] mb-1">
                  Additional Information Required ({activeLang.toUpperCase()})
                </label>
                <p className="text-[11px] text-gray-400 mb-2">
                  What personal data must be provided by visitors for this specific tour type.
                </p>
                <textarea
                  rows={3}
                  value={
                    activeLang === "en"
                      ? currentTourTypePdpa.required_info_en
                      : activeLang === "th"
                      ? currentTourTypePdpa.required_info_th
                      : currentTourTypePdpa.required_info_zh
                  }
                  onChange={(e) =>
                    updateTourTypePdpa(
                      activeLang === "en"
                        ? "required_info_en"
                        : activeLang === "th"
                        ? "required_info_th"
                        : "required_info_zh",
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-[#D6CEBD] bg-white p-3 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
                />
              </div>

              {/* Purpose */}
              <div>
                <label className="block text-xs font-bold text-[#17352A] mb-1">
                  Purpose of Data Collection &amp; Use ({activeLang.toUpperCase()})
                </label>
                <p className="text-[11px] text-gray-400 mb-2">
                  The specific operational and statutory purpose why this tour type collects the information.
                </p>
                <textarea
                  rows={3}
                  value={
                    activeLang === "en"
                      ? currentTourTypePdpa.purpose_en
                      : activeLang === "th"
                      ? currentTourTypePdpa.purpose_th
                      : currentTourTypePdpa.purpose_zh
                  }
                  onChange={(e) =>
                    updateTourTypePdpa(
                      activeLang === "en"
                        ? "purpose_en"
                        : activeLang === "th"
                        ? "purpose_th"
                        : "purpose_zh",
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-[#D6CEBD] bg-white p-3 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
                />
              </div>

              {/* Additional Disclosures */}
              <div>
                <label className="block text-xs font-bold text-[#17352A] mb-1">
                  Third-Party Disclosures &amp; Partners ({activeLang.toUpperCase()})
                </label>
                <p className="text-[11px] text-gray-400 mb-2">
                  Which specific partners (e.g. boat captains, ticketing gates, fleet drivers) receive this data.
                </p>
                <textarea
                  rows={3}
                  value={
                    activeLang === "en"
                      ? currentTourTypePdpa.additional_disclosures_en || ""
                      : activeLang === "th"
                      ? currentTourTypePdpa.additional_disclosures_th || ""
                      : currentTourTypePdpa.additional_disclosures_zh || ""
                  }
                  onChange={(e) =>
                    updateTourTypePdpa(
                      activeLang === "en"
                        ? "additional_disclosures_en"
                        : activeLang === "th"
                        ? "additional_disclosures_th"
                        : "additional_disclosures_zh",
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-[#D6CEBD] bg-white p-3 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: CANCELLATION TERMS MANAGEMENT */}
      {/* ============================================================== */}
      {activeTab === "cancellation" && (
        <div className="space-y-6">
          {activeScope === "shared" ? (
            /* SHARED BASELINE CANCELLATION */
            <div className="rounded-2xl border border-[#D6CEBD] bg-white p-6 shadow-xs space-y-6">
              <div className="border-b border-gray-100 pb-3">
                <h3 className="font-serif text-base font-bold text-[#17352A]">
                  Shared Baseline Cancellation Policy
                </h3>
                <p className="text-xs text-gray-500">
                  Standard baseline cancellation summary and weather safety guarantees shown as default across the platform.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#17352A] mb-1">
                  General Cancellation Policy Summary ({activeLang.toUpperCase()})
                </label>
                <textarea
                  rows={3}
                  value={
                    activeLang === "en"
                      ? policies.cancellation.policy_summary_en
                      : activeLang === "th"
                      ? policies.cancellation.policy_summary_th
                      : policies.cancellation.policy_summary_zh
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    setPolicies((prev) => ({
                      ...prev,
                      cancellation: {
                        ...prev.cancellation,
                        ...(activeLang === "en"
                          ? { policy_summary_en: val }
                          : activeLang === "th"
                          ? { policy_summary_th: val }
                          : { policy_summary_zh: val }),
                      },
                    }));
                  }}
                  className="w-full rounded-xl border border-[#D6CEBD] bg-white p-3 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#17352A] mb-1">
                  Weather &amp; Marine Safety Guarantee Clause ({activeLang.toUpperCase()})
                </label>
                <textarea
                  rows={3}
                  value={
                    activeLang === "en"
                      ? policies.cancellation.weather_clause_en
                      : activeLang === "th"
                      ? policies.cancellation.weather_clause_th
                      : policies.cancellation.weather_clause_zh
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    setPolicies((prev) => ({
                      ...prev,
                      cancellation: {
                        ...prev.cancellation,
                        ...(activeLang === "en"
                          ? { weather_clause_en: val }
                          : activeLang === "th"
                          ? { weather_clause_th: val }
                          : { weather_clause_zh: val }),
                      },
                    }));
                  }}
                  className="w-full rounded-xl border border-[#D6CEBD] bg-white p-3 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#17352A] mb-1">
                  Master Terms &amp; Conditions ({activeLang.toUpperCase()})
                </label>
                <textarea
                  rows={10}
                  value={
                    activeLang === "en"
                      ? policies.cancellation.full_terms_en
                      : activeLang === "th"
                      ? policies.cancellation.full_terms_th
                      : policies.cancellation.full_terms_zh
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    setPolicies((prev) => ({
                      ...prev,
                      cancellation: {
                        ...prev.cancellation,
                        ...(activeLang === "en"
                          ? { full_terms_en: val }
                          : activeLang === "th"
                          ? { full_terms_th: val }
                          : { full_terms_zh: val }),
                      },
                    }));
                  }}
                  className="w-full font-mono rounded-xl border border-[#D6CEBD] bg-white p-3 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none leading-relaxed"
                />
              </div>
            </div>
          ) : (
            /* TOUR-TYPE SPECIFIC CANCELLATION */
            <div className="rounded-2xl border border-[#D6CEBD] bg-white p-6 shadow-xs space-y-6">
              <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-base font-bold text-[#17352A]">
                    Cancellation Policy for &quot;{activeScope}&quot;
                  </h3>
                  <p className="text-xs text-gray-500">
                    Define specific refund percentages, cancellation deadlines, rescheduling rules, and no-show policies for {activeScope}.
                  </p>
                </div>
                <span className="rounded-full bg-[#17352A]/10 px-3 py-1 text-xs font-bold text-[#17352A]">
                  Tour Type: {activeScope}
                </span>
              </div>

              {/* Summary */}
              <div>
                <label className="block text-xs font-bold text-[#17352A] mb-1">
                  Cancellation Policy Summary ({activeLang.toUpperCase()})
                </label>
                <textarea
                  rows={2}
                  value={
                    activeLang === "en"
                      ? currentTourTypeCancellation.summary_en
                      : activeLang === "th"
                      ? currentTourTypeCancellation.summary_th
                      : currentTourTypeCancellation.summary_zh
                  }
                  onChange={(e) =>
                    updateTourTypeCancellation(
                      activeLang === "en"
                        ? "summary_en"
                        : activeLang === "th"
                        ? "summary_th"
                        : "summary_zh",
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-[#D6CEBD] bg-white p-3 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
                />
              </div>

              {/* Refund Conditions */}
              <div>
                <label className="block text-xs font-bold text-[#17352A] mb-1">
                  Refund Conditions &amp; Percentage Deadlines ({activeLang.toUpperCase()})
                </label>
                <p className="text-[11px] text-gray-400 mb-2">
                  Define refund tiers (e.g. 100% full refund, 50% fee, non-refundable).
                </p>
                <textarea
                  rows={4}
                  value={
                    activeLang === "en"
                      ? currentTourTypeCancellation.refund_conditions_en
                      : activeLang === "th"
                      ? currentTourTypeCancellation.refund_conditions_th
                      : currentTourTypeCancellation.refund_conditions_zh
                  }
                  onChange={(e) =>
                    updateTourTypeCancellation(
                      activeLang === "en"
                        ? "refund_conditions_en"
                        : activeLang === "th"
                        ? "refund_conditions_th"
                        : "refund_conditions_zh",
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-[#D6CEBD] bg-white p-3 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none font-mono"
                />
              </div>

              {/* Rescheduling */}
              <div>
                <label className="block text-xs font-bold text-[#17352A] mb-1">
                  Reschedule &amp; Date Change Policy ({activeLang.toUpperCase()})
                </label>
                <p className="text-[11px] text-gray-400 mb-2">
                  Conditions under which customers can modify dates or tour times.
                </p>
                <textarea
                  rows={2}
                  value={
                    activeLang === "en"
                      ? currentTourTypeCancellation.reschedule_policy_en
                      : activeLang === "th"
                      ? currentTourTypeCancellation.reschedule_policy_th
                      : currentTourTypeCancellation.reschedule_policy_zh
                  }
                  onChange={(e) =>
                    updateTourTypeCancellation(
                      activeLang === "en"
                        ? "reschedule_policy_en"
                        : activeLang === "th"
                        ? "reschedule_policy_th"
                        : "reschedule_policy_zh",
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-[#D6CEBD] bg-white p-3 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
                />
              </div>

              {/* Weather or No-Show Clause */}
              <div>
                <label className="block text-xs font-bold text-[#17352A] mb-1">
                  Weather / No-Show / Operational Interruption Clause ({activeLang.toUpperCase()})
                </label>
                <textarea
                  rows={3}
                  value={
                    activeLang === "en"
                      ? currentTourTypeCancellation.weather_or_noshow_clause_en
                      : activeLang === "th"
                      ? currentTourTypeCancellation.weather_or_noshow_clause_th
                      : currentTourTypeCancellation.weather_or_noshow_clause_zh
                  }
                  onChange={(e) =>
                    updateTourTypeCancellation(
                      activeLang === "en"
                        ? "weather_or_noshow_clause_en"
                        : activeLang === "th"
                        ? "weather_or_noshow_clause_th"
                        : "weather_or_noshow_clause_zh",
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-[#D6CEBD] bg-white p-3 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
