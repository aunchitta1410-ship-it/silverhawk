'use client';

import { useState } from 'react';
import { getLocalizedCategory, getLocalizedTourType } from '@/lib/tour-i18n';

type Tour = {
  id: number;
  title_en: string;
  title_zh?: string | null;
  image_url: string | null;
  tour_type?: string | null;
  category?: string | null;
};

const CATEGORY_DEFAULT_IMAGES: Record<string, string> = {
  "Island & Marine": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
  "Adventure & Eco": "https://images.unsplash.com/photo-1534567153574-2b12153a87f0?auto=format&fit=crop&w=800&q=80",
  "Cultural & Community": "https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=800&q=80",
  "Transfers & Charters": "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=800&q=80",
  "Tickets & Attractions": "https://images.unsplash.com/photo-1513889961551-628c1e5e2ee9?auto=format&fit=crop&w=800&q=80",
  "Ticket Only": "https://images.unsplash.com/photo-1513889961551-628c1e5e2ee9?auto=format&fit=crop&w=800&q=80",
};

export default function TourTypeCarousel({
  tourTypes,
  categories,
  tours,
  locale,
}: {
  tourTypes?: string[];
  categories?: string[];
  tours: Tour[];
  locale: string;
}) {
  const [page, setPage] = useState(0);

  const isChinese = locale === 'zh';
  const isThai = locale === 'th';

  const isCategoryMode = Boolean(categories && categories.length > 0);
  const items = isCategoryMode ? (categories || []) : (tourTypes || []);

  const pages: string[][] = [];

  for (let i = 0; i < items.length; i += 3) {
    pages.push(items.slice(i, i + 3));
  }

  const currentItems = pages[page] || [];

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

  const getTourForItem = (item: string) => {
    if (isCategoryMode) {
      return (
        tours.find((t) => t.category === item && t.image_url) ||
        tours.find((t) => (t.tour_type || '').toLowerCase().includes(item.toLowerCase()) && t.image_url) ||
        tours.find((t) => t.category === item)
      );
    }
    return tours.find((tour) => tour.tour_type === item);
  };

  const getTourUrl = (item: string) => {
    if (isCategoryMode) {
      return `/${locale}/tours?category=${encodeURIComponent(item)}`;
    }
    return `/${locale}/tours?type=${encodeURIComponent(item)}`;
  };

  const getImageForItem = (item: string, tour?: Tour) => {
    if (tour?.image_url) return tour.image_url;
    if (CATEGORY_DEFAULT_IMAGES[item]) return CATEGORY_DEFAULT_IMAGES[item];
    return null;
  };

  return (
    <div className="relative px-1">
      {/* Left Arrow */}
      {page > 0 && (
        <button
          onClick={goPrevious}
          className="absolute -left-4 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-[#B89450]/50 bg-[#22211D] text-2xl text-[#D1B16A] shadow-lg transition duration-300 hover:scale-110 hover:bg-[#D1B16A] hover:text-[#22211D] md:-left-6 md:h-14 md:w-14"
          aria-label="Previous"
        >
          ←
        </button>
      )}

      {/* Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {currentItems.map((item, index) => {
          const tour = getTourForItem(item);
          const imageUrl = getImageForItem(item, tour);
          const actualIndex = page * 3 + index;

          return (
            <a
              key={item}
              href={getTourUrl(item)}
              className="group relative h-[360px] overflow-hidden rounded-2xl border border-[#B89450]/20 bg-[#22211D] shadow-md transition duration-500 hover:-translate-y-1 hover:border-[#D1B16A]/70 hover:shadow-xl md:h-[420px]"
            >
              {/* Image */}
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={item}
                  className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-110"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-[#302E28] text-[#D1B16A]">
                  <svg className="h-16 w-16 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              )}

              {/* Dark Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#171613] via-[#171613]/35 to-black/10 transition duration-500 group-hover:from-[#171613]/95" />

              {/* Gold Number */}
              <div className="absolute left-5 top-5 flex h-11 w-11 items-center justify-center rounded-full border border-[#D1B16A]/70 bg-[#22211D]/70 text-sm font-semibold tracking-wider text-[#E5CA8A] backdrop-blur-sm">
                {String(actualIndex + 1).padStart(2, '0')}
              </div>

              {/* Gold Accent */}
              <div className="absolute bottom-[126px] left-5 h-[2px] w-10 bg-[#D1B16A] transition-all duration-500 group-hover:w-16" />

              {/* Content */}
              <div className="absolute bottom-0 left-0 right-0 p-5 text-white md:p-6">
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#D1B16A] block mb-1">
                  {isCategoryMode ? (isThai ? 'หมวดหมู่การเดินทาง' : isChinese ? '体验分类' : 'CATEGORY') : 'TOUR TYPE'}
                </span>

                <h3 className="text-xl font-bold leading-tight tracking-wide text-white md:text-2xl">
                  {isCategoryMode
                    ? getLocalizedCategory(item, locale)
                    : getLocalizedTourType(item, locale)}
                </h3>

                <div className="mt-5 inline-flex items-center rounded-full border border-[#D1B16A] bg-[#D1B16A] px-5 py-2.5 text-sm font-semibold text-[#22211D] transition duration-300 group-hover:border-[#E5CA8A] group-hover:bg-[#E5CA8A]">
                  {isThai ? 'ดูทัวร์ทั้งหมด' : isChinese ? '查看旅游' : 'View Tours'}
                  <span className="ml-2 transition-transform duration-300 group-hover:translate-x-1">
                    →
                  </span>
                </div>
              </div>
            </a>
          );
        })}
      </div>

      {/* Right Arrow */}
      {page < pages.length - 1 && (
        <button
          onClick={goNext}
          className="absolute -right-4 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-[#B89450]/50 bg-[#22211D] text-2xl text-[#D1B16A] shadow-lg transition duration-300 hover:scale-110 hover:bg-[#D1B16A] hover:text-[#22211D] md:-right-6 md:h-14 md:w-14"
          aria-label="Next"
        >
          →
        </button>
      )}
    </div>
  );
}
