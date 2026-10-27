
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getAllTourExtendedData } from "@/lib/tour-extended";
import TourManagementClient, {
  type Tour,
} from "./TourManagementClient";

export default async function ToursPage() {
  const locale = await getLocale();
  const supabase = await createClient();

  const [{ data: tours, error }, initialExtendedData] = await Promise.all([
    supabase.from("tours").select("*").order("id", { ascending: true }),
    getAllTourExtendedData().catch(() => ({})),
  ]);

  if (error) {
    console.error("Admin Tours Error:", error);

    return (
      <main className="min-h-screen bg-gray-100 p-6 md:p-8">
        <h1 className="mb-4 text-3xl font-bold text-gray-900">
          Tour Management
        </h1>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="font-semibold text-red-600">
            Failed to load tours
          </p>
          <p className="mt-2 break-words text-sm text-gray-600">
            {error.message}
          </p>
        </div>
      </main>
    );
  }

  return (
    <TourManagementClient
      initialTours={(tours ?? []) as Tour[]}
      initialExtendedData={initialExtendedData || {}}
      locale={locale}
    />
  );
}
