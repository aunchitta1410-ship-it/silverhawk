export type TourType =
  | "Tour Package"
  | "Ticket Only"
  | "Transfer Only"
  | "Private Tour"
  | "Activity Only";

export type TourTypePDPAPolicy = {
  tour_type: TourType;
  required_info_en: string;
  required_info_th: string;
  required_info_zh: string;
  purpose_en: string;
  purpose_th: string;
  purpose_zh: string;
  additional_disclosures_en?: string;
  additional_disclosures_th?: string;
  additional_disclosures_zh?: string;
};

export type TourTypeCancellationPolicy = {
  tour_type: TourType;
  summary_en: string;
  summary_th: string;
  summary_zh: string;
  refund_conditions_en: string;
  refund_conditions_th: string;
  refund_conditions_zh: string;
  reschedule_policy_en: string;
  reschedule_policy_th: string;
  reschedule_policy_zh: string;
  weather_or_noshow_clause_en: string;
  weather_or_noshow_clause_th: string;
  weather_or_noshow_clause_zh: string;
  full_terms_en?: string;
  full_terms_th?: string;
  full_terms_zh?: string;
};

export type PDPAPolicy = {
  consent_checkbox_en: string;
  consent_checkbox_th: string;
  consent_checkbox_zh: string;
  modal_title_en: string;
  modal_title_th: string;
  modal_title_zh: string;
  full_policy_en: string;
  full_policy_th: string;
  full_policy_zh: string;
  version: string;
  last_updated: string;
  by_tour_type?: Partial<Record<TourType, TourTypePDPAPolicy>>;
};

export type CancellationPolicy = {
  policy_summary_en: string;
  policy_summary_th: string;
  policy_summary_zh: string;
  weather_clause_en: string;
  weather_clause_th: string;
  weather_clause_zh: string;
  full_terms_en: string;
  full_terms_th: string;
  full_terms_zh: string;
  by_tour_type?: Partial<Record<TourType, TourTypeCancellationPolicy>>;
};

export type SitePolicies = {
  pdpa: PDPAPolicy;
  cancellation: CancellationPolicy;
};

