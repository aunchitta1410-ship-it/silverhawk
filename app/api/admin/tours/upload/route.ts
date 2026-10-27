import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const BUCKET = "tour-images";
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

function hasValidImageSignature(bytes: Uint8Array, mimeType: string): boolean {
  if (mimeType === "image/jpeg") {
    return (
      bytes.length >= 3 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff
    );
  }

  if (mimeType === "image/png") {
    return (
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  }

  if (mimeType === "image/webp") {
    return (
      bytes.length >= 12 &&
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
    );
  }

  return false;
}

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

    const mimeType = request.headers
      .get("content-type")
      ?.split(";")[0]
      .trim()
      .toLowerCase();

    const extension =
      mimeType && mimeType in ALLOWED_TYPES
        ? ALLOWED_TYPES[mimeType as keyof typeof ALLOWED_TYPES]
        : undefined;

    if (!extension || !mimeType) {
      return NextResponse.json(
        { error: "Only JPEG, PNG, and WebP images are allowed." },
        { status: 400 }
      );
    }

    const fileBytes = new Uint8Array(await request.arrayBuffer());

    if (fileBytes.length <= 0 || fileBytes.length > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Image size must be between 1 byte and 5 MB." },
        { status: 400 }
      );
    }

    if (!hasValidImageSignature(fileBytes, mimeType)) {
      return NextResponse.json(
        { error: "The file content does not match an allowed image type." },
        { status: 400 }
      );
    }

    const fileName = `tour-cover-${randomUUID()}.${extension}`;

    const { error: uploadError } = await adminClient.storage
      .from(BUCKET)
      .upload(fileName, fileBytes, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      console.error("Tour image upload failed:", uploadError.message);
      return NextResponse.json(
        { error: "Unable to upload image. Please check Supabase storage." },
        { status: 500 }
      );
    }

    const { data: pubData } = adminClient.storage
      .from(BUCKET)
      .getPublicUrl(fileName);

    return NextResponse.json(
      {
        image_url: pubData.publicUrl,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Tour image upload error:", error);
    return NextResponse.json(
      { error: "Unable to process tour image upload." },
      { status: 500 }
    );
  }
}

