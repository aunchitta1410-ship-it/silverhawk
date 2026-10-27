import { getLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getHomepageContent } from '@/lib/homepage-content';
import { getTourCategories } from '@/lib/tour-categories';
import { getAllTourExtendedData } from '@/lib/tour-extended';
import TourTypeCarousel from '../components/TourTypeCarousel';
import { getLocalizedDestination, getLocalizedCategory } from '@/lib/tour-i18n';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HomePage() {
  const t = await getTranslations('nav');
  const locale = await getLocale();
  const isChinese = locale === 'zh';
  const isThai = locale === 'th';

  const supabase = await createClient();
  const cms = await getHomepageContent();

  const getLang = (obj?: { en: string; th: string; zh: string }, fallback = "") => {
    if (!obj) return fallback;
    if (isThai && obj.th) return obj.th;
    if (isChinese && obj.zh) return obj.zh;
    return obj.en || fallback;
  };

  // 1. Fetch tours from Supabase
  const { data: tours, error } = await supabase
    .from('tours')
    .select('*')
    .order('id');

  if (error) {
    // Log Supabase error fields explicitly so the server terminal shows the real cause.
    console.error('Error fetching tours:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
  }

  // Load tour categories and extended data
  const [categoriesMap, extendedMap] = await Promise.all([
    getTourCategories(),
    getAllTourExtendedData(),
  ]);

  // Combine categories defined in system + tours
  const categoryList = Object.keys(categoriesMap).filter((c) => c !== "Ticket Only");
  if (!categoryList.includes("Tickets & Attractions")) {
    categoryList.push("Tickets & Attractions");
  }

  // Attach category to each tour from extended data
  const toursWithCategory = (tours ?? []).map((tour) => {
    const ext = extendedMap[String(tour.id)];
    let cat = ext?.category || tour.category;
    if (!cat) {
      const type = (tour.tour_type || "").toLowerCase();
      if (type.includes("ticket")) cat = "Tickets & Attractions";
      else if (type.includes("transfer") || type.includes("private")) cat = "Transfers & Charters";
      else if (type.includes("sustainable") || type.includes("regenerative") || type.includes("camp")) cat = "Adventure & Eco";
      else if (type.includes("community")) cat = "Cultural & Community";
      else cat = "Island & Marine";
    }
    return {
      ...tour,
      category: cat,
    };
  });

  // Extract clean, mapped destinations from existing tours
  const destinations = [
    ...new Set(
      toursWithCategory
        .map((tour) => tour.destination?.trim())
        .filter((value): value is string => Boolean(value))
    ),
  ].sort((a, b) => a.localeCompare(b));

  // Build Tour Types for backward compatibility
  const tourTypes = [
    ...new Set(
      (tours ?? [])
        .map((tour) => tour.tour_type?.trim())
        .filter((value): value is string => Boolean(value))
    ),
  ].sort((a, b) => a.localeCompare(b));

  return (
    <main className="min-h-screen bg-paper text-ink">
      {/* Hero */}
      <section
        className="relative overflow-hidden bg-[#F0EBDD] px-5 py-16 text-left text-[#282722] md:px-8 md:py-24"
        style={
          cms.hero.bg_image_url
            ? {
                backgroundImage: `linear-gradient(rgba(240, 235, 221, 0.55), rgba(240, 235, 221, 0.70)), url("${cms.hero.bg_image_url}")`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : undefined
        }
      >
        <div className="mx-auto max-w-7xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.25em] text-[#B89450]">
            {cms.hero.eyebrow || 'SILVER HAWK GROUP'}
          </p>
          <h1 className="mb-6 max-w-5xl text-4xl font-bold leading-tight md:text-6xl lg:text-7xl">
            {getLang(cms.hero.title, isThai
              ? 'หลีกหนีความวุ่นวาย สัมผัสธรรมชาติอย่างใกล้ชิด'
              : isChinese
                ? '远离喧嚣，回归自然'
                : 'Beyond the Crowds, Closer to Nature')}
          </h1>
          <p className="max-w-2xl text-base leading-8 text-[#5D5A50] md:text-xl">
            {getLang(cms.hero.subtitle, isThai
              ? 'การเดินทางที่คัดสรรอย่างพิถีพิถันทั่วภูเก็ต'
              : isChinese
                ? '精选普吉岛深度旅行体验'
                : 'Handpicked journeys across Phuket')}
          </p>
        </div>
      </section>
      
      
      
      
      {/* Quick Search */}
      <section className="bg-[#F0EBDD] px-5 py-8 md:px-8 md:py-12">
        <div className="mx-auto max-w-7xl rounded-xl border border-[#B89450]/35 bg-white p-5 shadow-sm md:p-7">
          <h2 className="mb-5 text-xl font-bold text-[#282722]">
            {isThai ? 'ค้นหาทัวร์' : isChinese ? '搜索旅游' : 'Search Tours'}
          </h2>

          <form action={`/${locale}/tours`} method="get">
            {/* Search input + Search button */}
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <label
                  htmlFor="home-search"
                  className="mb-2 block text-sm font-semibold text-[#282722]"
                >
                  {isThai
  ? 'ค้นหาทัวร์'
  : isChinese
    ? '搜索旅游'
    : 'Search Tours'}
</label>

<input
  id="home-search"
  type="search"
  name="search"
  placeholder={
    isThai
      ? 'ค้นหาชื่อทัวร์ ปลายทาง หรือคำสำคัญ...'
      : isChinese
        ? '搜索旅游名称、目的地或关键词...'
        : 'Search by tour name, destination or keyword...'
  }
  className="w-full rounded-xl border border-[#B89450]/35 bg-white px-4 py-3 text-[#282722] outline-none focus:border-[#B89450] focus:ring-1 focus:ring-[#B89450]"
/>
              </div>

              <button
                type="submit"
                className="w-full rounded-full bg-[#282722] px-8 py-3 font-semibold text-[#F0EBDD] transition duration-300 hover:bg-[#B89450] hover:text-[#282722] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B89450] sm:w-auto sm:min-w-[160px]"
              >
                {isThai ? 'ค้นหา' : isChinese ? '搜索' : 'Search'}
              </button>
            </div>

            {/* Destination + Category */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="home-destination"
                  className="mb-2 block text-sm font-medium text-[#282722]"
                >
                  {isThai ? 'จุดหมายปลายทาง' : isChinese ? '目的地' : 'Destination'}
                </label>
                <select
                  id="home-destination"
                  name="destination"
                  defaultValue=""
                  className="w-full rounded-xl border border-[#B89450]/35 bg-white px-3 py-3 text-[#282722] outline-none focus:border-[#B89450] focus:ring-1 focus:ring-[#B89450]"
                >
                  <option value="">
                    {isThai ? 'ทุกจุดหมายปลายทาง' : isChinese ? '所有目的地' : 'All Destinations'}
                  </option>
                  {destinations.map((item) => (
                    <option key={item} value={item}>
                      {getLocalizedDestination(item, locale)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="home-category"
                  className="mb-2 block text-sm font-medium text-[#282722]"
                >
                  {isThai ? 'หมวดหมู่ทัวร์' : isChinese ? '旅游分类' : 'Category'}
                </label>
                <select
                  id="home-category"
                  name="category"
                  defaultValue=""
                  className="w-full rounded-xl border border-[#B89450]/35 bg-white px-3 py-3 text-[#282722] outline-none focus:border-[#B89450] focus:ring-1 focus:ring-[#B89450]"
                >
                  <option value="">
                    {isThai ? 'ทุกหมวดหมู่' : isChinese ? '所有分类' : 'All Categories'}
                  </option>
                  {categoryList.map((item) => (
                    <option key={item} value={item}>
                      {getLocalizedCategory(item, locale)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </form>
        </div>
      </section>

      {/* All Tours */}
      <section
        id="tours"
        className="bg-[#282722] px-5 py-20 text-[#F0EBDD] md:px-8"
      >
        <div className="mx-auto max-w-[1500px]">
          <div className="mb-10 text-center">
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.3em] text-[#B89450]">
              {getLang(cms.tours_header?.eyebrow, isThai ? 'การเดินทางสำหรับทุกสไตล์' : isChinese ? '适合每一种旅行风格' : 'JOURNEYS FOR EVERY STYLE')}
            </p>

            <h2 className="text-4xl font-bold md:text-5xl">
              {getLang(cms.tours_header?.title, isThai ? 'ทัวร์ทั้งหมด' : isChinese ? '所有旅游' : 'All Tours')}
            </h2>

            <p className="mt-3 text-paper/70">
              {getLang(cms.tours_header?.subtitle, isThai ? 'ค้นพบรูปแบบการเดินทางที่ใช่สำหรับคุณ' : isChinese ? '探索属于您的旅行方式' : 'Explore your travel style')}
            </p>
          </div>

          <TourTypeCarousel
            categories={categoryList}
            tours={toursWithCategory}
            locale={locale}
          />
        </div>
      </section>

      {/* Services Beyond Tours */}
      <section
        id="service"
        className="scroll-mt-24 bg-[#F0EBDD] px-5 py-16 md:px-8 md:py-20"
      >
        <div className="mx-auto max-w-[1400px]">
          <div className="mb-10">
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.3em] text-[#B89450]">
              {getLang(cms.services_header?.eyebrow, isThai ? 'บริการของเรา' : isChinese ? '我们的服务' : 'OUR SERVICES')}
            </p>

            <h2 className="text-3xl font-bold text-[#282722] md:text-5xl">
              {getLang(cms.services_header?.title, isThai ? 'บริการที่มากกว่าการท่องเที่ยว' : isChinese ? '旅游之外的服务' : 'Services Beyond Tours')}
            </h2>

            <p className="mt-3 max-w-2xl text-gray-600">
              {getLang(cms.services_header?.subtitle, isThai ? 'บริการที่ยืดหยุ่นและเป็นมืออาชีพ เพื่อให้ทุกการเดินทางสะดวกสบายและราบรื่น' : isChinese ? '提供专业而灵活的服务，让您的旅程更加轻松、舒适。' : 'Flexible and professional services designed to make your journey seamless.')}
            </p>
          </div>

          {/* 01 Airport & VIP Transfer */}
          <div
            className="group block rounded-2xl border border-transparent p-6 transition-all duration-300 hover:border-[#B89450]/40 hover:bg-[#22211D] hover:shadow-2xl md:p-8"
          >
            <div className="grid gap-6 md:grid-cols-[100px_1fr] md:items-start">
              <div className="text-4xl font-light text-[#B89450] transition-colors duration-300 group-hover:text-[#D1B16A] md:text-5xl">
                01
              </div>

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.3em] text-[#B89450] transition-colors duration-300 group-hover:text-[#D1B16A]">
                  {getLang(cms.service_01?.tag, isThai ? 'บริการรับส่ง' : isChinese ? '接送服务' : 'TRANSFER')}
                </p>

                <h3 className="mb-3 text-2xl font-bold text-[#B89450] transition-colors duration-300 group-hover:text-[#D1B16A] md:text-3xl">
                  {getLang(cms.service_01?.title, isThai ? 'บริการรับส่งสนามบินและวีไอพี' : isChinese ? '接送服务' : 'Airport & VIP Transfer')}
                </h3>

                <p className="max-w-3xl text-sm leading-6 text-gray-600 transition-colors duration-300 group-hover:text-[#F0EBDD]/85 md:text-base">
                  {getLang(cms.service_01?.description, isThai ? 'บริการรับส่งสนามบินและโรงแรม รถรับส่งวีไอพี เลานจ์สำหรับผู้บริหาร และบริการต้อนรับหรือส่งผู้โดยสารวีไอพี' : isChinese ? '提供机场及酒店接送、豪华 VIP 接送、行政贵宾休息室以及 VIP 接机和送机服务。' : 'Airport and hotel transfers, luxury VIP transfers, executive lounge and VIP arrival & departure services.')}
                </p>

                <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-xs text-gray-500 transition-colors duration-300 group-hover:text-[#F0EBDD]/65">
                  {(isThai ? (cms.service_01?.features_th || ['สนามบินและโรงแรม', 'รถรับส่งวีไอพี', 'เลานจ์ผู้บริหาร']) : isChinese ? (cms.service_01?.features_zh || ['机场及酒店接送', '豪华 VIP 接送', '行政贵宾休息室']) : (cms.service_01?.features_en || ['Airport & Hotel', 'Luxury VIP', 'Executive Lounge'])).map((feat, i) => (
                    <span key={i}>{feat}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 02 Yacht / Boat Charter */}
          <div
            className="group block rounded-2xl border border-transparent p-6 transition-all duration-300 hover:border-[#B89450]/40 hover:bg-[#22211D] hover:shadow-2xl md:p-8"
          >
            <div className="grid gap-6 md:grid-cols-[100px_1fr] md:items-start">
              <div className="text-4xl font-light text-[#B89450] transition-colors duration-300 group-hover:text-[#D1B16A] md:text-5xl">
                02
              </div>

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.3em] text-[#B89450] transition-colors duration-300 group-hover:text-[#D1B16A]">
                  {getLang(cms.service_02?.tag, isThai ? 'เช่าเหมาลำเรือและเรือยอชต์' : isChinese ? '游艇及船只包租' : 'YACHT & BOAT')}
                </p>

                <h3 className="mb-3 text-2xl font-bold text-[#B89450] transition-colors duration-300 group-hover:text-[#D1B16A] md:text-3xl">
                  {getLang(cms.service_02?.title, isThai ? 'บริการเช่าเหมาลำเรือและเรือยอชต์' : isChinese ? '游艇 / 船只包租' : 'Yacht / Boat Charter')}
                </h3>

                <p className="max-w-3xl text-sm leading-6 text-gray-600 transition-colors duration-300 group-hover:text-[#F0EBDD]/85 md:text-base">
                  {getLang(cms.service_02?.description, isThai ? 'สัมผัสประสบการณ์ล่องเรือส่วนตัวที่ยืดหยุ่นและสะดวกสบาย เพื่อสำรวจทะเลไทยในแบบของคุณ' : isChinese ? '提供私人游艇及船只包租服务，以更加灵活、舒适的方式探索泰国海域。' : 'Private yacht and boat charter experiences designed for flexible and memorable journeys across Thailand.')}
                </p>

                <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-xs text-gray-500 transition-colors duration-300 group-hover:text-[#F0EBDD]/65">
                  {(isThai ? (cms.service_02?.features_th || ['เรือยอชต์เครื่องยนต์', 'เรือใบยอชต์', 'เรือยอชต์หรู', 'เรือคาตามารัน']) : isChinese ? (cms.service_02?.features_zh || ['摩托游艇', '帆船', '豪华游艇', '双体船']) : (cms.service_02?.features_en || ['Motor Yacht', 'Sailing Yacht', 'Super Yacht', 'Power Catamaran'])).map((feat, i) => (
                    <span key={i}>{feat}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 03 Workshop */}
          <div
            className="group block rounded-2xl border border-transparent p-6 transition-all duration-300 hover:border-[#B89450]/40 hover:bg-[#22211D] hover:shadow-2xl md:p-8"
          >
            <div className="grid gap-6 md:grid-cols-[100px_1fr] md:items-start">
              <div className="text-4xl font-light text-[#B89450] transition-colors duration-300 group-hover:text-[#D1B16A] md:text-5xl">
                03
              </div>

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.3em] text-[#B89450] transition-colors duration-300 group-hover:text-[#D1B16A]">
                  {getLang(cms.service_03?.tag, isThai ? 'เวิร์กช็อปและกิจกรรมประสบการณ์' : isChinese ? '工作坊与体验活动' : 'WORKSHOP & EXPERIENCES')}
                </p>

                <h3 className="mb-3 text-2xl font-bold text-[#B89450] transition-colors duration-300 group-hover:text-[#D1B16A] md:text-3xl">
                  {getLang(cms.service_03?.title, isThai ? 'เวิร์กช็อป' : isChinese ? '工作坊' : 'Workshop')}
                </h3>

                <p className="max-w-3xl text-sm leading-6 text-gray-600 transition-colors duration-300 group-hover:text-[#F0EBDD]/85 md:text-base">
                  {getLang(cms.service_03?.description, isThai ? 'ค้นพบเวิร์กช็อป กิจกรรมทางวัฒนธรรม และประสบการณ์ท้องถิ่นที่มีความหมายทั่วประเทศไทย' : isChinese ? '探索泰国各地的工作坊、文化活动及特色体验。' : 'Discover workshops, cultural activities and meaningful local experiences across Thailand.')}
                </p>

                <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-xs text-gray-500 transition-colors duration-300 group-hover:text-[#F0EBDD]/65">
                  {(isThai ? (cms.service_03?.features_th || ['ประสบการณ์วัฒนธรรม', 'กิจกรรมชุมชน', 'เวิร์กช็อปสร้างสรรค์']) : isChinese ? (cms.service_03?.features_zh || ['文化体验', '社区活动', '创意工作坊']) : (cms.service_03?.features_en || ['Cultural Experiences', 'Community Activities', 'Creative Workshops'])).map((feat, i) => (
                    <span key={i}>{feat}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-[#B89450]/35" />
        </div>
      </section>

      {/* Meeting & Incentive (Images removed per request) */}
      <section className="bg-white px-5 py-14 md:px-8 md:py-18">
        <div className="mx-auto max-w-4xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-[#B89450]">
            {getLang(cms.mice?.eyebrow, isThai ? 'การประชุมและการท่องเที่ยวเพื่อเป็นรางวัล' : isChinese ? '会议与奖励旅游' : 'MICE')}
          </p>

          <h2 className="mb-5 text-3xl font-bold text-[#282722] md:text-4xl">
            {getLang(cms.mice?.title, isThai ? 'การประชุมและการท่องเที่ยวเพื่อเป็นรางวัล' : isChinese ? '会议与奖励旅游' : 'Meeting & Incentive')}
          </h2>

          <p className="mb-6 leading-7 text-gray-600">
            {getLang(cms.mice?.description_1, isThai ? 'สัมผัสบริการระดับพรีเมียมที่ผสานความยั่งยืนและชุมชน ผ่านการประชุมและการเดินทางเพื่อสร้างแรงจูงใจในประเทศไทย' : isChinese ? '通过可持续、有影响力并以社区为导向的会议与奖励旅游体验，探索 Silver Hawk Group 的生态奢华服务。' : 'Experience eco-luxury with Silver Hawk Group through sustainable, impactful and community-driven meeting and incentive experiences in Thailand.')}
          </p>

          <p className="text-sm leading-6 text-gray-500">
            {getLang(cms.mice?.description_2, isThai ? 'เราออกแบบการประชุม การเดินทางเพื่อเป็นรางวัล การประชุมสัมมนา และกิจกรรมต่าง ๆ โดยผสานความหรูหรา ความยั่งยืน และประสบการณ์จากชุมชนท้องถิ่น' : isChinese ? '我们创造的会议、奖励旅游、会议和活动，融合了奢华、可持续性和当地社区体验。' : 'We create Meetings, Incentives, Conferences and Events that integrate luxury, sustainability and local community experiences.')}
          </p>
        </div>
      </section>

      {/* Single horizontal line separating MICE from Corporate Training */}
      <div className="mx-auto max-w-4xl px-5 md:px-8">
        <div className="border-t border-[#B89450]/35" />
      </div>

      {/* Corporate Training (Images removed per request) */}
      <section className="bg-white px-5 py-14 md:px-8 md:py-18">
        <div className="mx-auto max-w-4xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-[#B89450]">
            {getLang(cms.corporate_training?.eyebrow, isThai ? 'การฝึกอบรมองค์กร' : isChinese ? '企业培训' : 'CORPORATE TRAINING')}
          </p>

          <h2 className="mb-5 text-3xl font-bold text-[#282722] md:text-4xl">
            {getLang(cms.corporate_training?.title, isThai ? 'การฝึกอบรมองค์กรและการพัฒนาทรัพยากรบุคคล' : isChinese ? '企业培训与人力资源开发' : 'Corporate Training & Human Resource Development')}
          </h2>

          <p className="mb-6 leading-7 text-gray-600">
            {getLang(cms.corporate_training?.description_1, isThai ? 'Silver Hawk Group จัดหลักสูตรฝึกอบรมองค์กรที่ออกแบบเฉพาะสำหรับธุรกิจโรงแรม การท่องเที่ยว และงานบริการลูกค้า' : isChinese ? 'Silver Hawk Group 提供量身定制的企业培训课程，专为酒店、旅游及客户服务行业而设计。' : 'Silver Hawk Group provides made-to-order corporate training programs tailored to the hospitality, travel, and customer service industries.')}
          </p>

          <p className="text-sm leading-6 text-gray-500">
            {getLang(cms.corporate_training?.description_2, isThai ? 'หลักสูตรของเราเน้นประสบการณ์ลูกค้า ความยั่งยืน การบริการอย่างรับผิดชอบ และการดำเนินงานที่มุ่งสู่ความเป็นกลางทางคาร์บอน' : isChinese ? '我们的项目专注于客户体验、可持续发展、负责任的服务和碳中和运营。' : 'Our programs focus on customer experience, sustainability, responsible service and carbon-neutral operations.')}
          </p>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="px-8 py-20">
        <div className="mx-auto max-w-6xl text-center">
          <h2 className="mb-12 text-4xl font-bold">
            {getLang(cms.why_choose_us?.title, isThai ? 'ทำไมต้องเลือกเรา' : isChinese ? '为什么选择我们？' : 'Why Choose Us?')}
          </h2>

          <div className={`grid gap-8 ${
            (cms.why_choose_us?.features?.length ?? 0) >= 4
              ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
              : (cms.why_choose_us?.features?.length ?? 0) === 2
              ? "grid-cols-1 sm:grid-cols-2 max-w-3xl mx-auto"
              : "grid-cols-1 md:grid-cols-3"
          }`}>
            {(cms.why_choose_us?.features || []).map((feat, idx) => (
              <div key={idx} className="flex flex-col items-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FAF8F3] border border-[#D6CEBD] text-[#B89450]">
                  {idx === 0 ? (
                    // Globe / Regenerative Ecosystem
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.6 9h16.8M3.6 15h16.8" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.5 3a17 17 0 000 18M12.5 3a17 17 0 010 18" />
                    </svg>
                  ) : idx === 1 ? (
                    // Sparkle / Expert Guides
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  ) : idx === 2 ? (
                    // Heart / Bespoke & VIP Concierge
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                    </svg>
                  ) : (
                    // Shield Check / Safety & 24/7 Support
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.25-8.25-3.286z" />
                    </svg>
                  )}
                </div>
                <h3 className="mb-2 text-xl font-bold">
                  {getLang(feat.title, isThai ? 'ประสบการณ์การเดินทางที่น่าประทับใจ' : isChinese ? '精彩旅程' : 'Great Experiences')}
                </h3>
                <p className="text-gray-600">
                  {getLang(feat.description, isThai ? 'เราสร้างประสบการณ์การเดินทางที่น่าจดจำสำหรับนักเดินทางทุกคน' : isChinese ? '为您打造难忘的旅行体验。' : 'We create memorable travel experiences for every traveler.')}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="about" className="border-t border-[#B89450]/40 bg-[#282722] px-6 py-7 text-sm text-[#F0EBDD] md:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 text-center md:flex-row md:text-left">

          {/* Company */}
          <div>
            <p className="font-semibold tracking-[0.16em] text-[#D1B16A]">
              SILVER HAWK GROUP
            </p>
            <p className="mt-2 flex items-center justify-center gap-2 text-xs text-[#F0EBDD]/65 md:justify-start">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                className="h-4 w-4 shrink-0 text-[#D1B16A]"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"
                />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
              Phuket 83100, Thailand
            </p>
          </div>

          {/* Contact */}
          <div className="flex flex-col items-center gap-3 md:items-end">
            <a
              href="tel:+66878981346"
              className="group flex items-center gap-2.5 transition-colors hover:text-[#D1B16A]"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                className="h-4 w-4 text-[#D1B16A]"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 3h4l2 5-2.5 1.5a14 14 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2C10 20 4 14 3 5a2 2 0 0 1 2-2Z"
                />
              </svg>
              +66 87 898 1346
            </a>

            <a
              href="mailto:silverhawkgroup@gmail.com"
              className="flex items-center gap-2.5 transition-colors hover:text-[#D1B16A]"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                className="h-4 w-4 text-[#D1B16A]"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m4 7 8 6 8-6"
                />
              </svg>
              silverhawkgroup@gmail.com
            </a>
          </div>
        </div>
      </footer>

      {/* Footer */}
<footer className="border-t border-[#B89450]/40 bg-[#1D1C19] px-5 py-8 text-center text-sm text-[#F0EBDD] md:px-8">
  <div className="mx-auto flex max-w-6xl flex-col items-center gap-3">

    <div className="h-px w-16 bg-[#B89450]/50" />

    <Link
      href="/admin"
      className="text-xs tracking-widest text-gray-400 transition-colors hover:text-[#B89450]"
    >
      STAFF 
    </Link>

    <p className="text-xs text-gray-500">
      © {new Date().getFullYear()} Silver Hawk Group. All rights reserved.
    </p>
  </div>
</footer>
    </main>
  );
}
