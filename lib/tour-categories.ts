import { PRESET_CATEGORIES } from "./tour-extended-types";
import { createAdminClient } from "@/lib/supabase/admin";
import { readJsonStorage, writeJsonStorage } from "@/lib/serverless-store";

export type TourCategoriesMap = Record<string, string[]>;

export async function getTourCategories(): Promise<TourCategoriesMap> {
  try {
    const parsed = await readJsonStorage<TourCategoriesMap>(
      "tour_categories.json",
      { ...PRESET_CATEGORIES },
      "tour_categories"
    );
    if (parsed && typeof parsed === "object" && Object.keys(parsed).length > 0) {
      return parsed;
    }
    return { ...PRESET_CATEGORIES };
  } catch (err) {
    console.error("Failed to read tour categories:", err);
    return { ...PRESET_CATEGORIES };
  }
}

export async function saveTourCategories(
  categories: TourCategoriesMap
): Promise<TourCategoriesMap> {
  await writeJsonStorage("tour_categories.json", categories, "tour_categories");
  return categories;
}

export async function addCategory(categoryName: string): Promise<TourCategoriesMap> {
  const trimmed = categoryName.trim();
  if (!trimmed) throw new Error("Category name cannot be empty");

  const categories = await getTourCategories();
  if (!categories[trimmed]) {
    categories[trimmed] = [];
    await saveTourCategories(categories);
  }
  return categories;
}

export async function renameCategory(
  oldName: string,
  newName: string
): Promise<TourCategoriesMap> {
  const from = oldName.trim();
  const to = newName.trim();
  if (!to) throw new Error("New category name cannot be empty");
  if (from === to) return await getTourCategories();

  const categories = await getTourCategories();
  const existingSubcategories = categories[from] || [];

  // Update categories map preserving order
  const updated: TourCategoriesMap = {};
  for (const key of Object.keys(categories)) {
    if (key === from) {
      updated[to] = existingSubcategories;
    } else {
      updated[key] = categories[key];
    }
  }
  if (!updated[to]) {
    updated[to] = existingSubcategories;
  }

  await saveTourCategories(updated);

  // Propagate to tour_extended.json
  try {
    const extData = await readJsonStorage<Record<string, any>>("tour_extended.json", {}, "tour_extended");
    let changed = false;
    for (const id of Object.keys(extData)) {
      if (extData[id]?.category === from) {
        extData[id].category = to;
        changed = true;
      }
    }
    if (changed) {
      await writeJsonStorage("tour_extended.json", extData, "tour_extended");
    }
  } catch (err) {
    console.warn("Could not propagate category rename to tour_extended.json:", err);
  }

  // Propagate to Supabase tours table
  try {
    const adminClient = createAdminClient();
    await adminClient.from("tours").update({ category: to }).eq("category", from);
  } catch (err) {
    console.warn("Could not propagate category rename to Supabase:", err);
  }

  return updated;
}

export async function deleteCategory(categoryName: string): Promise<TourCategoriesMap> {
  const target = categoryName.trim();
  const categories = await getTourCategories();
  delete categories[target];
  await saveTourCategories(categories);
  return categories;
}

export async function addSubcategory(
  categoryName: string,
  subcategoryName: string
): Promise<TourCategoriesMap> {
  const cat = categoryName.trim();
  const sub = subcategoryName.trim();
  if (!cat) throw new Error("Category name required");
  if (!sub) throw new Error("Subcategory name cannot be empty");

  const categories = await getTourCategories();
  if (!categories[cat]) {
    categories[cat] = [];
  }
  if (!categories[cat].includes(sub)) {
    categories[cat].push(sub);
    await saveTourCategories(categories);
  }
  return categories;
}

export async function renameSubcategory(
  categoryName: string,
  oldName: string,
  newName: string
): Promise<TourCategoriesMap> {
  const cat = categoryName.trim();
  const from = oldName.trim();
  const to = newName.trim();
  if (!cat) throw new Error("Category name required");
  if (!to) throw new Error("New subcategory name cannot be empty");
  if (from === to) return await getTourCategories();

  const categories = await getTourCategories();
  if (categories[cat]) {
    categories[cat] = categories[cat].map((s) => (s === from ? to : s));
    await saveTourCategories(categories);
  }

  // Propagate to tour_extended.json
  try {
    const extData = await readJsonStorage<Record<string, any>>("tour_extended.json", {}, "tour_extended");
    let changed = false;
    for (const id of Object.keys(extData)) {
      if (extData[id]?.category === cat && extData[id]?.subcategory === from) {
        extData[id].subcategory = to;
        changed = true;
      }
    }
    if (changed) {
      await writeJsonStorage("tour_extended.json", extData, "tour_extended");
    }
  } catch (err) {
    console.warn("Could not propagate subcategory rename to tour_extended.json:", err);
  }

  // Propagate to Supabase tours table
  try {
    const adminClient = createAdminClient();
    await adminClient
      .from("tours")
      .update({ subcategory: to })
      .eq("category", cat)
      .eq("subcategory", from);
  } catch (err) {
    console.warn("Could not propagate subcategory rename to Supabase:", err);
  }

  return categories;
}

export async function deleteSubcategory(
  categoryName: string,
  subcategoryName: string
): Promise<TourCategoriesMap> {
  const cat = categoryName.trim();
  const sub = subcategoryName.trim();
  const categories = await getTourCategories();
  if (categories[cat]) {
    categories[cat] = categories[cat].filter((s) => s !== sub);
    await saveTourCategories(categories);
  }
  return categories;
}
