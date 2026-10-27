import { getHomepageContent } from "@/lib/homepage-content";
import { createAdminClient } from "@/lib/supabase/admin";
import HomepageCmsClient from "./HomepageCmsClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomepageCmsPage() {
  const content = await getHomepageContent();

  let hasSiteSettingsTable = false;
  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("site_settings")
      .select("key")
      .limit(1);
    if (!error) {
      hasSiteSettingsTable = true;
    }
  } catch {
    hasSiteSettingsTable = false;
  }

  return (
    <HomepageCmsClient
      initialContent={content}
      hasSiteSettingsTable={hasSiteSettingsTable}
    />
  );
}
