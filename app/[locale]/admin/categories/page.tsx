import { getTourCategories } from "@/lib/tour-categories";
import CategoryManagementClient from "./CategoryManagementClient";

export default async function CategoryPage() {
  const categories = await getTourCategories();
  return <CategoryManagementClient initialCategories={categories} />;
}
