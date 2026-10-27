
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import BookingSearch from "./BookingSearch";

type BookingsPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function BookingsPage({
  params,
}: BookingsPageProps) {
  const { locale } = await params;

  // 1. Verify the user's login session.
  const sessionClient = await createClient();

  const {
    data: { user },
    error: authError,
  } = await sessionClient.auth.getUser();

  if (authError || !user) {
    redirect(`/${locale}/login?next=/${locale}/admin/bookings`);
  }

  // 2. Verify admin permission on the server.
  const adminClient = createAdminClient();

  const { data: adminRecord, error: adminError } =
    await adminClient
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

  // Fail closed if admin permission cannot be verified.
  if (adminError) {
    console.error("Admin permission check failed:", adminError);
    throw new Error("Unable to verify admin permission.");
  }

  if (!adminRecord) {
    redirect(`/${locale}`);
  }

  // 3. Fetch bookings only after admin verification.
  const { data: bookings, error } = await adminClient
    .from("Bookings")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch bookings:", error);

    return (
      <main className="min-h-screen bg-gray-100 p-8">
        <h1 className="text-3xl font-bold">Bookings</h1>
        <p className="mt-4 text-red-600">
          Unable to load bookings. Please try again.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <h1 className="mb-6 text-3xl font-bold">
        Booking Management
      </h1>

      <BookingSearch bookings={bookings || []} />
    </main>
  );
}