export const DEFAULT_TOUR_TYPE_PDPA: Record<TourType, TourTypePDPAPolicy> = {
  "Tour Package": {
    tour_type: "Tour Package",
    required_info_en:
      "Full name, email address, phone number, number of travelers, hotel transfer pickup location, and activity-related information (dietary preferences, special assistance).",
    required_info_th:
      "ชื่อ-นามสกุล, อีเมล, หมายเลขโทรศัพท์, จำนวนผู้เดินทาง, ข้อมูลสถานที่รับส่งที่พัก และข้อมูลที่เกี่ยวข้องกับกิจกรรม (อาหารที่แพ้/รับประทานได้, ความช่วยเหลือพิเศษ)",
    required_info_zh:
      "姓名、电子邮箱、联系电话、出行人数、酒店接送地点以及必要的活动相关信息（饮食禁忌、特殊协助需求）。",
    purpose_en:
      "To manage your full-day tour itinerary, organize marine passenger manifests, provide hotel ground transfers, and issue statutory Tourism Authority of Thailand (TAT) accident insurance.",
    purpose_th:
      "เพื่อบริหารจัดการกำหนดการท่องเที่ยว จัดทำบัญชีรายชื่อผู้โดยสารเรือ ให้บริการรถรับส่ง และทำประกันอุบัติเหตุคุ้มครองการเดินทางตามข้อกำหนดของการท่องเที่ยวแห่งประเทศไทย (ททท.)",
    purpose_zh:
      "用于安排旅游行程、登记快艇/游船乘客出海名单、提供酒店往返接送以及向泰国旅游局申报法定意外险。",
    additional_disclosures_en:
      "Shared with licensed boat captains, pier departure dispatchers, marine department officers, and certified insurance underwriters.",
    additional_disclosures_th:
      "เปิดเผยแก่กัปตันเรือที่ได้รับใบอนุญาต เจ้าหน้าที่ท่าเทียบเรือ เจ้าหน้าที่กรมเจ้าท่า และบริษัทประกันภัยที่ได้รับการรับรอง",
    additional_disclosures_zh:
      "仅向持牌游船船长、码头调度人员、泰国海事管理机构及合规保险承保公司披露。",
  },
  "Ticket Only": {
    tour_type: "Ticket Only",
    required_info_en:
      "Lead guest name, email address, phone number, number of visitors, and information required for electronic ticket issuance / park entry verification.",
    required_info_th:
      "ชื่อ-นามสกุลผู้ติดต่อหลัก, อีเมล, หมายเลขโทรศัพท์, จำนวนผู้เข้าชม และข้อมูลที่จำเป็นสำหรับการออกตั๋วอิเล็กทรอนิกส์และการยืนยันสิทธิ์เข้าชม",
    required_info_zh:
      "主要联系人姓名、电子邮箱、手机号、入园/入场人数以及门票核发和入园核验所必需的信息。",
    purpose_en:
      "To issue official digital tickets/vouchers, register entry with attraction or show venue partners, and facilitate customer gate verification.",
    purpose_th:
      "เพื่อออกบัตรเข้าชมหรือเวาเชอร์ดิจิทัล ลงทะเบียนสิทธิ์กับสถานที่จัดแสดงหรือผู้ให้บริการสถานที่ และอำนวยความสะดวกในการตรวจสอบบัตรที่ทางเข้า",
    purpose_zh:
      "用于生成官方电子门票/兑换凭证、向景点或演出合作方报备预约入园名单并支持闸机快速核验。",
    additional_disclosures_en:
      "Shared directly with the ticket ticketing system and admission gates of the respective venue or theme park.",
    additional_disclosures_th:
      "ส่งต่อข้อมูลไปยังระบบจำหน่ายตั๋วและจุดตรวจสอบบัตรเข้าชมของสถานที่จัดแสดงหรือสวนสนุกที่เกี่ยวข้อง",
    additional_disclosures_zh:
      "直接对接相应景区、演艺场馆或主题乐园的票务闸机核验系统。",
  },
  "Transfer Only": {
    tour_type: "Transfer Only",
    required_info_en:
      "Lead passenger name, email, contact number, pickup and drop-off locations, scheduled travel time, passenger count, luggage count, and flight details if airport transfer.",
    required_info_th:
      "ชื่อผู้โดยสารหลัก, อีเมล, เบอร์โทรศัพท์, จุดรับและจุดส่ง, เวลาเดินทาง, จำนวนผู้โดยสาร, จำนวนสัมภาระ และรายละเอียดเที่ยวบิน (กรณีรับส่งสนามบิน)",
    required_info_zh:
      "主要乘车人姓名、邮箱、电话、接送上下车具体地点、预约用车时间、乘车人数、行李件数及航班班次信息（如涉及机场接送）。",
    purpose_en:
      "To dispatch licensed private vehicles/drivers, track flight arrival timing in real-time, coordinate hotel lobby pickup, and ensure safe point-to-point transit.",
    purpose_th:
      "เพื่อจัดสรรรถยนต์และคนขับที่ถูกต้องตามกฎหมาย ติดตามเวลาเที่ยวบินแบบเรียลไทม์ นัดหมายที่ล็อบบี้โรงแรม และดูแลความปลอดภัยในการเดินทาง",
    purpose_zh:
      "用于调度持牌车辆与司机、实时追踪航班动态、在酒店大堂准时接驾并保障点对点安全乘车服务。",
    additional_disclosures_en:
      "Shared strictly with assigned fleet drivers and operations transport coordinators.",
    additional_disclosures_th:
      "เปิดเผยเฉพาะแก่คนขับรถที่ได้รับมอบหมายและผู้ประสานงานฝ่ายยานพาหนะเท่านั้น",
    additional_disclosures_zh:
      "仅提供给指派承接订单的当值司机与地面车队调度员。",
  },
  "Private Tour": {
    tour_type: "Private Tour",
    required_info_en:
      "Client name, email, contact details, number of travelers, preferred pickup location, private travel itinerary details, and customized catering/special requests.",
    required_info_th:
      "ชื่อลูกค้า, อีเมล, เบอร์ติดต่อ, จำนวนผู้ร่วมทริป, จุดนัดรับที่ต้องการ, แผนการเดินทางแบบส่วนตัว และรายการอาหารหรือความต้องการพิเศษ",
    required_info_zh:
      "预订人姓名、邮箱、电话、私享成团人数、指定接送点、个性化定制行程细节、餐饮定制及专属特殊要求。",
    purpose_en:
      "To charter exclusive vessels or VIP vans, curate bespoke routes, register private manifests with port authorities, and provide dedicated VIP guide staffing.",
    purpose_th:
      "เพื่อจัดเตรียมเรือเหมาลำหรือรถตู้ VIP ปรับแต่งเส้นทางเฉพาะบุคคล ลงทะเบียนรายชื่อผู้โดยสารส่วนตัวกับเจ้าหน้าที่ท่าเรือ และจัดเตรียมไกด์ดูแลเฉพาะกลุ่ม",
    purpose_zh:
      "用于专属包船或VIP商务车调度、规划独享定制路线、向海事港务局报备私人包船名单并配备专属导游。",
    additional_disclosures_en:
      "Shared with private charter captains, bespoke experience coordinators, and port authorities.",
    additional_disclosures_th:
      "เปิดเผยแก่กัปตันเรือเหมาลำ ผู้ประสานงานทริปส่วนตัว และเจ้าหน้าที่ควบคุมท่าเทียบเรือ",
    additional_disclosures_zh:
      "仅披露给专属包船船长、定制管家团队及出港口岸管理部门。",
  },
  "Activity Only": {
    tour_type: "Activity Only",
    required_info_en:
      "Participant names, email, phone number, number of participants, physical fitness/safety disclosures, and weight/age where required by activity regulations.",
    required_info_th:
      "ชื่อผู้เข้าร่วม, อีเมล, หมายเลขโทรศัพท์, จำนวนผู้ร่วมกิจกรรม, ข้อมูลความพร้อมทางร่างกาย/ความปลอดภัย และน้ำหนัก/อายุตามเกณฑ์ความปลอดภัยของกิจกรรม",
    required_info_zh:
      "参与者姓名、邮箱、电话、参与人数、身体健康/安全适航声明以及按活动安全规则要求申报的体重或年龄。",
    purpose_en:
      "To verify activity eligibility, fit proper safety gear (harnesses, diving equipment, life vests), maintain instructor-to-guest ratios, and enroll in outdoor activity insurance.",
    purpose_th:
      "เพื่อตรวจสอบคุณสมบัติความปลอดภัย จัดเตรียมอุปกรณ์ป้องกันที่เหมาะสม (สายรัด, อุปกรณ์ดำน้ำ, เสื้อชูชีพ) ควบคุมสัดส่วนครูฝึก และทำประกันอุบัติเหตุกิจกรรมกลางแจ้ง",
    purpose_zh:
      "用于确认参与资格、配发合规安全装备（安全带、潜水设备、救生衣）、安排专业教练配比并投保户外探险运动意外险。",
    additional_disclosures_en:
      "Shared with certified activity instructors, dive masters, safety marshals, and local emergency medical services if required.",
    additional_disclosures_th:
      "เปิดเผยแก่ผู้ฝึกสอนที่ได้รับใบรับรอง ผู้ดูแลความปลอดภัย และทีมปฐมพยาบาลในกรณีฉุกเฉิน",
    additional_disclosures_zh:
      "仅提供给具备国际资质的带队教练、潜水长、安全官及紧急医疗救护机构。",
  },
};

