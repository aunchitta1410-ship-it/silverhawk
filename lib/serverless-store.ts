import fs from "node:fs/promises";
import path from "node:path";
import { createAdminClient } from "@/lib/supabase/admin";

const memoryStore = new Map<string, unknown>();

function getAdminClientSafe() {
  try {
    return createAdminClient();
  } catch {
    return null;
  }
}

/**
 * Reads JSON data safely in both local environments and serverless (Vercel/AWS Lambda).
 * Ensures read operations never throw EROFS.
 */
export async function readJsonStorage<T>(
  filename: string,
  defaultValue: T,
  supabaseKey?: string
): Promise<T> {
  // 1. Try Supabase first if a key is provided
  if (supabaseKey) {
    try {
      const admin = getAdminClientSafe();
      if (admin) {
        const { data, error } = await admin
          .from("site_settings")
          .select("value")
          .eq("key", supabaseKey)
          .maybeSingle();

        if (!error && data?.value) {
          memoryStore.set(filename, data.value);
          return data.value as T;
        } else if (error && error.code === "PGRST205") {
          console.warn(
            `[serverless-store] Supabase table 'public.site_settings' not found. Please run supabase/migrations/20261026_create_site_settings.sql in Supabase SQL editor.`
          );
        }
      }
    } catch {
      // Network issue or unexpected error; safely fall through
    }
  }

  // 2. Check /tmp (scratch space where serverless updates are saved in warm containers)
  const tmpPath = path.join("/tmp", "data", filename);
  try {
    const raw = await fs.readFile(tmpPath, "utf-8");
    const parsed = JSON.parse(raw);
    memoryStore.set(filename, parsed);
    return parsed as T;
  } catch {
    // Not present in /tmp
  }

  // 3. Check bundled file in process.cwd()/data (local environment or repo bundle)
  const bundledPath = path.join(process.cwd(), "data", filename);
  try {
    const raw = await fs.readFile(bundledPath, "utf-8");
    const parsed = JSON.parse(raw);
    memoryStore.set(filename, parsed);
    return parsed as T;
  } catch {
    // Not present or unreadable in bundle
  }

  // 4. Check in-memory store (fallback for serverless instances where writes only stayed in memory)
  if (memoryStore.has(filename)) {
    return memoryStore.get(filename) as T;
  }

  // 5. Fallback to default in-memory value
  return defaultValue;
}

/**
 * Writes JSON data safely in both local environments and serverless (Vercel/AWS Lambda).
 * Handles EROFS (Read-only file system) by falling back to Supabase and /tmp.
 */
export async function writeJsonStorage<T>(
  filename: string,
  data: T,
  supabaseKey?: string
): Promise<{ supabaseSuccess: boolean; fsSuccess: boolean; error?: string }> {
  // Always update in-memory cache immediately
  memoryStore.set(filename, data);

  let supabaseSuccess = false;
  let fsSuccess = false;
  let supabaseErrorMsg: string | undefined;

  // 1. Persist to Supabase if key is provided and table is available
  if (supabaseKey) {
    try {
      const admin = getAdminClientSafe();
      if (admin) {
        const { error } = await admin.from("site_settings").upsert(
          {
            key: supabaseKey,
            value: data,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "key" }
        );
        if (!error) {
          supabaseSuccess = true;
        } else {
          supabaseErrorMsg = `Supabase upsert error (${error.code}): ${error.message}`;
          console.error(`[serverless-store] ${supabaseErrorMsg}`);
        }
      } else {
        supabaseErrorMsg = "Supabase admin client not initialized (missing URL or Secret Key)";
        console.warn(`[serverless-store] ${supabaseErrorMsg}`);
      }
    } catch (err: unknown) {
      supabaseErrorMsg = err instanceof Error ? err.message : "Unknown Supabase error";
      console.error(`[serverless-store] Exception saving to Supabase:`, err);
    }
  }

  // 2. Try writing to local project directory (development / VPS)
  const bundledPath = path.join(process.cwd(), "data", filename);
  try {
    await fs.mkdir(path.dirname(bundledPath), { recursive: true });
    await fs.writeFile(bundledPath, JSON.stringify(data, null, 2), "utf-8");
    fsSuccess = true;
    return { supabaseSuccess, fsSuccess, error: supabaseErrorMsg };
  } catch (fsErr: unknown) {
    // If running in read-only environment (EROFS in Vercel/Lambda), proceed to /tmp
    const msg = fsErr instanceof Error ? fsErr.message : String(fsErr);
    console.warn(
      `Filesystem write to ${bundledPath} failed (${msg}). Falling back to /tmp.`
    );
  }

  // 3. Fallback to /tmp (writable in AWS Lambda and Vercel serverless)
  const tmpPath = path.join("/tmp", "data", filename);
  try {
    await fs.mkdir(path.dirname(tmpPath), { recursive: true });
    await fs.writeFile(tmpPath, JSON.stringify(data, null, 2), "utf-8");
    fsSuccess = true;
  } catch (tmpErr: unknown) {
    const msg = tmpErr instanceof Error ? tmpErr.message : String(tmpErr);
    console.warn(`Fallback write to ${tmpPath} failed:`, msg);
  }

  return { supabaseSuccess, fsSuccess, error: supabaseErrorMsg };
}
