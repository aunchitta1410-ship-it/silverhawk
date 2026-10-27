import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import CustomerDatabaseClient, {
  type CustomerSummary,
  type CustomerBooking,
} from "./CustomerDatabaseClient";

type Props = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function CustomerDatabasePage({ params }: Props) {
  const { locale } = await params;

  // 1. Verify user session
  const sessionClient = await createClient();
  const {
    data: { user },
    error: authError,
  } = await sessionClient.auth.getUser();

  if (authError || !user) {
    redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/admin/customers`)}`);
  }

  // 2. Verify admin permissions
  const adminClient = createAdminClient();
  const { data: adminRecord } = await adminClient
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminRecord) {
    redirect(`/${locale}`);
  }

  // 3. Fetch all bookings
  const { data: bookingsData } = await adminClient
    .from("Bookings")
    .select("id, booking_code, tour_id, travel_date, customer_name, customer_email, guests, status, created_at, pdpa_acknowledged, pdpa_acknowledged_at, privacy_policy_version")
    .order("created_at", { ascending: false });

  // 4. Fetch all tours for title mapping
  const { data: toursData } = await adminClient
    .from("tours")
    .select("id, title_en, price");

  const tourMap = new Map<number, { title: string; price: number }>();
  (toursData ?? []).forEach((t) => {
    tourMap.set(t.id, { title: t.title_en, price: Number(t.price) || 0 });
  });

  // 5. Fetch all payments
  const { data: paymentsData } = await adminClient
    .from("payments")
    .select("booking_id, amount, status");

  const paymentMap = new Map<number, number>();
  (paymentsData ?? []).forEach((p) => {
    if (p.status === "paid") {
      paymentMap.set(p.booking_id, Number(p.amount) || 0);
    }
  });

  // 6. Fetch lead guests for phone and nationality
  const { data: guestsData } = await adminClient
    .from("booking_guests")
    .select("booking_id, phone, nationality, email, guest_number")
    .eq("guest_number", 1);

  const guestMap = new Map<number, { phone?: string; nationality?: string }>();
  (guestsData ?? []).forEach((g) => {
    guestMap.set(g.booking_id, {
      phone: g.phone || undefined,
      nationality: g.nationality || undefined,
    });
  });

  // 7. Aggregate customers by normalized email
  const customerMap = new Map<string, CustomerSummary>();

  for (const b of bookingsData ?? []) {
    const email = (b.customer_email || "no-email@silverhawk.com").toLowerCase().trim();
    const guestLead = guestMap.get(b.id);
    const tourInfo = tourMap.get(b.tour_id);

    const bookingPayment = paymentMap.get(b.id) || 0;

    const bookingItem: CustomerBooking = {
      id: b.id,
      booking_code: b.booking_code,
      tour_id: b.tour_id,
      tour_title: tourInfo?.title,
      travel_date: b.travel_date,
      status: b.status,
      guests: b.guests,
      created_at: b.created_at,
    };

    if (customerMap.has(email)) {
      const existing = customerMap.get(email)!;
      existing.totalBookings += 1;
      existing.totalSpent += bookingPayment;
      existing.bookings.push(bookingItem);
      if (!existing.phone && guestLead?.phone) existing.phone = guestLead.phone;
      if ((!existing.nationality || existing.nationality === "—") && guestLead?.nationality) {
        existing.nationality = guestLead.nationality;
      }
      if (b.pdpa_acknowledged) {
        existing.pdpaAcknowledged = true;
        if (b.pdpa_acknowledged_at) existing.pdpaDate = b.pdpa_acknowledged_at;
      }
    } else {
      customerMap.set(email, {
        email,
        name: b.customer_name || "Customer",
        phone: guestLead?.phone || "—",
        nationality: guestLead?.nationality || "—",
        totalBookings: 1,
        totalSpent: bookingPayment,
        latestBookingDate: b.travel_date || b.created_at,
        pdpaAcknowledged: Boolean(b.pdpa_acknowledged),
        pdpaDate: b.pdpa_acknowledged_at || undefined,
        privacyVersion: b.privacy_policy_version || undefined,
        bookings: [bookingItem],
      });
    }
  }

  const customersList = Array.from(customerMap.values()).sort(
    (a, b) => b.totalBookings - a.totalBookings || b.totalSpent - a.totalSpent
  );

  return (
    <CustomerDatabaseClient
      customers={customersList}
      locale={locale}
    />
  );
}