export const DEFAULT_TOUR_TYPE_CANCELLATION: Record<TourType, TourTypeCancellationPolicy> = {
  "Tour Package": {
    tour_type: "Tour Package",
    summary_en:
      "Free cancellation up to 24 hours prior to departure. 50% charge within 12–24 hours. Non-refundable within 12 hours or for no-shows.",
    summary_th:
      "ยกเลิกฟรีล่วงหน้าอย่างน้อย 24 ชั่วโมงก่อนเดินทาง มีค่าธรรมเนียม 50% หากยกเลิกก่อน 12-24 ชั่วโมง ไม่สามารถขอคืนเงินได้หากน้อยกว่า 12 ชั่วโมงหรือไม่มาตามนัด",
    summary_zh:
      "行程出发前24小时以上免费取消并全额退款；出发前12-24小时内取消扣除50%违约金；12小时内或未到集合点恕不退款。",
    refund_conditions_en:
      "• More than 24 hours: 100% full refund.\n• 12 to 24 hours: 50% refund.\n• Under 12 hours or no-show: Non-refundable (0%).",
    refund_conditions_th:
      "• มากกว่า 24 ชั่วโมง: คืนเงิน 100% เต็มจำนวน\n• 12 ถึง 24 ชั่วโมง: คืนเงิน 50%\n• น้อยกว่า 12 ชั่วโมงหรือไม่มาปรากฏตัว: ไม่สามารถขอคืนเงินได้ (0%)",
    refund_conditions_zh:
      "• 出发24小时前：100%全额原路退还。\n• 出发前12至24小时：退还50%款项。\n• 出发前12小时内或未按时集合（No-Show）：不予退款（0%）。",
    reschedule_policy_en:
      "Date changes are allowed free of charge with at least 18 hours advance notice subject to boat capacity.",
    reschedule_policy_th:
      "สามารถแจ้งเปลี่ยนวันเดินทางได้ฟรีล่วงหน้าอย่างน้อย 18 ชั่วโมง ขึ้นอยู่กับจำนวนที่ว่างบนเรือ",
    reschedule_policy_zh:
      "提前至少18小时通知可免费更改出行日期（视游船当日余位情况而定）。",
    weather_or_noshow_clause_en:
      "100% Weather Guarantee: In case of severe sea swells, tropical storm warnings, or harbor closures by the Marine Department, you may reschedule freely or receive an immediate 100% full refund.",
    weather_or_noshow_clause_th:
      "รับประกันสภาพอากาศ 100%: กรณีคลื่นลมแรง มรสุม หรือคำสั่งห้ามเรือออกจากกรมเจ้าท่า สามารถเลื่อนวันเดินทางได้ฟรี หรือรับเงินคืนเต็มจำนวน 100%",
    weather_or_noshow_clause_zh:
      "100%海况与天气安全保障：如遇海面大风浪、热带风暴或泰国海事厅发布禁航令，可免费任意改期或申请100%无条件全额退款。",
  },
  "Ticket Only": {
    tour_type: "Ticket Only",
    summary_en:
      "Tickets are strictly non-refundable once issued. One-time date modification allowed at least 24 hours before show/entry time.",
    summary_th:
      "บัตรเข้าชมไม่สามารถขอคืนเงินได้หลังจากออกบัตรแล้ว สามารถขอเปลี่ยนวันเข้าชมได้ 1 ครั้งล่วงหน้าอย่างน้อย 24 ชั่วโมงก่อนเวลาแสดง/เวลาเข้าชม",
    summary_zh:
      "门票一经出票成功即不可退款；在演出/入园前24小时以上可申请免费更改一次日期（需视场馆余位）。",
    refund_conditions_en:
      "• E-Tickets & Admission Passes: Non-refundable once voucher/barcode is generated and confirmed by the attraction system.\n• If venue is officially closed due to maintenance or public emergency: 100% full refund or voucher extension.",
    refund_conditions_th:
      "• ตั๋วอิเล็กทรอนิกส์และบัตรผ่าน: ไม่สามารถขอคืนเงินได้หลังจากออกบาร์โค้ด/เวาเชอร์และยืนยันในระบบของสถานที่แล้ว\n• กรณีสถานที่ปิดให้บริการอย่างเป็นทางการเนื่องจากซ่อมบำรุงหรือเหตุฉุกเฉิน: คืนเงินเต็มจำนวน 100% หรือขยายอายุบัตร",
    refund_conditions_zh:
      "• 电子门票与通行凭证：一旦系统生成门票兑换码/入园条码后恕不支持无故退款。\n• 若景区因官方维护或不可抗力临时停业闭园：支持100%全额退款或免费延期通行凭证。",
    reschedule_policy_en:
      "Date changes can be requested up to 24 hours before the scheduled entry/show time (subject to venue seating availability). Same-day changes are not permitted.",
    reschedule_policy_th:
      "สามารถแจ้งเลื่อนวันเข้าชมได้ล่วงหน้า 24 ชั่วโมงก่อนเวลาเข้าชม (ขึ้นอยู่กับที่นั่งว่างของสถานที่) ไม่อนุญาตให้เปลี่ยนวันในวันเดินทาง",
    reschedule_policy_zh:
      "可在计划入园/演出前24小时前申请改期（需视场馆座位空余情况），当日申请概不支持改期。",
    weather_or_noshow_clause_en:
      "For outdoor shows: If an outdoor performance is cancelled due to heavy rain, tickets are eligible for full refund or next available show slot. Unused tickets due to personal delay or no-show are strictly void.",
    weather_or_noshow_clause_th:
      "สำหรับการแสดงกลางแจ้ง: หากการแสดงถูกยกเลิกเนื่องจากฝนตกหนัก สามารถขอคืนเงินเต็มจำนวนหรือเลื่อนรอบได้ หากไม่มาเข้าชมตามเวลาที่ระบุ บัตรจะถือเป็นโมฆะ",
    weather_or_noshow_clause_zh:
      "户外演出特例：若因暴雨雷电导致户外演出官方取消，门票可全额退款或顺延至下一场次；因客人自身迟到或未到场（No-Show）门票作废不可退款。",
  },
  "Transfer Only": {
    tour_type: "Transfer Only",
    summary_en:
      "Free cancellation up to 12 hours before scheduled pickup. Cancellations within 6–12 hours incur a 50% dispatch fee. No-shows or cancellations within 6 hours are non-refundable.",
    summary_th:
      "ยกเลิกฟรีล่วงหน้าอย่างน้อย 12 ชั่วโมงก่อนเวลานัดรับ มีค่าธรรมเนียมจัดเตรียมรถ 50% หากยกเลิกก่อน 6-12 ชั่วโมง ไม่สามารถคืนเงินได้หากยกเลิกน้อยกว่า 6 ชั่วโมงหรือไม่มาขึ้นรถ",
    summary_zh:
      "用车接送预约时间前12小时以上取消免收手续费；用车前6-12小时内取消扣除50%车辆调度费；6小时内取消或未按时候车恕不退款。",
    refund_conditions_en:
      "• More than 12 hours before pickup: 100% refund.\n• 6 to 12 hours: 50% refund.\n• Under 6 hours or driver arrived at location: Non-refundable (100% charge).",
    refund_conditions_th:
      "• มากกว่า 12 ชั่วโมงก่อนเวลานัดรับ: คืนเงิน 100%\n• 6 ถึง 12 ชั่วโมง: คืนเงิน 50%\n• น้อยกว่า 6 ชั่วโมงหรือรถเดินทางถึงจุดนัดรับแล้ว: ไม่สามารถขอคืนเงินได้ (คิดค่าบริการ 100%)",
    refund_conditions_zh:
      "• 预约接驾12小时前：100%全额退款。\n• 预约接驾6-12小时内：退还50%款项。\n• 6小时以内或司机已抵达接送地址：全额扣除不予退款。",
    reschedule_policy_en:
      "Pickup time and location modifications are accepted free of charge up to 4 hours before scheduled departure.",
    reschedule_policy_th:
      "สามารถแก้ไขเวลาและจุดรับส่งได้ฟรีล่วงหน้าอย่างน้อย 4 ชั่วโมงก่อนเวลาเดินทาง",
    reschedule_policy_zh:
      "发车前4小时以上可免费调整用车时间与上下车地点（需在同一运营服务区域内）。",
    weather_or_noshow_clause_en:
      "Flight Delay Guarantee: Airport transfers include up to 90 minutes complimentary waiting time for delayed flights upon provision of valid flight number. For hotel pickups, driver will wait up to 15 minutes past scheduled pickup window.",
    weather_or_noshow_clause_th:
      "รับประกันกรณีเที่ยวบินล่าช้า: บริการรับส่งสนามบินรอฟรีสูงสุด 90 นาทีเมื่อแจ้งเลขเที่ยวบินที่ถูกต้อง สำหรับการรับที่โรงแรม คนขับรอได้สูงสุด 15 นาทีหลังจากเวลานัดหมาย",
    weather_or_noshow_clause_zh:
      "航班延误无忧保障：提供有效航班号的机场接机包含最长90分钟免费等候时长；酒店等候时限为预约时间起15分钟，超时视作放弃行程。",
  },
  "Private Tour": {
    tour_type: "Private Tour",
    summary_en:
      "Full refund up to 72 hours before private charter date. 50% refund between 24–72 hours. Cancellations within 24 hours are non-refundable.",
    summary_th:
      "คืนเงินเต็มจำนวนหากยกเลิกล่วงหน้า 72 ชั่วโมงก่อนวันเดินทาง คืนเงิน 50% หากยกเลิกระหว่าง 24-72 ชั่วโมง หากยกเลิกน้อยกว่า 24 ชั่วโมงจะไม่สามารถขอคืนเงินได้",
    summary_zh:
      "私人定制与包船/包车：出行前72小时以上申请取消享全额无损退款；出行前24至72小时内取消扣除50%定金与包船损失；24小时内取消全额扣除。",
    refund_conditions_en:
      "• More than 72 hours: 100% refund.\n• 24 to 72 hours: 50% refund.\n• Under 24 hours: 0% refund (private vessel & crew allocated).",
    refund_conditions_th:
      "• มากกว่า 72 ชั่วโมง: คืนเงิน 100%\n• 24 ถึง 72 ชั่วโมง: คืนเงิน 50%\n• น้อยกว่า 24 ชั่วโมง: คืนเงิน 0% (เนื่องจากมีการจัดสรรเรือและลูกเรือเฉพาะกิจแล้ว)",
    refund_conditions_zh:
      "• 行程前72小时以上：全额退款（100%）。\n• 行程前24至72小时：扣除50%包租损失，退回50%。\n• 行程前24小时内：不予退款（因专属船只与机组人员已就位）。",
    reschedule_policy_en:
      "Private charter dates can be rescheduled once with at least 48 hours notice subject to vessel availability.",
    reschedule_policy_th:
      "สามารถเลื่อนวันเหมาลำได้ 1 ครั้ง โดยต้องแจ้งล่วงหน้าอย่างน้อย 48 ชั่วโมง ขึ้นอยู่กับความพร้อมของเรือ",
    reschedule_policy_zh:
      "至少提前48小时通知可申请免费改期一次（视私享游船/车辆空档档期而定）。",
    weather_or_noshow_clause_en:
      "100% Harbor Safety Guarantee: If private charter navigation is prohibited by Marine Department order due to storm or safety concerns, you may reschedule freely or obtain a 100% full refund.",
    weather_or_noshow_clause_th:
      "รับประกันความปลอดภัยทางทะเล 100%: หากมีคำสั่งห้ามเดินเรือจากกรมเจ้าท่าเนื่องจากสภาพอากาศหรือคลื่นลม สามารถเลื่อนวันหรือรับเงินคืนเต็มจำนวน 100%",
    weather_or_noshow_clause_zh:
      "100%出港安全保障：若因恶劣天气导致海事部门下达禁航管制，客户可自主选择顺延日期或申请100%全额退款。",
  },
  "Activity Only": {
    tour_type: "Activity Only",
    summary_en:
      "Free cancellation up to 24 hours before activity session. 50% charge within 12–24 hours. Cancellations due to instructor-declared unsafe weather are 100% refundable.",
    summary_th:
      "ยกเลิกฟรีล่วงหน้า 24 ชั่วโมงก่อนรอบกิจกรรม มีค่าธรรมเนียม 50% หากยกเลิกก่อน 12-24 ชั่วโมง หากกิจกรรมถูกยกเลิกเนื่องจากสภาพอากาศที่ไม่ปลอดภัยตามคำสั่งครูฝึก คืนเงิน 100%",
    summary_zh:
      "活动开始前24小时以上免费取消全额退款；活动前12-24小时取消扣除50%；因持证教练评估天气危险停办的项目享100%全额退款。",
    refund_conditions_en:
      "• Up to 24 hours before session: 100% refund.\n• 12 to 24 hours before: 50% refund.\n• Under 12 hours: Non-refundable.\n• Weather or operator safety cancellation: 100% full refund or free reschedule.",
    refund_conditions_th:
      "• ล่วงหน้า 24 ชั่วโมงก่อนเริ่มกิจกรรม: คืนเงิน 100%\n• 12 ถึง 24 ชั่วโมง: คืนเงิน 50%\n• น้อยกว่า 12 ชั่วโมง: ไม่สามารถขอคืนเงินได้\n• การยกเลิกเนื่องจากสภาพอากาศหรือความปลอดภัยโดยผู้จัด: คืนเงินเต็มจำนวน 100% หรือเลื่อนวันได้ฟรี",
    refund_conditions_zh:
      "• 活动开始24小时前：100%全额退款。\n• 活动开始前12-24小时：退还50%款项。\n• 活动开始前12小时内：不可退款。\n• 因天气恶劣或运营方安全考量取消：100%全额退款或免费改签。",
    reschedule_policy_en:
      "Session times can be shifted to another available time slot on the same or next day with at least 8 hours notice.",
    reschedule_policy_th:
      "สามารถขอเปลี่ยนรอบเวลาเป็นรอบอื่นในวันเดียวกันหรือวันถัดไปได้ โดยแจ้งล่วงหน้าอย่างน้อย 8 ชั่วโมง",
    reschedule_policy_zh:
      "提前至少8小时通知可申请调换至同日或次日其他余量充足的体验时段。",
    weather_or_noshow_clause_en:
      "Safety First: If extreme rain, lightning, or high winds prevent outdoor activities (zipline, diving, rafting), full refunds or alternative schedules will be immediately provided.",
    weather_or_noshow_clause_th:
      "ความปลอดภัยเป็นอันดับหนึ่ง: หากฝนตกหนัก ฟ้าผ่า หรือลมแรงจนไม่สามารถดำเนินกิจกรรมกลางแจ้งได้ (โหนสลิง, ดำน้ำ, ล่องแก่ง) จะได้รับเงินคืนเต็มจำนวนหรือจัดตารางใหม่ทันที",
    weather_or_noshow_clause_zh:
      "安全第一原则：如遇雷暴、狂风等不可抗力导致户外活动（丛林飞跃、潜水、漂流等）官方暂停，将第一时间提供全额退款或免费改签支持。",
  },
};

