
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const BUCKET = "tour-itinerary-images";
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

function hasValidImageSignature(
  bytes: Uint8Array,
  mimeType: string
): boolean {
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
    console.log("[ITINERARY UPLOAD] POST route reached");
    // 1. Verify the logged-in user.
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

    // 2. Verify Admin access on the server.
    const adminClient = createAdminClient();

    const { data: admin, error: adminError } = await adminClient
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (adminError) {
      console.error("Admin verification failed:", adminError.message);
      return NextResponse.json(
        { error: "Unable to verify admin access." },
        { status: 500 }
      );
    }

    if (!admin) {
      return NextResponse.json(
        { error: "Admin access required." },
        { status: 403 }
      );
    }

    // 3. Validate the raw image body and tour ID.
const url = new URL(request.url);
const rawTourId = url.searchParams.get("tour_id");
const tourId = Number(rawTourId);

if (
  !rawTourId ||
  !Number.isSafeInteger(tourId) ||
  tourId <= 0
) {
  return NextResponse.json(
    { error: "A valid tour_id is required." },
    { status: 400 }
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

    // Verify the tour exists before uploading.
    const { data: tour, error: tourError } = await adminClient
      .from("tours")
      .select("id")
      .eq("id", tourId)
      .maybeSingle();

    if (tourError) {
      console.error("Tour lookup failed:", tourError.message);
      return NextResponse.json(
        { error: "Unable to verify the tour." },
        { status: 500 }
      );
    }

    if (!tour) {
      return NextResponse.json(
        { error: "Tour not found." },
        { status: 404 }
      );
    }

    // 4. Upload using the server-only Admin client.
    const imagePath = `tour-${tourId}/${randomUUID()}.${extension}`;

    const { error: uploadError } = await adminClient.storage
  .from(BUCKET)
  .upload(imagePath, fileBytes, {
    contentType: mimeType,
    upsert: false,
  });

if (uploadError) {
  console.error("Itinerary image upload failed:", uploadError.message);
  return NextResponse.json(
    { error: "Unable to upload image. Check the Storage bucket." },
    { status: 500 }
  );
}

   
  // 5. Create a temporary URL for preview.
  const { data: signed, error: signedError } = await adminClient.storage
    .from(BUCKET)
    .createSignedUrl(imagePath, 60 * 60);

  if (signedError || !signed?.signedUrl) {
    console.error(
      "Signed URL creation failed:",
      signedError?.message
    );

    // Remove the uploaded file if a preview URL cannot be created.
    const { error: cleanupError } = await adminClient.storage
      .from(BUCKET)
      .remove([imagePath]);

    if (cleanupError) {
      console.error(
        "Uploaded image cleanup failed:",
        cleanupError.message
      );
    }

    return NextResponse.json(
      { error: "Unable to prepare image preview." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      image_path: imagePath,
      signed_url: signed.signedUrl,
    },
    { status: 201 }
  );

  } catch (error) {
    console.error("Itinerary image API error:", error);

    return NextResponse.json(
      { error: "Unable to process itinerary image upload." },
      { status: 500 }
    );
  }
}