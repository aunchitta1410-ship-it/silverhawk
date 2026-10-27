"use client";

import { useState, useRef } from "react";
import type { HomepageContent } from "@/lib/homepage-content";

type Props = {
  initialContent: HomepageContent;
  hasSiteSettingsTable?: boolean;
};

export default function HomepageCmsClient({ initialContent, hasSiteSettingsTable = false }: Props) {
  const [content, setContent] = useState<HomepageContent>(initialContent);
  const [activeTab, setActiveTab] = useState<
    "hero" | "services" | "mice_corporate" | "why_choose"
  >("hero");
  const [activeLang, setActiveLang] = useState<"en" | "th" | "zh">("en");
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"success" | "error" | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(
    !hasSiteSettingsTable
      ? "Supabase table 'public.site_settings' was not detected in your database. Edits are saved locally in development, but you need to run the SQL migration in Supabase SQL editor for persistent live updates across Vercel/serverless instances."
      : null
  );

  const heroFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingHero, setIsUploadingHero] = useState(false);

  const isLikelyHtmlUrl = (url?: string | null) => {
    if (!url) return false;
    const trimmed = url.trim().toLowerCase();
    return (
      trimmed.includes("expedia.") ||
      trimmed.includes("tripadvisor.") ||
      trimmed.includes("booking.com") ||
      trimmed.endsWith(".html") ||
      trimmed.endsWith(".htm") ||
      trimmed.includes("/dx") ||
      trimmed.includes("/hotel/") ||
      trimmed.includes("/attraction/")
    );
  };

  const handleHeroFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file (JPG, PNG, WebP).");
      return;
    }

    setIsUploadingHero(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/homepage-content/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to upload image");
      }

      setContent((prev) => ({
        ...prev,
        hero: {
          ...prev.hero,
          bg_image_url: json.url,
        },
      }));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploadingHero(false);
      if (heroFileInputRef.current) {
        heroFileInputRef.current.value = "";
      }
    }
  };

  async function handleSave() {
    setSaving(true);
    setSaveMessage(null);
    setSaveStatus(null);
    try {
      const res = await fetch("/api/admin/homepage-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(content),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || "Failed to save homepage content");
      }

      if (json?.content) {
        setContent(json.content);
      }
      setSaveStatus("success");
      setSaveMessage("Homepage content and media saved live successfully!");

      if (json?.warning) {
        setWarningMessage(json.warning);
      } else if (json?.supabasePersisted) {
        setWarningMessage(null);
      }

      setTimeout(() => setSaveMessage(null), 5000);
    } catch (err: unknown) {
      console.error("CMS save error:", err);
      setSaveStatus("error");
      setSaveMessage(err instanceof Error ? err.message : "Error saving homepage content");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#D1B16A]">
            Site Visual & Copy CMS
          </span>
          <h1 className="text-2xl font-bold text-[#17352A]">
            Homepage Content Management
          </h1>
          <p className="text-xs text-gray-500">
            Edit and adjust hero text, services, pictures, and copy freely across all 3 languages (English, Thai, Chinese).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={`/${activeLang}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-[#B89450]/60 bg-white px-4 py-2.5 text-xs font-bold text-[#17352A] shadow-xs hover:bg-[#FAF8F3] transition-colors flex items-center gap-1.5"
          >
            <span>Preview Client Homepage</span>
            <span className="text-[#B89450]">↗</span>
          </a>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-[#17352A] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#122b22] transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Saving Live...
              </>
            ) : (
              "Save Homepage"
            )}
          </button>
        </div>
      </div>

      {saveMessage && (
        <div
          className={`rounded-xl border p-4 text-xs font-semibold shadow-xs ${
            saveStatus === "error"
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {saveMessage}
        </div>
      )}

      {warningMessage && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 shadow-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-800">
            <span>⚠️ Database Table Missing for Live Production Persistence</span>
          </div>
          <p className="leading-relaxed">
            {warningMessage}
          </p>
          <div className="rounded-lg bg-amber-100/80 p-3 font-mono text-[11px] overflow-x-auto select-all text-amber-950 border border-amber-200">
            {`CREATE TABLE IF NOT EXISTS public.site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on site_settings"
  ON public.site_settings FOR SELECT TO public USING (true);

CREATE POLICY "Allow service role full access on site_settings"
  ON public.site_settings FOR ALL TO service_role USING (true) WITH CHECK (true);`}
          </div>
          <p className="text-[11px] text-amber-700">
            💡 Copy the SQL above, paste it into your <strong>Supabase Dashboard &gt; SQL Editor</strong>, and click <strong>Run</strong>.
          </p>
        </div>
      )}

      {/* Main Tabs */}
      <div className="flex flex-wrap border-b border-[#D6CEBD]">
        <button
          type="button"
          onClick={() => setActiveTab("hero")}
          className={`px-5 py-3 text-xs font-bold transition-colors border-b-2 -mb-px ${
            activeTab === "hero"
              ? "border-[#B89450] text-[#17352A] bg-white rounded-t-lg"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          🌟 Hero & Headers
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("services")}
          className={`px-5 py-3 text-xs font-bold transition-colors border-b-2 -mb-px ${
            activeTab === "services"
              ? "border-[#B89450] text-[#17352A] bg-white rounded-t-lg"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          💼 Services (01, 02, 03)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("mice_corporate")}
          className={`px-5 py-3 text-xs font-bold transition-colors border-b-2 -mb-px ${
            activeTab === "mice_corporate"
              ? "border-[#B89450] text-[#17352A] bg-white rounded-t-lg"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          🏢 MICE & Corporate Training
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("why_choose")}
          className={`px-5 py-3 text-xs font-bold transition-colors border-b-2 -mb-px ${
            activeTab === "why_choose"
              ? "border-[#B89450] text-[#17352A] bg-white rounded-t-lg"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          ✨ Why Choose Us
        </button>
      </div>

      {/* Language Selector Pills */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-gray-500 mr-2">Language:</span>
        {(["en", "th", "zh"] as const).map((lang) => (
          <button
            key={lang}
            type="button"
            onClick={() => setActiveLang(lang)}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              activeLang === lang
                ? "bg-[#B89450] text-white shadow-xs"
                : "bg-white border border-[#D6CEBD] text-gray-600 hover:bg-[#FAF8F3]"
            }`}
          >
            {lang === "en" ? "English (Primary)" : lang === "th" ? "ภาษาไทย (TH)" : "中文 (ZH)"}
          </button>
        ))}
      </div>

      {/* TAB 1: Hero */}
      {activeTab === "hero" && (
        <div className="rounded-2xl border border-[#D6CEBD] bg-white p-6 shadow-xs space-y-6">
          <h3 className="font-serif text-base font-bold text-[#17352A]">
            Hero Banner Section
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-[#17352A] mb-1">
                Eyebrow Tag (e.g. SILVER HAWK GROUP)
              </label>
              <input
                type="text"
                value={content.hero.eyebrow}
                onChange={(e) =>
                  setContent((prev) => ({
                    ...prev,
                    hero: { ...prev.hero, eyebrow: e.target.value },
                  }))
                }
                className="w-full rounded-xl border border-[#D6CEBD] bg-white px-3 py-2 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-[#17352A]">
                  Hero Background Image (Optional)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    ref={heroFileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleHeroFileUpload}
                  />
                  <button
                    type="button"
                    disabled={isUploadingHero}
                    onClick={() => heroFileInputRef.current?.click()}
                    className="flex items-center gap-1.5 rounded-lg bg-[#17352A] px-3 py-1 text-[11px] font-bold text-white hover:bg-[#122b22] disabled:opacity-50 transition cursor-pointer"
                  >
                    <span>📷</span>
                    <span>{isUploadingHero ? "Uploading..." : "Upload Image"}</span>
                  </button>
                  {content.hero.bg_image_url && (
                    <button
                      type="button"
                      onClick={() =>
                        setContent((prev) => ({
                          ...prev,
                          hero: { ...prev.hero, bg_image_url: "" },
                        }))
                      }
                      className="rounded-lg border border-red-300 bg-red-50 px-2 py-1 text-[11px] font-bold text-red-600 hover:bg-red-100 transition"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <input
                type="text"
                placeholder="Direct image URL (e.g. https://... or click Upload Image above)"
                value={content.hero.bg_image_url || ""}
                onChange={(e) =>
                  setContent((prev) => ({
                    ...prev,
                    hero: { ...prev.hero, bg_image_url: e.target.value },
                  }))
                }
                className="w-full rounded-xl border border-[#D6CEBD] bg-white px-3 py-2 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
              />

              {/* Warning if user pastes an HTML page like Expedia */}
              {isLikelyHtmlUrl(content.hero.bg_image_url) && (
                <div className="mt-2 rounded-xl border border-red-300 bg-red-50 p-2.5 text-xs text-red-800">
                  <p className="font-bold flex items-center gap-1.5">
                    <span>⚠️</span> Website URL detected (Not a direct image file)
                  </p>
                  <p className="mt-0.5 text-[11px] text-red-700">
                    The URL entered appears to be an HTML webpage (e.g. an Expedia or travel website page) rather than a direct picture file (.jpg / .png / .webp). Web browsers cannot render entire webpages as CSS background images. Please click <strong>"Upload Image"</strong> to upload a photo directly or select one of the presets below.
                  </p>
                </div>
              )}

              {/* Quick Preset Buttons */}
              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="text-gray-500 font-medium">Quick Presets:</span>
                <button
                  type="button"
                  onClick={() =>
                    setContent((prev) => ({
                      ...prev,
                      hero: {
                        ...prev.hero,
                        bg_image_url:
                          "https://images.unsplash.com/photo-1537956965359-7573183d1f57?auto=format&fit=crop&w=1920&q=80",
                      },
                    }))
                  }
                  className="rounded-md border border-[#D6CEBD] bg-white px-2 py-0.5 text-gray-700 hover:border-[#B89450] hover:text-[#B89450] transition"
                >
                  Phi Phi Island Aerial
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setContent((prev) => ({
                      ...prev,
                      hero: {
                        ...prev.hero,
                        bg_image_url:
                          "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80",
                      },
                    }))
                  }
                  className="rounded-md border border-[#D6CEBD] bg-white px-2 py-0.5 text-gray-700 hover:border-[#B89450] hover:text-[#B89450] transition"
                >
                  Tropical Turquoise Bay
                </button>
              </div>

              {/* Live Preview Box */}
              {content.hero.bg_image_url && !isLikelyHtmlUrl(content.hero.bg_image_url) && (
                <div className="mt-3 overflow-hidden rounded-xl border border-[#D6CEBD] shadow-xs">
                  <p className="bg-[#FAF8F3] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-500 border-b border-[#D6CEBD]">
                    Live Hero Preview
                  </p>
                  <div
                    className="relative flex h-36 w-full items-center justify-center p-4 text-center"
                    style={{
                      backgroundImage: `linear-gradient(rgba(240, 235, 221, 0.55), rgba(240, 235, 221, 0.70)), url("${content.hero.bg_image_url}")`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  >
                    <div className="rounded-lg bg-white/75 px-4 py-2 backdrop-blur-xs shadow-xs">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#B89450]">
                        {content.hero.eyebrow || "SILVER HAWK GROUP"}
                      </p>
                      <p className="text-sm font-bold text-[#282722]">
                        {content.hero.title[activeLang] || "Beyond the Crowds, Closer to Nature"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#17352A] mb-1">
              Hero Main Headline ({activeLang.toUpperCase()})
            </label>
            <input
              type="text"
              value={content.hero.title[activeLang]}
              onChange={(e) => {
                const val = e.target.value;
                setContent((prev) => ({
                  ...prev,
                  hero: {
                    ...prev.hero,
                    title: { ...prev.hero.title, [activeLang]: val },
                  },
                }));
              }}
              className="w-full rounded-xl border border-[#D6CEBD] bg-white px-3 py-2 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#17352A] mb-1">
              Hero Subtitle / Description ({activeLang.toUpperCase()})
            </label>
            <textarea
              rows={3}
              value={content.hero.subtitle[activeLang]}
              onChange={(e) => {
                const val = e.target.value;
                setContent((prev) => ({
                  ...prev,
                  hero: {
                    ...prev.hero,
                    subtitle: { ...prev.hero.subtitle, [activeLang]: val },
                  },
                }));
              }}
              className="w-full rounded-xl border border-[#D6CEBD] bg-white p-3 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
            />
          </div>

          <div className="border-t border-[#D6CEBD] pt-6 space-y-4">
            <h4 className="text-xs font-bold text-[#17352A]">
              Section Headers on Homepage
            </h4>

            <div className="grid gap-4 sm:grid-cols-1">
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">
                  All Tours Header Title ({activeLang.toUpperCase()})
                </label>
                <input
                  type="text"
                  value={content.tours_header.title[activeLang]}
                  onChange={(e) => {
                    const val = e.target.value;
                    setContent((prev) => ({
                      ...prev,
                      tours_header: {
                        ...prev.tours_header,
                        title: { ...prev.tours_header.title, [activeLang]: val },
                      },
                    }));
                  }}
                  className="w-full rounded-xl border border-[#D6CEBD] bg-white px-3 py-2 text-xs"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Services 01, 02, 03 */}
      {activeTab === "services" && (
        <div className="space-y-6">
          {/* Services Section Header */}
          <div className="rounded-2xl border border-[#D6CEBD] bg-white p-6 shadow-xs space-y-4">
            <h3 className="font-serif text-base font-bold text-[#17352A]">
              Services Section Intro Header
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-[#17352A] mb-1">
                  Section Title ({activeLang.toUpperCase()})
                </label>
                <input
                  type="text"
                  value={content.services_header.title[activeLang]}
                  onChange={(e) => {
                    const val = e.target.value;
                    setContent((prev) => ({
                      ...prev,
                      services_header: {
                        ...prev.services_header,
                        title: { ...prev.services_header.title, [activeLang]: val },
                      },
                    }));
                  }}
                  className="w-full rounded-xl border border-[#D6CEBD] bg-white px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#17352A] mb-1">
                  Section Subtitle ({activeLang.toUpperCase()})
                </label>
                <input
                  type="text"
                  value={content.services_header.subtitle[activeLang]}
                  onChange={(e) => {
                    const val = e.target.value;
                    setContent((prev) => ({
                      ...prev,
                      services_header: {
                        ...prev.services_header,
                        subtitle: { ...prev.services_header.subtitle, [activeLang]: val },
                      },
                    }));
                  }}
                  className="w-full rounded-xl border border-[#D6CEBD] bg-white px-3 py-2 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Service 01 */}
          <div className="rounded-2xl border border-[#D6CEBD] bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xl font-bold text-[#B89450]">01</span>
              <h4 className="text-sm font-bold text-[#17352A]">Airport & VIP Transfer</h4>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-[#17352A] mb-1">
                  Title ({activeLang.toUpperCase()})
                </label>
                <input
                  type="text"
                  value={content.service_01.title[activeLang]}
                  onChange={(e) => {
                    const val = e.target.value;
                    setContent((prev) => ({
                      ...prev,
                      service_01: {
                        ...prev.service_01,
                        title: { ...prev.service_01.title, [activeLang]: val },
                      },
                    }));
                  }}
                  className="w-full rounded-xl border border-[#D6CEBD] bg-white px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#17352A] mb-1">
                  Tag ({activeLang.toUpperCase()})
                </label>
                <input
                  type="text"
                  value={content.service_01.tag[activeLang]}
                  onChange={(e) => {
                    const val = e.target.value;
                    setContent((prev) => ({
                      ...prev,
                      service_01: {
                        ...prev.service_01,
                        tag: { ...prev.service_01.tag, [activeLang]: val },
                      },
                    }));
                  }}
                  className="w-full rounded-xl border border-[#D6CEBD] bg-white px-3 py-2 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#17352A] mb-1">
                Description ({activeLang.toUpperCase()})
              </label>
              <textarea
                rows={2}
                value={content.service_01.description[activeLang]}
                onChange={(e) => {
                  const val = e.target.value;
                  setContent((prev) => ({
                    ...prev,
                    service_01: {
                      ...prev.service_01,
                      description: { ...prev.service_01.description, [activeLang]: val },
                    },
                  }));
                }}
                className="w-full rounded-xl border border-[#D6CEBD] bg-white p-3 text-xs"
              />
            </div>
          </div>

          {/* Service 02 */}
          <div className="rounded-2xl border border-[#D6CEBD] bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xl font-bold text-[#B89450]">02</span>
              <h4 className="text-sm font-bold text-[#17352A]">Yacht / Boat Charter</h4>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-[#17352A] mb-1">
                  Title ({activeLang.toUpperCase()})
                </label>
                <input
                  type="text"
                  value={content.service_02.title[activeLang]}
                  onChange={(e) => {
                    const val = e.target.value;
                    setContent((prev) => ({
                      ...prev,
                      service_02: {
                        ...prev.service_02,
                        title: { ...prev.service_02.title, [activeLang]: val },
                      },
                    }));
                  }}
                  className="w-full rounded-xl border border-[#D6CEBD] bg-white px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#17352A] mb-1">
                  Tag ({activeLang.toUpperCase()})
                </label>
                <input
                  type="text"
                  value={content.service_02.tag[activeLang]}
                  onChange={(e) => {
                    const val = e.target.value;
                    setContent((prev) => ({
                      ...prev,
                      service_02: {
                        ...prev.service_02,
                        tag: { ...prev.service_02.tag, [activeLang]: val },
                      },
                    }));
                  }}
                  className="w-full rounded-xl border border-[#D6CEBD] bg-white px-3 py-2 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#17352A] mb-1">
                Description ({activeLang.toUpperCase()})
              </label>
              <textarea
                rows={2}
                value={content.service_02.description[activeLang]}
                onChange={(e) => {
                  const val = e.target.value;
                  setContent((prev) => ({
                    ...prev,
                    service_02: {
                      ...prev.service_02,
                      description: { ...prev.service_02.description, [activeLang]: val },
                    },
                  }));
                }}
                className="w-full rounded-xl border border-[#D6CEBD] bg-white p-3 text-xs"
              />
            </div>
          </div>

          {/* Service 03 */}
          <div className="rounded-2xl border border-[#D6CEBD] bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xl font-bold text-[#B89450]">03</span>
              <h4 className="text-sm font-bold text-[#17352A]">Workshop & Experiences</h4>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-[#17352A] mb-1">
                  Title ({activeLang.toUpperCase()})
                </label>
                <input
                  type="text"
                  value={content.service_03.title[activeLang]}
                  onChange={(e) => {
                    const val = e.target.value;
                    setContent((prev) => ({
                      ...prev,
                      service_03: {
                        ...prev.service_03,
                        title: { ...prev.service_03.title, [activeLang]: val },
                      },
                    }));
                  }}
                  className="w-full rounded-xl border border-[#D6CEBD] bg-white px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#17352A] mb-1">
                  Tag ({activeLang.toUpperCase()})
                </label>
                <input
                  type="text"
                  value={content.service_03.tag[activeLang]}
                  onChange={(e) => {
                    const val = e.target.value;
                    setContent((prev) => ({
                      ...prev,
                      service_03: {
                        ...prev.service_03,
                        tag: { ...prev.service_03.tag, [activeLang]: val },
                      },
                    }));
                  }}
                  className="w-full rounded-xl border border-[#D6CEBD] bg-white px-3 py-2 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#17352A] mb-1">
                Description ({activeLang.toUpperCase()})
              </label>
              <textarea
                rows={2}
                value={content.service_03.description[activeLang]}
                onChange={(e) => {
                  const val = e.target.value;
                  setContent((prev) => ({
                    ...prev,
                    service_03: {
                      ...prev.service_03,
                      description: { ...prev.service_03.description, [activeLang]: val },
                    },
                  }));
                }}
                className="w-full rounded-xl border border-[#D6CEBD] bg-white p-3 text-xs"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MICE & Corporate Training */}
      {activeTab === "mice_corporate" && (
        <div className="space-y-6">
          {/* MICE */}
          <div className="rounded-2xl border border-[#D6CEBD] bg-white p-6 shadow-xs space-y-4">
            <h3 className="font-serif text-base font-bold text-[#17352A]">
              Meeting & Incentive (MICE)
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-[#17352A] mb-1">
                  Title ({activeLang.toUpperCase()})
                </label>
                <input
                  type="text"
                  value={content.mice.title[activeLang]}
                  onChange={(e) => {
                    const val = e.target.value;
                    setContent((prev) => ({
                      ...prev,
                      mice: {
                        ...prev.mice,
                        title: { ...prev.mice.title, [activeLang]: val },
                      },
                    }));
                  }}
                  className="w-full rounded-xl border border-[#D6CEBD] bg-white px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#17352A] mb-1">
                  Picture Image URL
                </label>
                <input
                  type="text"
                  value={content.mice.image_url}
                  onChange={(e) =>
                    setContent((prev) => ({
                      ...prev,
                      mice: { ...prev.mice, image_url: e.target.value },
                    }))
                  }
                  className="w-full rounded-xl border border-[#D6CEBD] bg-white px-3 py-2 text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#17352A] mb-1">
                Paragraph 1 ({activeLang.toUpperCase()})
              </label>
              <textarea
                rows={3}
                value={content.mice.description_1[activeLang]}
                onChange={(e) => {
                  const val = e.target.value;
                  setContent((prev) => ({
                    ...prev,
                    mice: {
                      ...prev.mice,
                      description_1: {
                        ...prev.mice.description_1,
                        [activeLang]: val,
                      },
                    },
                  }));
                }}
                className="w-full rounded-xl border border-[#D6CEBD] bg-white p-3 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#17352A] mb-1">
                Paragraph 2 ({activeLang.toUpperCase()})
              </label>
              <textarea
                rows={2}
                value={content.mice.description_2[activeLang]}
                onChange={(e) => {
                  const val = e.target.value;
                  setContent((prev) => ({
                    ...prev,
                    mice: {
                      ...prev.mice,
                      description_2: {
                        ...prev.mice.description_2,
                        [activeLang]: val,
                      },
                    },
                  }));
                }}
                className="w-full rounded-xl border border-[#D6CEBD] bg-white p-3 text-xs"
              />
            </div>
          </div>

          {/* Corporate Training */}
          <div className="rounded-2xl border border-[#D6CEBD] bg-white p-6 shadow-xs space-y-4">
            <h3 className="font-serif text-base font-bold text-[#17352A]">
              Corporate Training & Human Resource Development
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-[#17352A] mb-1">
                  Title ({activeLang.toUpperCase()})
                </label>
                <input
                  type="text"
                  value={content.corporate_training.title[activeLang]}
                  onChange={(e) => {
                    const val = e.target.value;
                    setContent((prev) => ({
                      ...prev,
                      corporate_training: {
                        ...prev.corporate_training,
                        title: {
                          ...prev.corporate_training.title,
                          [activeLang]: val,
                        },
                      },
                    }));
                  }}
                  className="w-full rounded-xl border border-[#D6CEBD] bg-white px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#17352A] mb-1">
                  Picture Image URL
                </label>
                <input
                  type="text"
                  value={content.corporate_training.image_url}
                  onChange={(e) =>
                    setContent((prev) => ({
                      ...prev,
                      corporate_training: {
                        ...prev.corporate_training,
                        image_url: e.target.value,
                      },
                    }))
                  }
                  className="w-full rounded-xl border border-[#D6CEBD] bg-white px-3 py-2 text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#17352A] mb-1">
                Paragraph 1 ({activeLang.toUpperCase()})
              </label>
              <textarea
                rows={3}
                value={content.corporate_training.description_1[activeLang]}
                onChange={(e) => {
                  const val = e.target.value;
                  setContent((prev) => ({
                    ...prev,
                    corporate_training: {
                      ...prev.corporate_training,
                      description_1: {
                        ...prev.corporate_training.description_1,
                        [activeLang]: val,
                      },
                    },
                  }));
                }}
                className="w-full rounded-xl border border-[#D6CEBD] bg-white p-3 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#17352A] mb-1">
                Paragraph 2 ({activeLang.toUpperCase()})
              </label>
              <textarea
                rows={2}
                value={content.corporate_training.description_2[activeLang]}
                onChange={(e) => {
                  const val = e.target.value;
                  setContent((prev) => ({
                    ...prev,
                    corporate_training: {
                      ...prev.corporate_training,
                      description_2: {
                        ...prev.corporate_training.description_2,
                        [activeLang]: val,
                      },
                    },
                  }));
                }}
                className="w-full rounded-xl border border-[#D6CEBD] bg-white p-3 text-xs"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Why Choose Us */}
      {activeTab === "why_choose" && (
        <div className="rounded-2xl border border-[#D6CEBD] bg-white p-6 shadow-xs space-y-6">
          <h3 className="font-serif text-base font-bold text-[#17352A]">
            Why Choose Us Section
          </h3>

          <div>
            <label className="block text-xs font-bold text-[#17352A] mb-1">
              Section Title ({activeLang.toUpperCase()})
            </label>
            <input
              type="text"
              value={content.why_choose_us.title[activeLang]}
              onChange={(e) => {
                const val = e.target.value;
                setContent((prev) => ({
                  ...prev,
                  why_choose_us: {
                    ...prev.why_choose_us,
                    title: { ...prev.why_choose_us.title, [activeLang]: val },
                  },
                }));
              }}
              className="w-full rounded-xl border border-[#D6CEBD] bg-white px-3 py-2 text-xs"
            />
          </div>

          <div className="space-y-4">
            {content.why_choose_us.features.length === 0 && (
              <div className="rounded-xl border border-dashed border-[#D6CEBD] bg-[#FAF8F3] p-6 text-center text-xs text-gray-500">
                No features configured yet. Click &quot;+ Add Another Feature&quot; below to add one.
              </div>
            )}

            {content.why_choose_us.features.map((feat, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-[#D6CEBD] bg-[#FAF8F3] p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#B89450]">
                      Feature 0{idx + 1}
                    </span>
                    {feat.title[activeLang] && (
                      <span className="text-xs font-medium text-gray-600 truncate max-w-xs">
                        — {feat.title[activeLang]}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const next = content.why_choose_us.features.filter((_, i) => i !== idx);
                      setContent((prev) => ({
                        ...prev,
                        why_choose_us: { ...prev.why_choose_us, features: next },
                      }));
                    }}
                    className="text-[11px] font-bold text-red-500 hover:text-red-700 transition-colors"
                  >
                    ✕ Remove
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#5D5A50] mb-1">
                      Title ({activeLang.toUpperCase()})
                    </label>
                    <input
                      type="text"
                      value={feat.title[activeLang] || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        const next = [...content.why_choose_us.features];
                        next[idx] = {
                          ...next[idx],
                          title: { ...next[idx].title, [activeLang]: val },
                        };
                        setContent((prev) => ({
                          ...prev,
                          why_choose_us: { ...prev.why_choose_us, features: next },
                        }));
                      }}
                      className="w-full rounded-lg border border-[#D6CEBD] bg-white px-3 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#5D5A50] mb-1">
                      Description ({activeLang.toUpperCase()})
                    </label>
                    <input
                      type="text"
                      value={feat.description[activeLang] || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        const next = [...content.why_choose_us.features];
                        next[idx] = {
                          ...next[idx],
                          description: {
                            ...next[idx].description,
                            [activeLang]: val,
                          },
                        };
                        setContent((prev) => ({
                          ...prev,
                          why_choose_us: { ...prev.why_choose_us, features: next },
                        }));
                      }}
                      className="w-full rounded-lg border border-[#D6CEBD] bg-white px-3 py-1.5 text-xs"
                    />
                  </div>
                </div>
              </div>
            ))}

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setContent((prev) => ({
                    ...prev,
                    why_choose_us: {
                      ...prev.why_choose_us,
                      features: [
                        ...prev.why_choose_us.features,
                        {
                          title: { en: "New Feature Highlight", th: "จุดเด่นใหม่", zh: "新特色亮点" },
                          description: {
                            en: "Add your personalized feature description here.",
                            th: "เพิ่มคำอธิบายจุดเด่นเฉพาะของคุณที่นี่",
                            zh: "在此处添加您的专属特色介绍。",
                          },
                          icon: "shield",
                        },
                      ],
                    },
                  }));
                }}
                className="rounded-xl border border-dashed border-[#B89450] bg-[#FFFDF9] px-4 py-2.5 text-xs font-bold text-[#17352A] hover:bg-[#FAF8F3] transition-colors flex items-center gap-2"
              >
                <span>+</span>
                <span>Add Another Feature</span>
              </button>
            </div>
          </div>

          {/* About Section in CMS */}
          <div className="border-t border-[#E5E0D8] pt-6 space-y-4">
            <h4 className="font-serif text-sm font-bold text-[#17352A]">
              About Us Section (Homepage Bottom)
            </h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-[11px] font-semibold text-[#5D5A50] mb-1">
                  About Heading ({activeLang.toUpperCase()})
                </label>
                <input
                  type="text"
                  value={content.about?.title?.[activeLang] || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setContent((prev) => ({
                      ...prev,
                      about: {
                        title: { ...(prev.about?.title || { en: "", th: "", zh: "" }), [activeLang]: val },
                        description: prev.about?.description || { en: "", th: "", zh: "" },
                      },
                    }));
                  }}
                  className="w-full rounded-lg border border-[#D6CEBD] bg-white px-3 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#5D5A50] mb-1">
                  About Paragraph ({activeLang.toUpperCase()})
                </label>
                <textarea
                  rows={2}
                  value={content.about?.description?.[activeLang] || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setContent((prev) => ({
                      ...prev,
                      about: {
                        title: prev.about?.title || { en: "", th: "", zh: "" },
                        description: { ...(prev.about?.description || { en: "", th: "", zh: "" }), [activeLang]: val },
                      },
                    }));
                  }}
                  className="w-full rounded-lg border border-[#D6CEBD] bg-white px-3 py-1.5 text-xs"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
