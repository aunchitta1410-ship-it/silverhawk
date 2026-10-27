import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const BUCKET = "tour-images";
const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB

const ALLOWED_MIME_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(request: Request) {
  try {
    const sessionClient = await createClient();
    const {
      data: { user },
      error: authError,
    } = await sessionClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Please log in to continue." },
        { status: 401 }
      );
    }

    const adminClient = createAdminClient();
    const { data: admin, error: adminError } = await adminClient
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (adminError || !admin) {
      return NextResponse.json(
        { error: "Admin access required." },
        { status: 403 }
      );
    }

    const contentType = request.headers.get("content-type") || "";
    let fileBuffer: Buffer;
    let mimeType = "";
    let originalName = "hero-bg";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = (formData.get("file") || formData.get("image")) as File | null;

      if (!file) {
        return NextResponse.json(
          { error: "No image file provided." },
          { status: 400 }
        );
      }

      mimeType = file.type || "image/jpeg";
      originalName = file.name || "hero-bg.jpg";
      fileBuffer = Buffer.from(await file.arrayBuffer());
    } else {
      mimeType = contentType.split(";")[0].trim().toLowerCase();
      fileBuffer = Buffer.from(await request.arrayBuffer());
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      return NextResponse.json(
        { error: "File buffer is empty." },
        { status: 400 }
      );
    }

    if (fileBuffer.length > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds the 8MB limit." },
        { status: 400 }
      );
    }

    const extension = ALLOWED_MIME_TYPES[mimeType] || "jpg";
    const filename = `homepage-hero-${Date.now()}-${randomUUID().slice(0, 8)}.${extension}`;
    let finalUrl = "";

    // 1. Try uploading to Supabase Storage
    try {
      const { error: uploadError } = await adminClient.storage
        .from(BUCKET)
        .upload(filename, fileBuffer, {
          contentType: mimeType,
          upsert: true,
        });

      if (!uploadError) {
        const { data: pubData } = adminClient.storage
          .from(BUCKET)
          .getPublicUrl(filename);
        if (pubData?.publicUrl) {
          finalUrl = pubData.publicUrl;
        }
      } else {
        console.warn("Supabase storage upload failed, saving locally:", uploadError.message);
      }
    } catch (sbErr) {
      console.warn("Supabase storage exception:", sbErr);
    }

    // 2. Also persist locally for fast local serving or fallback
    try {
      const publicDir = path.join(process.cwd(), "public", "images");
      await fs.mkdir(publicDir, { recursive: true });
      const localFilePath = path.join(publicDir, filename);
      await fs.writeFile(localFilePath, fileBuffer);
      if (!finalUrl) {
        finalUrl = `/images/${filename}`;
      }
    } catch (fsErr) {
      console.warn("Local storage write warning:", fsErr);
    }

    if (!finalUrl) {
      return NextResponse.json(
        { error: "Failed to upload and store image." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        url: finalUrl,
        filename,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error("Homepage upload error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to upload image" },
      { status: 500 }
    );
  }
}
