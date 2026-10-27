/**
 * Tour ID Generation Utility
 *
 * Requirements:
 * First Alphabet of Category - Third Alphabet (first 3 characters) of Subcategory - No. of order name tour
 *
 * Example:
 * Category is Unmissable = U
 * Subcategory is PhiPhiIsland = Phi
 * No. of order name tour is 1
 * Tour ID = U-Phi-1
 */

export function generateTourId(
  category?: string | null,
  subcategory?: string | null,
  orderNumber?: number | string | null,
  customTourId?: string | null
): string {
  if (customTourId && customTourId.trim()) {
    return customTourId.trim();
  }

  // 1. First Alphabet of Category (e.g. Unmissable -> U)
  const cleanCat = (category || "").trim().replace(/[^a-zA-Z0-9]/g, "");
  const catLetter = cleanCat.length > 0 ? cleanCat.charAt(0).toUpperCase() : "U";

  // 2. Third Alphabet of Subcategory (first 3 letters / characters, e.g. PhiPhiIsland -> Phi)
  const cleanSub = (subcategory || "").trim().replace(/[^a-zA-Z0-9]/g, "");
  let subLetter = "Phi";
  if (cleanSub.length >= 3) {
    subLetter = cleanSub.charAt(0).toUpperCase() + cleanSub.slice(1, 3);
  } else if (cleanSub.length > 0) {
    subLetter = cleanSub.toUpperCase();
  }

  // 3. No. of order name tour (e.g. 1)
  const num =
    orderNumber !== undefined && orderNumber !== null && String(orderNumber).trim() !== ""
      ? String(orderNumber).trim()
      : "1";

  return `${catLetter}-${subLetter}-${num}`;
}

export function getTourDisplayCode(
  tour: {
    id: number | string;
    category?: string | null;
    subcategory?: string | null;
    custom_tour_id?: string | null;
    tour_order?: number | null;
  },
  extended?: {
    category?: string | null;
    subcategory?: string | null;
    custom_tour_id?: string | null;
    tour_order?: number | null;
  } | null,
  fallbackOrder: number | string = 1
): string {
  if (extended?.custom_tour_id?.trim()) {
    return extended.custom_tour_id.trim();
  }
  if (tour.custom_tour_id?.trim()) {
    return tour.custom_tour_id.trim();
  }

  const category = extended?.category || tour.category || "Unmissable";
  const subcategory = extended?.subcategory || tour.subcategory || "PhiPhiIsland";
  const order = extended?.tour_order ?? tour.tour_order ?? fallbackOrder;

  return generateTourId(category, subcategory, order);
}
