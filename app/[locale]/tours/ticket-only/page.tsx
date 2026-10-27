import { createClient } from '@/lib/supabase/server';
import { getLocale } from 'next-intl/server';
import Link from 'next/link';

type Tour = {
  id: number;
  title_en: string;
  title_zh: string | null;
  title_th: string | null;
  operated_days: string | null;
  price: number | null;
  image_url: string | null;
  tour_type: string | null;
  destination: string | null;
  duration: string | null;
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function TicketOnlyPage() {
  const locale = await getLocale();
  const supabase = await createClient();
  const isChinese = locale === 'zh';
  const isThai = locale === 'th';

  const { data: tours, error } = await supabase
    .from('tours')
    .select('*')
    .or('tour_type.eq.Ticket Only,tour_type.eq.ticket-only,tour_type.ilike.%ticket%')
    .order('id');

  if (error) {
    return (
      <main className="min-h-screen bg-[#F0EBDD] px-6 py-12">
        <div className="mx-auto max-w-5xl rounded-xl bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-[#282722]">
            {isChinese ? '加载门票项目失败' : isThai ? 'โหลดข้อมูลบัตรไม่สำเร็จ' : 'Failed to load tickets'}
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
            {isChinese
              ? '景点门票预订'
              : isThai
              ? 'บัตรเข้าชมสถานที่ท่องเที่ยว'
              : 'Attraction & Park Tickets'}
          </h1>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#625F56]">
            {isChinese
              ? '官方授权直营门票、水上乐园、主题秀场及文化表演，支持即时确认扫码入园。'
              : isThai
              ? 'จองบัตรเข้าชมสถานที่ท่องเที่ยว สวนน้ำ และการแสดงชั้นนำในภูเก็ต สะดวก รวดเร็ว พร้อมใช้งานทันที'
              : 'Book official admission tickets, water parks, cultural shows and entertainment passes across Phuket with instant digital confirmation.'}
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[11px] font-semibold text-[#17352A]">
            <span className="rounded-full bg-white px-3 py-1 shadow-2xs border border-[#B89450]/30">
              🎟 100% Direct Official Entry
            </span>
            <span className="rounded-full bg-white px-3 py-1 shadow-2xs border border-[#B89450]/30">
              ⚡ Instant Mobile Confirmation
            </span>
            <span className="rounded-full bg-white px-3 py-1 shadow-2xs border border-[#B89450]/30">
              ✓ Self-Admission (No Tour Transport Needed)
            </span>
          </div>
        </header>

        {/* Tour Cards */}
        {tours && tours.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tours.map((tour: Tour) => {
              const title =
                isChinese
                  ? tour.title_zh || tour.title_en
                  : isThai
                  ? tour.title_th || tour.title_en
                  : tour.title_en;

              return (
                <article
                  key={tour.id}
                  className="group flex h-full flex-col overflow-hidden rounded-xl border border-[#E4DED1] bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
                >
                  {/* Image */}
                  <div className="relative h-44 overflow-hidden bg-[#918A73] sm:h-40">
                    <span className="absolute right-2.5 top-2.5 z-10 rounded-md bg-emerald-600/90 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs backdrop-blur-xs">
                      🎟 Ticket Only
                    </span>
                    {tour.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={tour.image_url}
                        alt={title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-stone-100 text-[#B89450]">
                        <svg className="h-12 w-12 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
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

                    <h2 className="mb-2 text-base font-bold leading-snug text-[#282722]">
                      {title}
                    </h2>

                    <div className="mb-3 flex-1">
                      <p className="line-clamp-2 text-xs leading-5 text-[#625F56]">
                        {isChinese
                          ? '持电子确认码直接于景点闸机或售票处核销入场，畅享游乐项目与精彩演出。'
                          : isThai
                          ? 'แสดงเวาเชอร์อิเล็กทรอนิกส์ที่จุดตรวจบัตรเพื่อเข้าชมสถานที่และเพลิดเพลินกับกิจกรรม'
                          : 'Official admission ticket. Show mobile voucher barcode at turnstile or ticket booth for direct entry.'}
                      </p>
                    </div>

                    <div className="border-t border-[#E8E3D9] pt-3">
                      <p className="text-[9px] font-medium uppercase tracking-wider text-[#8A8579]">
                        {isChinese ? '入园日期' : isThai ? 'การใช้งาน' : 'VALIDITY'}
                      </p>

                      <p className="mt-1 text-xs text-[#625F56]">
                        {tour.operated_days || (isChinese ? '自选日期使用' : isThai ? 'ตามวันที่จอง' : 'Selected Date')}
                      </p>

                      <p className="mt-3 text-[9px] font-medium uppercase tracking-wider text-[#8A8579]">
                        {isChinese ? '门票起价' : isThai ? 'ราคาเริ่มต้น' : 'TICKET PRICE FROM'}
                      </p>

                      <p className="mt-1 text-base font-bold text-[#B89450]">
                        {tour.price !== null && tour.price > 0
                          ? `฿${Number(tour.price).toLocaleString()} / ${isChinese ? '张' : isThai ? 'ใบ' : 'ticket'}`
                          : isChinese
                          ? '价格请咨询'
                          : isThai
                          ? 'ติดต่อสอบถาม'
                          : 'Price on request'}
                      </p>
                    </div>

                    {/* View Details */}
                    <Link
                      href={`/${locale}/tours/${tour.id}`}
                      className="mt-4 inline-flex w-fit items-center justify-center gap-2 rounded-full bg-[#26251F] px-5 py-2 text-xs font-semibold text-white transition duration-300 hover:bg-[#B89450] hover:text-[#22211D]"
                    >
                      {isChinese ? '预订门票' : isThai ? 'จองบัตร' : 'Book Tickets'}
                      <span>→</span>
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl bg-white px-6 py-14 text-center shadow-sm">
            <p className="text-base font-semibold text-[#282722]">
              {isChinese
                ? '暂无门票项目'
                : isThai
                ? 'ยังไม่มีรายการบัตรเข้าชมในขณะนี้'
                : 'No ticket-only tours available yet.'}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
