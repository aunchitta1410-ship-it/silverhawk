
'use client';

import { useState } from 'react';
import Link from 'next/link';
type Theme = {
  id: string | number;
  name_en: string;
  name_zh: string | null;
  description_en?: string | null;
  description_zh?: string | null;
  image_url: string | null;
  sort_order?: number | null;
};

export default function ThemeCarousel({
  themes,
  locale,
}: {
  themes: Theme[];
  locale: string;
}) {
  const [page, setPage] = useState(0);

  const isChinese = locale === 'zh';

  // แบ่ง Theme เป็นชุดละ 3
  const pages: Theme[][] = [];

  for (let i = 0; i < themes.length; i += 3) {
    pages.push(themes.slice(i, i + 3));
  }

  const currentThemes = pages[page] || [];

  const goNext = () => {
    if (page < pages.length - 1) {
      setPage(page + 1);
    }
  };

  const goPrevious = () => {
    if (page > 0) {
      setPage(page - 1);
    }
  };

  return (
    <div className="relative">

      {/* Left Arrow */}
      {page > 0 && (
        <button
          onClick={goPrevious}
          className="absolute left-0 top-1/2 z-20 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full bg-white text-3xl text-forest-deep shadow-lg transition hover:scale-105"
          aria-label="Previous"
        >
          ←
        </button>
      )}

      {/* Theme Cards */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {currentThemes.map((theme, index) => {
          const actualIndex = page * 3 + index;

          const name = isChinese
            ? theme.name_zh || theme.name_en
            : theme.name_en;

          const description = isChinese
            ? theme.description_zh || theme.description_en
            : theme.description_en;

          return (
  <Link
    key={`${theme.id}-${index}`}
    href={`/${locale}/tours/${theme.id}`}
    className="group relative h-[420px] overflow-hidden rounded-2xl"
  >

              {/* Image */}
              {theme.image_url ? (
                <img
                  src={theme.image_url}
                  alt={name}
                  className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-110"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-[#17352A] text-[#B89450]">
                  <svg className="h-16 w-16 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              )}

              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

              {/* Number Badge */}
              <div className="absolute left-5 top-5 flex items-center gap-2">
                <span className="text-2xl font-light text-white">
                  {String(theme.sort_order ?? actualIndex + 1).padStart(2, '0')}
                </span>
              </div>

              {/* Content */}
              <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                <h3 className="text-xl font-bold leading-tight">
                  {name}
                </h3>

                {description && (
                  <p className="mt-2 line-clamp-3 text-sm text-white/80">
                    {description}
                  </p>
                )}
              </div>

            </Link>
          );
        })}
      </div>

      {/* Right Arrow */}
      {page < pages.length - 1 && (
        <button
          onClick={goNext}
          className="absolute right-0 top-1/2 z-20 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full bg-white text-3xl text-forest-deep shadow-lg transition hover:scale-105"
          aria-label="Next"
        >
          →
        </button>
      )}

    </div>
  );
}