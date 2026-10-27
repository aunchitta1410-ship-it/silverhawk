import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  getTourCategories,
  saveTourCategories,
  addCategory,
  renameCategory,
  deleteCategory,
  addSubcategory,
  renameSubcategory,
  deleteSubcategory,
} from "@/lib/tour-categories";
import { addAuditLog } from "@/lib/audit-log";
import { createClient } from "@/lib/supabase/server";
import { getAdminEmail } from "@/lib/admin-email";

export async function GET() {
  try {
    const categories = await getTourCategories();
    return NextResponse.json({ success: true, categories });
  } catch (err: any) {
    console.error("Failed to load tour categories:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to load tour categories" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    let sessionEmail: string | undefined;
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email) sessionEmail = user.email;
    } catch {
      // Non-fatal
    }
    const adminEmail = await getAdminEmail(sessionEmail);

    const body = await request.json();
    const { action } = body;
    let updatedCategories;

    switch (action) {
      case "add_category": {
        const { name } = body;
        if (!name || typeof name !== "string") {
          return NextResponse.json({ error: "Category name is required" }, { status: 400 });
        }
        updatedCategories = await addCategory(name);
        await addAuditLog({
          action: "UPDATE_TOUR",
          adminEmail,
          targetType: "tour",
          targetId: 0,
          description: `Created new tour category: ${name}`,
        });
        break;
      }

      case "rename_category": {
        const { oldName, newName } = body;
        if (!oldName || !newName) {
          return NextResponse.json({ error: "Both old and new category names are required" }, { status: 400 });
        }
        updatedCategories = await renameCategory(oldName, newName);
        await addAuditLog({
          action: "UPDATE_TOUR",
          adminEmail,
          targetType: "tour",
          targetId: 0,
          description: `Renamed tour category from "${oldName}" to "${newName}"`,
        });
        break;
      }

      case "delete_category": {
        const { name } = body;
        if (!name) {
          return NextResponse.json({ error: "Category name is required" }, { status: 400 });
        }
        updatedCategories = await deleteCategory(name);
        await addAuditLog({
          action: "UPDATE_TOUR",
          adminEmail,
          targetType: "tour",
          targetId: 0,
          description: `Deleted tour category: ${name}`,
        });
        break;
      }

      case "add_subcategory": {
        const { category, name } = body;
        if (!category || !name) {
          return NextResponse.json({ error: "Category and subcategory name are required" }, { status: 400 });
        }
        updatedCategories = await addSubcategory(category, name);
        await addAuditLog({
          action: "UPDATE_TOUR",
          adminEmail,
          targetType: "tour",
          targetId: 0,
          description: `Added subcategory "${name}" to category "${category}"`,
        });
        break;
      }

      case "rename_subcategory": {
        const { category, oldName, newName } = body;
        if (!category || !oldName || !newName) {
          return NextResponse.json(
            { error: "Category, old subcategory name, and new subcategory name are required" },
            { status: 400 }
          );
        }
        updatedCategories = await renameSubcategory(category, oldName, newName);
        await addAuditLog({
          action: "UPDATE_TOUR",
          adminEmail,
          targetType: "tour",
          targetId: 0,
          description: `Renamed subcategory in "${category}" from "${oldName}" to "${newName}"`,
        });
        break;
      }

      case "delete_subcategory": {
        const { category, name } = body;
        if (!category || !name) {
          return NextResponse.json({ error: "Category and subcategory name are required" }, { status: 400 });
        }
        updatedCategories = await deleteSubcategory(category, name);
        await addAuditLog({
          action: "UPDATE_TOUR",
          adminEmail,
          targetType: "tour",
          targetId: 0,
          description: `Deleted subcategory "${name}" from category "${category}"`,
        });
        break;
      }

      case "set": {
        const { categories } = body;
        if (!categories || typeof categories !== "object") {
          return NextResponse.json({ error: "Invalid categories map" }, { status: 400 });
        }
        updatedCategories = await saveTourCategories(categories);
        await addAuditLog({
          action: "UPDATE_TOUR",
          adminEmail,
          targetType: "tour",
          targetId: 0,
          description: `Updated entire tour categories and subcategories structure`,
        });
        break;
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    try {
      revalidatePath("/admin/tours");
      revalidatePath("/[locale]/admin/tours", "page");
      revalidatePath("/tours");
      revalidatePath("/[locale]/tours", "page");
    } catch {
      // Non-fatal
    }

    return NextResponse.json({ success: true, categories: updatedCategories });
  } catch (err: any) {
    console.error("Tour categories API error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
