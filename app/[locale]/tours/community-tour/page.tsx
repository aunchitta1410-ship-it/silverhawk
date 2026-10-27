import { createClient } from '@/lib/supabase/server';
import { getLocale } from 'next-intl/server';
import Link from 'next/link';

type Tour = {
  id: number;
  title_en: string;
  title_zh: string;
  operated_days: string | null;
  price: number | null;
  image_url: string | null;
  tour_type: string | null;
  destination: string | null;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CommunityTourPage() {
  const locale = await getLocale();

const isThai = locale === 'th';
const isChinese = locale === 'zh';
  const supabase = await createClient();

  const { data: tours, error } = await supabase
    .from('tours')
    .select('*')
    .eq('tour_type', 'Community Tour')
    .order('id');

  console.log('COMMUNITY TOURS:', tours);
  console.log('COMMUNITY TOUR ERROR:', error);

  if (error) {
    return (
      <main className="min-h-screen bg-white p-8">
        <h1 className="text-3xl font-bold text-red-600">
          Failed to load tours
        </h1>

        <p className="mt-4 text-gray-600">
          {error.message}
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-paper text-ink">

      {/* Header */}
      <section className="px-6 py-16 md:px-10">
        <div className="mx-auto max-w-7xl text-center">

          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-sand">
            SILVER HAWK
          </p>

          <h1 className="text-4xl font-bold text-forest-deep md:text-5xl">
            {locale === 'zh'
              ? '社区旅游'
              : 'Community Tour'}
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-gray-600 md:text-lg">
            {locale === 'zh'
              ? '探索普吉岛当地社区，体验真实的生活方式、文化与自然。'
              : 'Explore local communities in Phuket and experience authentic local lifestyles, culture, and nature.'}
          </p>

        </div>
      </section>

      {/* Tour Cards */}
      <section className="px-6 pb-20 md:px-10">

        <div className="mx-auto max-w-7xl">

          {tours && tours.length > 0 ? (

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">

              {tours.map((tour: Tour) => {

                const title =
                  locale === 'zh'
                    ? tour.title_zh || tour.title_en
                    : tour.title_en;

                return (
                  <div
                    key={tour.id}
                    className="overflow-hidden rounded-2xl bg-white shadow-lg"
                  >

                    {/* Image */}
                    <div className="relative h-64 overflow-hidden bg-gray-100">
                      {tour.image_url ? (
                        <img
                          src={tour.image_url}
                          alt={title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-stone-100 text-[#B89450]">
  <svg className="h-12 w-12 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
</div>
                      )}

                    </div>

                    {/* Content */}
                    <div className="p-6">

                      {/* Destination */}
                      {tour.destination && (
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-sand">
                          {tour.destination}
                        </p>
                      )}

                      {/* Title */}
                      <h2 className="text-2xl font-bold leading-tight text-forest-deep">
                        {title}
                      </h2>

                      {/* Available */}
                      <div className="mt-5 border-t border-gray-200 pt-4">

                        <p className="text-xs uppercase tracking-wide text-gray-500">
                          {locale === 'zh'
                            ? '营业日'
                            : 'Available'}
                        </p>

                        <p className="mt-1 text-sm font-semibold text-forest-deep">
                          {tour.operated_days || '-'}
                        </p>

                      </div>

                      {/* Price */}
                      <div className="mt-4">

                        <p className="text-xs uppercase tracking-wide text-gray-500">
                          {locale === 'zh'
                            ? '价格'
                            : 'Price'}
                        </p>

                        <p className="mt-1 text-2xl font-bold text-copper">
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
                        className="mt-6 inline-flex rounded-full bg-forest-deep px-6 py-3 font-semibold text-paper transition hover:bg-copper"
                      >
                        {locale === 'zh'
                          ? '查看详情'
                          : 'View Details'}
                      </Link>

                    </div>

                  </div>
                );
              })}

            </div>

          ) : (

            <div className="rounded-2xl bg-white p-12 text-center shadow-sm">

              <h2 className="text-2xl font-bold text-forest-deep">
                {locale === 'zh'
                  ? '暂无社区旅游项目'
                  : 'No Community Tours Found'}
              </h2>

              <p className="mt-4 text-gray-600">
                {locale === 'zh'
                  ? '目前没有找到社区旅游项目。'
                  : 'No community tours are currently available.'}
              </p>

            </div>

          )}

        </div>

      </section>

    </main>
  );
}