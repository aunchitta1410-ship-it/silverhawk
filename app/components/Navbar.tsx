"use client";

import { useTranslations, useLocale } from "next-intl";
import { usePathname, useSearchParams } from "next/navigation";

export default function Navbar() {
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("nav");

  // Remove the locale prefix from the current path.
  const pathWithoutLocale =
    (pathname || "").replace(/^\/(en|zh|th)(?=\/|$)/, "") || "";

  // Do not show the public navbar on admin pages
  if (pathname && (pathname.includes("/admin") || pathWithoutLocale.startsWith("/admin"))) {
    return null;
  }

  function changeLanguage(nextLocale: string) {
    const query = searchParams.toString();
    const nextUrl =
      `/${nextLocale}${pathWithoutLocale}` +
      (query ? `?${query}` : "") +
      window.location.hash;

    window.location.assign(nextUrl);
  }

  const homeUrl = `/${locale}`;
  const isHomePage =
    pathname === homeUrl || pathname === `${homeUrl}/`;

  function getSectionUrl(section: string) {
    return isHomePage
      ? `#${section}`
      : `${homeUrl}#${section}`;
  }

  const linkClass =
    "font-medium text-[#F0EBDD] transition-colors duration-300 hover:text-[#D1B16A]";

  const languages = [
    {
      code: "en",
      label: "English",
      shortLabel: "EN",
      flag: (
        <svg viewBox="0 0 60 30" className="h-3.5 w-5 shrink-0 rounded-xs shadow-xs" aria-hidden="true">
          <clipPath id="uk-clip"><path d="M0,0 v30 h60 v-30 z"/></clipPath>
          <clipPath id="uk-diag"><path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z"/></clipPath>
          <g clipPath="url(#uk-clip)">
            <path d="M0,0 v30 h60 v-30 z" fill="#012169"/>
            <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6"/>
            <path d="M0,0 L60,30 M60,0 L0,30" clipPath="url(#uk-diag)" stroke="#C8102E" strokeWidth="4"/>
            <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10"/>
            <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6"/>
          </g>
        </svg>
      ),
    },
    {
      code: "zh",
      label: "中文",
      shortLabel: "中文",
      flag: (
        <svg viewBox="0 0 900 600" className="h-3.5 w-5 shrink-0 rounded-xs shadow-xs" aria-hidden="true">
          <rect width="900" height="600" fill="#DE2910"/>
          <polygon fill="#FFDE00" points="150,50 179,141 83,85 217,85 121,141"/>
          <polygon fill="#FFDE00" points="300,40 309,68 285,51 315,51 291,68"/>
          <polygon fill="#FFDE00" points="360,90 369,118 345,101 375,101 351,118"/>
          <polygon fill="#FFDE00" points="360,170 369,198 345,181 375,181 351,198"/>
          <polygon fill="#FFDE00" points="300,230 309,258 285,241 315,241 291,258"/>
        </svg>
      ),
    },
    {
      code: "th",
      label: "ไทย",
      shortLabel: "TH",
      flag: (
        <svg viewBox="0 0 900 600" className="h-3.5 w-5 shrink-0 rounded-xs shadow-xs" aria-hidden="true">
          <rect width="900" height="600" fill="#A51931"/>
          <rect y="100" width="900" height="400" fill="#F4F5F8"/>
          <rect y="200" width="900" height="200" fill="#2D2A4A"/>
        </svg>
      ),
    },
  ];

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-[#B89450]/40 bg-[#22211D] px-6 py-4 text-[#F0EBDD] shadow-md md:px-8">
      <a
        href={homeUrl}
        className="flex items-center shrink-0 group transition-opacity hover:opacity-95"
        aria-label="Silver Hawk Group Home"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt="Silver Hawk Group Logo"
          className="h-11 w-auto max-w-[56px] object-contain transition-transform group-hover:scale-105"
        />
      </a>

      <div className="hidden items-center gap-6 lg:flex xl:gap-8">
        <a href={homeUrl} className={linkClass}>
          {t("home")}
        </a>

        <a href={getSectionUrl("tours")} className={linkClass}>
          {t("tours")}
        </a>

        <a href={getSectionUrl("about")} className={linkClass}>
          {t("about")}
        </a>
      </div>

      {/* Flag Language Changer */}
      <div
        className="flex items-center gap-1 rounded-xl border border-[#B89450]/40 bg-[#302E28] p-1 shadow-sm"
        role="group"
        aria-label="Select language"
      >
        {languages.map((lang) => {
          const isActive = locale === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => changeLanguage(lang.code)}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all duration-200 ${
                isActive
                  ? "bg-gradient-to-r from-[#D1B16A] to-[#B89450] text-black shadow-sm font-bold"
                  : "text-[#F0EBDD] hover:bg-white/10 hover:text-[#E5CA8A]"
              }`}
              title={lang.label}
              aria-label={`Change language to ${lang.label}`}
              aria-pressed={isActive}
            >
              {lang.flag}
              <span className="hidden sm:inline">{lang.shortLabel}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}