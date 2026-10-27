import { createClient } from '@/lib/supabase/server';
import { getLocale } from 'next-intl/server';
import Link from 'next/link';

type Tour = {
  id: number;
  title_en: string;
  title_zh: string;
  operated_days: string;
  price: number | null;
  image_url: string | null;
  tour_type: string | null;
  destination: string | null;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PackagePage() {
  const locale = await getLocale();
  const supabase = await createClient();

  const { data: tours, error } = await supabase
    .from('tours')
    .select('*')
    .eq('tour_type', 'package')
    .order('id');

  if (error) {
    return (
      <main className="min-h-screen bg-[#F0EBDD] px-6 py-12">
        <div className="mx-auto max-w-5xl rounded-xl bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-[#282722]">
            {locale === 'zh' ? '加载旅游项目失败' : 'Failed to load tours'}
          </h1>
          <p className="mt-3 text-sm text-[#625F56]">{error.message}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F0EBDD] px-5 py-12 md:px-8 md:py-14">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <header className="mb-9 text-center">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.35em] text-[#B89450]">
            SILVER HAWK
          </p>

          <h1 className="text-3xl font-bold text-[#282722] md:text-4xl">
            {locale === 'zh' ? '套餐游' : 'Package Tours'}
          </h1>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#625F56]">
            {locale === 'zh'
              ? '旅游是让生活焕然一新的良药。'
              : 'Discover memorable journeys with our curated package tours.'}
          </p>
        </header>

        {/* Tour Cards */}
        {tours && tours.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tours.map((tour: Tour) => {
              const title =
                locale === 'zh' ? tour.title_zh : tour.title_en;

              return (
                <article
                  key={tour.id}
                  className="group flex h-full flex-col overflow-hidden rounded-xl border border-[#E4DED1] bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
                >
                  {/* Image */}
                  <div className="relative h-44 overflow-hidden bg-[#918A73] sm:h-40">
                    {tour.image_url ? (
                      <img
                        src={tour.image_url}
                        alt={title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-stone-100 text-[#B89450]">
                        <svg className="h-10 w-10 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex flex-1 flex-col p-4">
                    {tour.destination && (
                      <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-[#B89450]">
                        {tour.destination}
                      </p>
                    )}

                    <h2 className="mb-3 text-base font-bold leading-snug text-[#282722]">
                      {title}
                    </h2>

                    <div className="mb-3 flex-1">
                      <p className="line-clamp-2 text-xs leading-5 text-[#625F56]">
                        {locale === 'zh'
                          ? '探索目的地，体验当地文化与独特风景。'
                          : 'Explore distinctive destinations and enjoy memorable local experiences.'}
                      </p>
                    </div>

                    <div className="border-t border-[#E8E3D9] pt-3">
                      <p className="text-[9px] font-medium uppercase tracking-wider text-[#8A8579]">
                        {locale === 'zh' ? '营业日' : 'AVAILABLE'}
                      </p>

                      <p className="mt-1 text-xs text-[#625F56]">
                        {tour.operated_days ||
                          (locale === 'zh' ? '请咨询' : 'Please enquire')}
                      </p>

                      <p className="mt-3 text-[9px] font-medium uppercase tracking-wider text-[#8A8579]">
                        {locale === 'zh' ? '价格' : 'PRICE'}
                      </p>

                      <p className="mt-1 text-base font-bold text-[#B89450]">
                        {tour.price !== null && tour.price > 0
                          ? `฿${Number(tour.price).toLocaleString()}`
                          : locale === 'zh'
                            ? '价格请咨询'
                            : 'Price on request'}
                      </p>
                    </div>

                    {/* View Details */}
                    <Link
                      href={`/${locale}/tours/${tour.id}`}
                      className="mt-4 inline-flex w-fit items-center justify-center gap-2 rounded-full bg-[#26251F] px-5 py-2 text-xs font-semibold text-white transition duration-300 hover:bg-[#B89450] hover:text-[#22211D]"
                    >
                      {locale === 'zh' ? '查看详情' : 'View Details'}
                      <span className="transition-transform duration-300 group-hover:translate-x-1">
                        →
                      </span>
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl bg-white px-6 py-14 text-center shadow-sm">
            <p className="text-base font-semibold text-[#282722]">
              {locale === 'zh'
                ? '暂无套餐旅游项目'
                : 'No package tours available yet.'}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}