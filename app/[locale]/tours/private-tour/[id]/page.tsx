import MainTourDetailPage from "@/app/[locale]/tours/[id]/page";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function TourDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  return <MainTourDetailPage {...props} />;
}