export const DEFAULT_SITE_POLICIES: SitePolicies = {
  pdpa: {
    consent_checkbox_en:
      "I have read and agree to the Personal Data Protection Act (PDPA) privacy notice and consent to the processing of personal and traveler information for tour booking and compulsory insurance coverage.",
    consent_checkbox_th:
      "ข้าพเจ้าได้อ่านและยอมรับนโยบายคุ้มครองข้อมูลส่วนบุคคล (PDPA) และยินยอมให้ประมวลผลข้อมูลส่วนบุคคลของผู้เดินทางเพื่อการจองทัวร์และการทำประกันภัยการเดินทางตามกฎหมาย",
    consent_checkbox_zh:
      "我已阅读并同意《个人数据保护法》（PDPA）隐私政策声明，同意将个人及随行人员信息用于旅游预订与法定旅游保险申报。",
    modal_title_en: "Silver Hawk Group — PDPA Privacy & Data Protection Notice",
    modal_title_th: "ซิลเวอร์ ฮอว์ก กรุ๊ป — ประกาศการคุ้มครองข้อมูลส่วนบุคคล (PDPA)",
    modal_title_zh: "Silver Hawk Group — 个人数据保护法（PDPA）隐私说明",
    full_policy_en: `1. Purpose of Data Collection:
Silver Hawk Group collects personal identifying data strictly for tour operations, passenger manifests, hotel transfers, and statutory accident travel insurance required by the Tourism Authority of Thailand (TAT).

2. Data Retention & Security:
Your personal information is encrypted during transmission and stored securely. Information is retained only for the duration required to complete tour services and comply with statutory legal records (typically 90 days after departure).

3. Third-Party Disclosures:
We share necessary passenger information exclusively with authorized partners:
- Licensed tour boat captains & pier departure manifest officers
- Marine Department & National Park authorities (where applicable)
- Licensed insurance underwriters for compulsory passenger insurance policy issuance

4. Rights of Data Subjects:
Under Thailand's Personal Data Protection Act B.E. 2562 (2019), you have the right to access, rectify, or request deletion of your personal data by contacting our Data Protection Officer at privacy@silverhawk.com.`,
    full_policy_th: `1. วัตถุประสงค์ในการเก็บรวบรวมข้อมูล:
บริษัท ซิลเวอร์ ฮอว์ก กรุ๊ป เก็บรวบรวมข้อมูลส่วนบุคคลเพื่อใช้ในการประสานงานท่องเที่ยว การจัดทำบัญชีรายชื่อผู้โดยสารเรือ และการจัดทำประกันอุบัติเหตุการเดินทางตามข้อกำหนดของการท่องเที่ยวแห่งประเทศไทย (ททท.)

2. การเก็บรักษาและความปลอดภัยของข้อมูล:
ข้อมูลของท่านได้รับการเข้ารหัสความปลอดภัยในระหว่างการส่งผ่าน และจัดเก็บในระบบที่ปลอดภัย ข้อมูลจะถูกเก็บไว้เพียงระยะเวลาที่จำเป็นต่อการให้บริการและการปฏิบัติตามกฎหมาย (โดยปกติไม่เกิน 90 วันหลังจากวันเดินทาง)

3. การเปิดเผยข้อมูลแก่บุคคลภายนอก:
เราเปิดเผยข้อมูลเฉพาะแก่หน่วยงานที่เกี่ยวข้องและจำเป็นเท่านั้น ได้แก่:
- กัปตันเรือและเจ้าหน้าที่ท่าเทียบเรือสำหรับการลงทะเบียนผู้โดยสาร
- กรมเจ้าท่า และเจ้าหน้าที่อุทยานแห่งชาติ (สำหรับเส้นทางที่เกี่ยวข้อง)
- บริษัทประกันภัยผู้รับประกันอุบัติเหตุการเดินทางตามกฎหมาย

4. สิทธิของเจ้าของข้อมูลส่วนบุคคล:
ภายใต้พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA) ท่านมีสิทธิในการเข้าถึง ขอแก้ไข หรือขอให้ลบข้อมูลส่วนบุคคลของท่าน โดยสามารถติดต่อเจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคลได้ที่ privacy@silverhawk.com`,
    full_policy_zh: `1. 收集个人信息的目的：
Silver Hawk Group 仅在预订旅游、登船乘客名单核实以及向泰国国家旅游局（TAT）申报法定旅游意外险所必须的范围内，收集游客的必要信息。

2. 数据保管与安全保障：
所有客户数据均经高强度加密传输，并严格保存在安全服务器中。信息保存期限仅限于履行服务合同及法律合规要求（通常在行程结束后90天自动归档或脱敏）。

3. 向第三方披露的范围：
我们仅在必需情况下向注册持牌游船船长、码头调度检票人员、泰国海事厅及法定游客意外险承保公司披露。

4. 数据主体的法定权利：
依据泰国佛历2562年（2019年）《个人数据保护法》（PDPA），您享有查阅、更正或申请删除个人信息的权利。联系邮箱：privacy@silverhawk.com。`,
    version: "v2.5",
    last_updated: "2026-10-26",
    by_tour_type: DEFAULT_TOUR_TYPE_PDPA,
  },
  cancellation: {
    policy_summary_en:
      "Free cancellation with full refund up to 24 hours prior to departure time. Cancellations made within 12–24 hours are subject to a 50% charge. Cancellations within 12 hours or no-shows are non-refundable.",
    policy_summary_th:
      "ยกเลิกฟรีพร้อมคืนเงินเต็มจำนวน หากแจ้งล่วงหน้าอย่างน้อย 24 ชั่วโมงก่อนเวลาออกเดินทาง หากยกเลิกล่วงหน้า 12-24 ชั่วโมง มีค่าธรรมเนียม 50% หากยกเลิกน้อยกว่า 12 ชั่วโมงหรือไม่มาตามเวลานัดหมาย จะไม่สามารถขอคืนเงินได้",
    policy_summary_zh:
      "行程出发时间24小时前取消可享全额无损退款；行程前12至24小时内取消扣除50%费用；行程前12小时内取消或未按时到达集合点恕不退款。",
    weather_clause_en:
      "100% Weather & Safety Guarantee: In the event of severe weather, tropical depression, high sea swells, or official marine safety warnings issued by the Thai Meteorological Department or Marine Department, you may choose to reschedule freely to any available future date or receive a prompt 100% full refund.",
    weather_clause_th:
      "รับประกันความปลอดภัยและสภาพอากาศ 100%: ในกรณีที่สภาพอากาศเลวร้าย มีมรสุม คลื่นลมแรง หรือมีประกาศเตือนภัยจากกรมอุตุนิยมวิทยาหรือกรมเจ้าท่า ลูกค้าสามารถเลือกเลื่อนวันเดินทางได้ฟรีโดยไม่มีค่าใช้จ่าย หรือเลือกรับเงินคืนเต็มจำนวน 100%",
    weather_clause_zh:
      "100% 恶劣天气与航行安全保障：如遇暴雨、风浪过大、热带气旋或泰国海事厅发布停航风暴预警，客户可免费更改至任意未来可行日期，或选择获得100%全额无条件退款。",
    full_terms_en: `1. Booking & Payment Confirmation:
All reservations are confirmed once payment verification is approved or card authorization succeeds. You will receive an official digital voucher containing your Booking ID and pickup details.

2. Health & Suitability:
Guests are required to review the "Are Not Recommended" guidelines for each tour. Guests who are pregnant, have severe cardiac conditions, spinal injuries, or infants under 1 year old are strictly prohibited on speedboat transfers for safety.

3. Punctuality & Pick-up:
Please be waiting in your hotel lobby or designated pickup zone 10 minutes prior to the scheduled pickup time. Drivers are permitted to wait a maximum of 10 minutes past the scheduled window to avoid delaying other passengers.

4. Force Majeure & Route Adjustments:
Tour itineraries, island stops, and water activities may be adjusted or reordered by the licensed boat captain for passenger safety depending on daily tidal and sea conditions.`,
    full_terms_th: `1. การยืนยันการจองและการชำระเงิน:
การจองจะได้รับการยืนยันอย่างเป็นทางการเมื่อการชำระเงินผ่านการตรวจสอบ หรือผ่านระบบบัตรเครดิตเรียบร้อยแล้ว ท่านจะได้รับเอกสารดิจิทัลเวาเชอร์ระบุรหัสการจองและรายละเอียดการรับส่ง

2. สุขภาพและความเหมาะสมในการเดินทาง:
ผู้เดินทางต้องตรวจสอบข้อกำหนด "ไม่แนะนำสำหรับ" ประจำทัวร์ สตรีมีครรภ์ ผู้ป่วยโรคหัวใจขั้นรุนแรง ผู้มีปัญหาเกี่ยวกับกระดูกสันหลัง หรือทารกอายุต่ำกว่า 1 ปี ไม่อนุญาตให้ขึ้นเรือสปีดโบ๊ทเพื่อความปลอดภัยสูงสุด

3. ความตรงต่อเวลาและการนัดรับ:
กรุณารอที่ล็อบบี้โรงแรมหรือจุดนัดพบที่กำหนดล่วงหน้า 10 นาที คนขับรถสามารถรอได้ไม่เกิน 10 นาทีจากเวลานัดหมาย เพื่อไม่ให้กระทบต่อตารางเวลาของผู้โดยสารท่านอื่น

4. เหตุสุดวิสัยและการปรับเปลี่ยนเส้นทาง:
กัปตันเรือมีสิทธิในการปรับเปลี่ยนเส้นทาง เกาะที่แวะ หรือกิจกรรมทางน้ำเพื่อความปลอดภัยของผู้โดยสารตามสภาพคลื่นลมและน้ำขึ้นน้ำลงในแต่ละวัน`,
    full_terms_zh: `1. 预订与付款确认：
当付款凭证经审核通过或在线支付成功后，预订即告正式生效。系统将自动生成包含预订流水号及接送细节的数字凭证（Voucher）。

2. 身体健康与适航要求：
请务必查阅对应行程的“不适宜参与人群”指引。为确保最高安全标准，孕妇、患有严重心脏病、脊椎颈椎疾患者及1岁以下婴儿严禁乘坐快艇出海。

3. 接送准时约定：
请务必提前10分钟在酒店大堂或指定集合点等候。接驳车辆在集合点最长等候10分钟，逾时将前往下一站以确保后续乘客正常登船。

4. 不可抗力与航线微调：
持证船长有权根据当日安达曼海潮汐、风向及浪高情况，对停靠岛屿顺序或水上活动进行必要调整，以确保全船人员人身安全。`,
    by_tour_type: DEFAULT_TOUR_TYPE_CANCELLATION,
  },
};
