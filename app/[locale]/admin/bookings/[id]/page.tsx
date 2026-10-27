import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBookingPickup } from "@/lib/booking-pickup";
import AdminBookingDetailClient from "./AdminBookingDetailClient";

type PageProps = {
  params: Promise<{
    locale: string;
    id: string;
  }>;
};

export default async function BookingDetailPage({
  params,
}: PageProps) {
  const { locale, id } = await params;

  const bookingId = Number(id);

  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(bookingId)) {
    redirect(`/${locale}/admin/bookings`);
  }

  // 1. Verify the logged-in user
  const sessionClient = await createClient();
  const {
    data: { user },
    error: authError,
  } = await sessionClient.auth.getUser();

  if (authError || !user) {
    redirect(
      `/${locale}/login?next=${encodeURIComponent(
        `/${locale}/admin/bookings/${id}`
      )}`
    );
  }

  // 2. Verify Admin permission
  const adminClient = createAdminClient();

  const { data: adminRecord, error: adminError } = await adminClient
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (adminError) {
    console.error("Admin verification failed:", adminError);
    throw new Error("Unable to verify admin permission.");
  }

  if (!adminRecord) {
    redirect(`/${locale}`);
  }

  // 3. Get Booking
  const { data: booking, error: bookingError } = await adminClient 
    .from("Bookings")
    .select("*")
    .eq("id", bookingId)
    .single();

  if (bookingError || !booking) {
    return (
      <main className="min-h-screen bg-gray-100 p-8">
        <Link
          href={`/${locale}/admin/bookings`}
          className="text-sm font-medium text-[#17352A] hover:underline"
        >
          ← Back to Bookings
        </Link>

        <div className="mt-8 rounded-2xl bg-white p-8 shadow">
          <h1 className="text-2xl font-bold text-red-600">
            Booking not found
          </h1>

          <p className="mt-2 text-gray-500">
            {bookingError?.message || "This booking does not exist."}
          </p>
        </div>
      </main>
    );
  }

  // 4. Get Guests
  const { data: guestDetails } = await adminClient 
    .from("booking_guests")
    .select("*")
    .eq("booking_id", bookingId)
    .order("guest_number", { ascending: true });

  // 5. Get Tour
  const tourId = booking.tour_id ?? booking.tour;
  let tour = null;

  if (tourId) {
    const { data: tourData } = await adminClient 
      .from("tours")
      .select("*")
      .eq("id", Number(tourId))
      .maybeSingle();

    tour = tourData;
  }

  // 6. Get Payment
  const { data: payment } = await adminClient 
    .from("payments")
    .select("*")
    .eq("booking_id", bookingId)
    .order("paid_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // 7. Get Pick-up & Transfer details
  const pickup =
    (await getBookingPickup(bookingId)) ||
    (booking.booking_code ? await getBookingPickup(booking.booking_code) : null);

  return (
    <AdminBookingDetailClient
      booking={booking}
      tour={tour}
      payment={payment}
      guestDetails={guestDetails ?? []}
      initialPickup={pickup}
      locale={locale}
    />
  );
}
