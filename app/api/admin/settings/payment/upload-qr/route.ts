import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { savePaymentSettings } from "@/lib/payment-settings";
import { addAuditLog } from "@/lib/audit-log";
import { getAdminEmail } from "@/lib/admin-email";

export const runtime = "nodejs";

const BUCKET = "tour-images";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const ALLOWED_MIME_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/svg+xml": "svg",
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
    let originalName = "promptpay-qr";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = (formData.get("file") || formData.get("qrImage") || formData.get("image")) as File | null;

      if (!file) {
        return NextResponse.json(
          { error: "No image file provided in form data." },
          { status: 400 }
        );
      }

      mimeType = file.type || "image/png";
      originalName = file.name || "promptpay-qr.png";
      fileBuffer = Buffer.from(await file.arrayBuffer());
    } else {
      // Direct binary body
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
        { error: "File size exceeds the 5MB limit." },
        { status: 400 }
      );
    }

    const extension = ALLOWED_MIME_TYPES[mimeType] || "png";
    const filename = `promptpay-qr-${Date.now()}-${randomUUID().slice(0, 8)}.${extension}`;
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
        console.warn("Supabase storage upload failed, using local fallback:", uploadError.message);
      }
    } catch (sbErr) {
      console.warn("Supabase storage exception, using local fallback:", sbErr);
    }

    // 2. Also persist locally to public/images for reliable local serving and fallback
    try {
      const localDir = path.join(process.cwd(), "public", "images");
      await fs.mkdir(localDir, { recursive: true });
      const localFilePath = path.join(localDir, filename);
      await fs.writeFile(localFilePath, fileBuffer);
      if (!finalUrl) {
        finalUrl = `/images/${filename}`;
      }
    } catch (fsErr) {
      console.warn("Could not save to public/images:", fsErr);
    }

    // 3. Fallback to base64 Data URI if neither storage nor fs URL is reachable
    if (!finalUrl) {
      finalUrl = `data:${mimeType};base64,${fileBuffer.toString("base64")}`;
    }

    // 4. Update payment settings with the new QR URL
    const adminEmail = await getAdminEmail(user?.email);
    await savePaymentSettings(
      {
        promptpay_qr_image_url: finalUrl,
      },
      adminEmail
    );

    // 5. Audit Log
    try {
      await addAuditLog({
        action: "UPDATE_PAYMENT_SETTINGS",
        adminEmail,
        targetType: "system",
        targetId: "payment_settings",
        description: `Uploaded new PromptPay QR Code image (${originalName})`,
      });
    } catch (auditErr) {
      console.warn("Audit log error:", auditErr);
    }

    return NextResponse.json({
      success: true,
      image_url: finalUrl,
      filename,
      message: "PromptPay QR code uploaded and updated successfully.",
    });
  } catch (error: any) {
    console.error("Upload QR error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to upload PromptPay QR code." },
      { status: 500 }
    );
  }
}
