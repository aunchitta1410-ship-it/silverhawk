import { getLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

type Tour = {
  id: number;
  title_en: string;
  title_zh: string;
  description_en: string | null;
  description_zh: string | null;
  operated_days: string | null;
  price: number | null;
  image_url: string | null;
  tour_type: string | null;
  destination: string | null;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function EducationCampPage() {
  const locale = await getLocale();
  const isChinese = locale === 'zh';

  const supabase = await createClient();

  const { data: tours, error } = await supabase
    .from('tours')
    .select('*')
    .eq('tour_type', 'Education Camp')
    .order('id');

  if (error) {
    console.error('Education Camp Error:', error);

    return (
      <main className="min-h-screen bg-paper px-6 py-20">
        <div className="mx-auto max-w-5xl text-center">
          <h1 className="text-3xl font-bold text-red-600">
            Failed to load Education Camp
          </h1>

          <p className="mt-4 text-gray-600">
            {error.message}
          </p>
        </div>
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
            {isChinese ? '教育营' : 'Education Camp'}
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-gray-600 md:text-lg">
            {isChinese
              ? '探索结合学习、社区参与和可持续发展的教育体验。'
              : 'Explore educational experiences that combine learning, community engagement, and sustainable tourism.'}
          </p>

        </div>
      </section>

      {/* Tours */}
      <section className="px-6 pb-20 md:px-10">
        <div className="mx-auto max-w-7xl">

          {tours && tours.length > 0 ? (

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">

              {tours.map((tour: Tour) => {

                const title = isChinese
                  ? tour.title_zh || tour.title_en
                  : tour.title_en;

                const description = isChinese
                  ? tour.description_zh || tour.description_en
                  : tour.description_en;

                return (
                  <article
                    key={tour.id}
                    className="overflow-hidden rounded-2xl bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
                  >

                    {/* Image */}
                    <div className="relative h-64 overflow-hidden bg-gray-100">
                      {tour.image_url ? (
                        <img
                          src={tour.image_url}
                          alt={title}
                          className="h-full w-full object-cover transition duration-500 hover:scale-105"
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

                      {tour.destination && (
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-sand">
                          {tour.destination}
                        </p>
                      )}

                      <h2 className="text-2xl font-bold leading-tight text-forest-deep">
                        {title}
                      </h2>

                      {description && (
                        <p className="mt-4 line-clamp-3 text-sm leading-7 text-gray-600">
                          {description}
                        </p>
                      )}

                      {/* Available */}
                      <div className="mt-5 border-t border-gray-200 pt-4">
                        <p className="text-xs uppercase tracking-wide text-gray-500">
                          {isChinese ? '营业日' : 'Available'}
                        </p>

                        <p className="mt-1 text-sm font-semibold text-forest-deep">
                          {tour.operated_days || '-'}
                        </p>
                      </div>

                      {/* Price */}
                      <div className="mt-4">
                        <p className="text-xs uppercase tracking-wide text-gray-500">
                          {isChinese ? '价格' : 'Price'}
                        </p>

                        <p className="mt-1 text-2xl font-bold text-copper">
                          {tour.price !== null && tour.price > 0
                            ? `฿${Number(tour.price).toLocaleString()}`
                            : isChinese
                              ? '价格请咨询'
                              : 'Price on request'}
                        </p>
                      </div>

                      {/* View Details */}
                      <Link
                        href={`/${locale}/tours/education-camp/${tour.id}`}
                        className="mt-6 inline-flex rounded-full bg-forest-deep px-6 py-3 font-semibold text-paper transition hover:bg-copper"
                      >
                        {isChinese
                          ? '查看详情'
                          : 'View Details'}
                      </Link>

                    </div>
                  </article>
                );
              })}

            </div>

          ) : (

            <div className="rounded-2xl bg-white p-12 text-center shadow-sm">

              <h2 className="text-2xl font-bold text-forest-deep">
                {isChinese
                  ? '暂无教育营项目'
                  : 'No Education Camp Found'}
              </h2>

              <p className="mt-4 text-gray-600">
                {isChinese
                  ? '目前没有找到教育营项目。'
                  : 'No education camp tours are currently available.'}
              </p>

            </div>

          )}

        </div>
      </section>

    </main>
  );
}