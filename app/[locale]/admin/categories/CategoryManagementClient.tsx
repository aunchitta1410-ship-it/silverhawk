"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type TourCategoriesMap = Record<string, string[]>;

type Props = {
  initialCategories: TourCategoriesMap;
};

export default function CategoryManagementClient({ initialCategories }: Props) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const locale = segments[0] || "en";

  const [categoriesMap, setCategoriesMap] = useState<TourCategoriesMap>(initialCategories);
  const [activeView, setActiveView] = useState<"overview" | "categories" | "subcategories">("overview");

  // Create Category state
  const [newCategoryName, setNewCategoryName] = useState("");

  // Create Subcategory state
  const [selectedParentCategory, setSelectedParentCategory] = useState<string>(
    Object.keys(initialCategories)[0] || ""
  );
  const [newSubcategoryName, setNewSubcategoryName] = useState("");

  // Category Edit state
  const [editingCategoryKey, setEditingCategoryKey] = useState<string | null>(null);
  const [editingCategoryValue, setEditingCategoryValue] = useState("");

  // Subcategory Edit state
  const [editingSubcategoryKey, setEditingSubcategoryKey] = useState<string | null>(null);
  const [editingSubcategoryValue, setEditingSubcategoryValue] = useState("");
  const [editingSubcategoryParent, setEditingSubcategoryParent] = useState<string>("");

  // Inline subcategory input per category card (in overview)
  const [inlineSubInputByCat, setInlineSubInputByCat] = useState<Record<string, string>>({});
  const [activeInlineAddCat, setActiveInlineAddCat] = useState<string | null>(null);

  // Status & feedback
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const totalCategories = Object.keys(categoriesMap).length;
  const totalSubcategories = Object.values(categoriesMap).reduce(
    (acc, subs) => acc + (subs?.length || 0),
    0
  );

  function showMessage(type: "success" | "error", message: string) {
    setFeedback({ type, message });
    if (type === "success") {
      setTimeout(() => setFeedback(null), 4000);
    }
  }

  // --- API Handlers ---

  async function handleAddCategory(nameToAdd?: string) {
    const targetName = (nameToAdd || newCategoryName).trim();
    if (!targetName) {
      showMessage("error", "Category name cannot be empty");
      return;
    }
    if (categoriesMap[targetName]) {
      showMessage("error", `Category "${targetName}" already exists`);
      return;
    }

    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/tour-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add_category", name: targetName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create category");

      setCategoriesMap(data.categories);
      setNewCategoryName("");
      if (!selectedParentCategory) setSelectedParentCategory(targetName);
      showMessage("success", `Category "${targetName}" created successfully!`);
    } catch (err: any) {
      showMessage("error", err.message || "Failed to create category");
    } finally {
      setLoading(false);
    }
  }

  async function handleRenameCategory(oldName: string) {
    const newName = editingCategoryValue.trim();
    if (!newName) {
      showMessage("error", "New category name cannot be empty");
      return;
    }
    if (newName === oldName) {
      setEditingCategoryKey(null);
      return;
    }
    if (categoriesMap[newName] && newName.toLowerCase() !== oldName.toLowerCase()) {
      showMessage("error", `Category "${newName}" already exists`);
      return;
    }

    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/tour-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rename_category", oldName, newName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to rename category");

      setCategoriesMap(data.categories);
      if (selectedParentCategory === oldName) setSelectedParentCategory(newName);
      setEditingCategoryKey(null);
      showMessage("success", `Category renamed from "${oldName}" to "${newName}"`);
    } catch (err: any) {
      showMessage("error", err.message || "Failed to rename category");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteCategory(categoryName: string) {
    const subCount = categoriesMap[categoryName]?.length || 0;
    const confirmText = subCount > 0
      ? `Are you sure you want to delete category "${categoryName}"? This category contains ${subCount} subcategory(ies).`
      : `Are you sure you want to delete category "${categoryName}"?`;

    if (!window.confirm(confirmText)) return;

    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/tour-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_category", name: categoryName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete category");

      setCategoriesMap(data.categories);
      if (selectedParentCategory === categoryName) {
        const remaining = Object.keys(data.categories);
        setSelectedParentCategory(remaining[0] || "");
      }
      showMessage("success", `Category "${categoryName}" deleted successfully`);
    } catch (err: any) {
      showMessage("error", err.message || "Failed to delete category");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddSubcategory(parentCat?: string, subName?: string) {
    const targetParent = parentCat || selectedParentCategory;
    const targetName = (subName || newSubcategoryName).trim();

    if (!targetParent) {
      showMessage("error", "Please select a parent category first");
      return;
    }
    if (!targetName) {
      showMessage("error", "Subcategory name cannot be empty");
      return;
    }
    const currentSubs = categoriesMap[targetParent] || [];
    if (currentSubs.some((s) => s.toLowerCase() === targetName.toLowerCase())) {
      showMessage("error", `Subcategory "${targetName}" already exists under "${targetParent}"`);
      return;
    }

    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/tour-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_subcategory",
          category: targetParent,
          name: targetName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add subcategory");

      setCategoriesMap(data.categories);
      if (!subName) setNewSubcategoryName("");
      if (parentCat) {
        setInlineSubInputByCat((prev) => ({ ...prev, [parentCat]: "" }));
        setActiveInlineAddCat(null);
      }
      showMessage("success", `Added subcategory "${targetName}" to "${targetParent}"`);
    } catch (err: any) {
      showMessage("error", err.message || "Failed to add subcategory");
    } finally {
      setLoading(false);
    }
  }

  async function handleRenameSubcategory(parentCat: string, oldName: string) {
    const newName = editingSubcategoryValue.trim();
    if (!newName) {
      showMessage("error", "New subcategory name cannot be empty");
      return;
    }
    if (newName === oldName) {
      setEditingSubcategoryKey(null);
      return;
    }

    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/tour-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "rename_subcategory",
          category: parentCat,
          oldName,
          newName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to rename subcategory");

      setCategoriesMap(data.categories);
      setEditingSubcategoryKey(null);
      showMessage("success", `Renamed subcategory in "${parentCat}" to "${newName}"`);
    } catch (err: any) {
      showMessage("error", err.message || "Failed to rename subcategory");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteSubcategory(parentCat: string, subName: string) {
    if (!window.confirm(`Delete subcategory "${subName}" from "${parentCat}"?`)) return;

    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/tour-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_subcategory",
          category: parentCat,
          name: subName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete subcategory");

      setCategoriesMap(data.categories);
      showMessage("success", `Deleted subcategory "${subName}" from "${parentCat}"`);
    } catch (err: any) {
      showMessage("error", err.message || "Failed to delete subcategory");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F6F4EE] p-6 lg:p-8 text-[#282722]">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏷️</span>
              <h1 className="font-serif text-2xl font-bold text-[#17352A]">
                Category Management
              </h1>
            </div>
            <p className="mt-1 text-xs text-[#5D5A50]">
              Create, rename, and organize primary tour categories and subcategories. On the tour page, tours can be assigned to any category.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/${locale}/admin/tours`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#D6CEBD] bg-white px-4 py-2 text-xs font-bold text-[#17352A] shadow-xs hover:bg-[#FAF8F3] transition"
            >
              <span>🏝️</span>
              <span>Go to Tours Page</span>
            </Link>
          </div>
        </div>

        {/* Feedback / Alert */}
        {feedback && (
          <div
            className={`rounded-xl border p-4 text-xs font-semibold flex items-center justify-between transition-all ${
              feedback.type === "success"
                ? "border-green-300 bg-green-50 text-green-800"
                : "border-red-300 bg-red-50 text-red-800"
            }`}
          >
            <div className="flex items-center gap-2">
              <span>{feedback.type === "success" ? "✓" : "⚠️"}</span>
              <span>{feedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-xs font-bold opacity-60 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        )}

        {/* Stat Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-[#D6CEBD] bg-white p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#5D5A50]">
                Primary Categories
              </p>
              <h2 className="font-serif text-2xl font-bold text-[#17352A] mt-0.5">
                {totalCategories}
              </h2>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FAF8F3] border border-[#D6CEBD] text-[#B89450] text-xl">
              🏷️
            </div>
          </div>

          <div className="rounded-2xl border border-[#D6CEBD] bg-white p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#5D5A50]">
                Total Subcategories
              </p>
              <h2 className="font-serif text-2xl font-bold text-[#17352A] mt-0.5">
                {totalSubcategories}
              </h2>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FAF8F3] border border-[#D6CEBD] text-[#17352A] text-xl">
              📂
            </div>
          </div>

          <div className="rounded-2xl border border-[#D6CEBD] bg-white p-5 shadow-xs flex items-center justify-between sm:col-span-2 lg:col-span-1">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#5D5A50]">
                System Hierarchy Status
              </p>
              <p className="text-xs font-semibold text-emerald-700 mt-1 flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Live in Tours &amp; Booking
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FAF8F3] border border-[#D6CEBD] text-emerald-700 text-xl">
              ✓
            </div>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[#D6CEBD] pb-4">
          <button
            type="button"
            onClick={() => setActiveView("overview")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeView === "overview"
                ? "bg-[#17352A] text-[#D1B16A] shadow-md"
                : "bg-white border border-[#D6CEBD] text-[#5D5A50] hover:bg-[#FAF8F3]"
            }`}
          >
            <span>🌳 Overview &amp; Hierarchy</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-mono ${
                activeView === "overview"
                  ? "bg-[#D1B16A] text-[#17352A]"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {totalCategories}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView("categories")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeView === "categories"
                ? "bg-[#17352A] text-[#D1B16A] shadow-md"
                : "bg-white border border-[#D6CEBD] text-[#5D5A50] hover:bg-[#FAF8F3]"
            }`}
          >
            <span>🏷️ Create &amp; Manage Categories</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-mono ${
                activeView === "categories"
                  ? "bg-[#D1B16A] text-[#17352A]"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {totalCategories}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView("subcategories")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeView === "subcategories"
                ? "bg-[#17352A] text-[#D1B16A] shadow-md"
                : "bg-white border border-[#D6CEBD] text-[#5D5A50] hover:bg-[#FAF8F3]"
            }`}
          >
            <span>📂 Create &amp; Manage Subcategories</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-mono ${
                activeView === "subcategories"
                  ? "bg-[#D1B16A] text-[#17352A]"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {totalSubcategories}
            </span>
          </button>
        </div>

        {/* VIEW 1: OVERVIEW & HIERARCHY */}
        {activeView === "overview" && (
          <div className="space-y-6">
            {/* Quick Creation Row */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Quick Add Category */}
              <div className="rounded-2xl border border-[#D6CEBD] bg-white p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#17352A] flex items-center gap-1.5">
                    <span>🏷️</span> Add New Category
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Wellness & Spa, Eco Expeditions"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void handleAddCategory();
                      }
                    }}
                    className="flex-1 rounded-xl border border-[#D6CEBD] bg-[#FAF8F3] px-3.5 py-2 text-xs text-[#282722] focus:border-[#B89450] focus:bg-white focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={loading || !newCategoryName.trim()}
                    onClick={() => void handleAddCategory()}
                    className="rounded-xl bg-gradient-to-r from-[#D1B16A] to-[#B89450] px-4 py-2 text-xs font-bold text-[#17352A] shadow-xs hover:brightness-105 disabled:opacity-50 transition"
                  >
                    {loading ? "..." : "+ Create"}
                  </button>
                </div>
              </div>

              {/* Quick Add Subcategory */}
              <div className="rounded-2xl border border-[#D6CEBD] bg-white p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#17352A] flex items-center gap-1.5">
                    <span>📂</span> Add Subcategory to Category
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <select
                    value={selectedParentCategory}
                    onChange={(e) => setSelectedParentCategory(e.target.value)}
                    className="sm:col-span-1 rounded-xl border border-[#D6CEBD] bg-[#FAF8F3] px-3 py-2 text-xs font-semibold text-[#282722] focus:border-[#B89450] focus:bg-white focus:outline-none"
                  >
                    {Object.keys(categoriesMap).map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <div className="sm:col-span-2 flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Catamaran Cruise, Sunset Yoga"
                      value={newSubcategoryName}
                      onChange={(e) => setNewSubcategoryName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void handleAddSubcategory();
                        }
                      }}
                      className="flex-1 rounded-xl border border-[#D6CEBD] bg-[#FAF8F3] px-3.5 py-2 text-xs text-[#282722] focus:border-[#B89450] focus:bg-white focus:outline-none"
                    />
                    <button
                      type="button"
                      disabled={loading || !newSubcategoryName.trim() || !selectedParentCategory}
                      onClick={() => void handleAddSubcategory()}
                      className="rounded-xl bg-[#17352A] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#122b22] disabled:opacity-50 transition"
                    >
                      {loading ? "..." : "+ Add"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Hierarchical Cards Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
              {Object.keys(categoriesMap).map((catName) => {
                const subs = categoriesMap[catName] || [];
                const isEditingCat = editingCategoryKey === catName;
                const isAddingSub = activeInlineAddCat === catName;

                return (
                  <div
                    key={catName}
                    className="flex flex-col justify-between rounded-2xl border border-[#D6CEBD] bg-white p-5 shadow-xs transition hover:border-[#B89450] hover:shadow-md"
                  >
                    <div>
                      {/* Category Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-[#E5E0D8]">
                        <div className="flex items-center gap-2.5 flex-1 mr-2">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#17352A] to-[#285745] text-white text-sm shadow-2xs">
                            🏷️
                          </span>
                          {isEditingCat ? (
                            <div className="flex items-center gap-1.5 flex-1">
                              <input
                                type="text"
                                value={editingCategoryValue}
                                onChange={(e) => setEditingCategoryValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    void handleRenameCategory(catName);
                                  } else if (e.key === "Escape") {
                                    setEditingCategoryKey(null);
                                  }
                                }}
                                className="flex-1 rounded-lg border border-[#B89450] bg-white px-2.5 py-1 text-xs font-bold text-[#282722] focus:outline-none"
                                autoFocus
                              />
                              <button
                                type="button"
                                disabled={loading || !editingCategoryValue.trim()}
                                onClick={() => void handleRenameCategory(catName)}
                                className="rounded bg-[#17352A] px-2 py-1 text-[10px] font-bold text-white"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingCategoryKey(null)}
                                className="rounded bg-gray-200 px-2 py-1 text-[10px] font-bold text-gray-700"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <div>
                              <h3 className="font-serif text-sm font-bold text-[#17352A]">
                                {catName}
                              </h3>
                              <span className="text-[10px] font-semibold text-[#B89450]">
                                {subs.length} {subs.length === 1 ? "subcategory" : "subcategories"}
                              </span>
                            </div>
                          )}
                        </div>

                        {!isEditingCat && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCategoryKey(catName);
                                setEditingCategoryValue(catName);
                              }}
                              className="rounded-lg p-1.5 text-gray-400 hover:bg-[#FAF8F3] hover:text-[#B89450] transition"
                              title="Rename Category"
                            >
                              ✎
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDeleteCategory(catName)}
                              className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition"
                              title="Delete Category"
                            >
                              🗑️
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Subcategories List */}
                      <div className="pt-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                            Subcategories
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveInlineAddCat(isAddingSub ? null : catName);
                              setInlineSubInputByCat((prev) => ({ ...prev, [catName]: "" }));
                            }}
                            className="text-[10px] font-bold text-[#B89450] hover:underline cursor-pointer"
                          >
                            {isAddingSub ? "✕ Close" : "+ Add Subcategory"}
                          </button>
                        </div>

                        {/* Inline Add Input */}
                        {isAddingSub && (
                          <div className="flex items-center gap-1.5 rounded-xl border border-[#B89450]/40 bg-[#FAF8F3] p-2">
                            <input
                              type="text"
                              placeholder="New subcategory name..."
                              value={inlineSubInputByCat[catName] || ""}
                              onChange={(e) =>
                                setInlineSubInputByCat((prev) => ({
                                  ...prev,
                                  [catName]: e.target.value,
                                }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  void handleAddSubcategory(catName, inlineSubInputByCat[catName]);
                                }
                              }}
                              className="flex-1 rounded-lg border border-[#D6CEBD] bg-white px-2 py-1 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
                              autoFocus
                            />
                            <button
                              type="button"
                              disabled={loading || !(inlineSubInputByCat[catName] || "").trim()}
                              onClick={() => void handleAddSubcategory(catName, inlineSubInputByCat[catName])}
                              className="rounded-lg bg-[#17352A] px-2.5 py-1 text-[11px] font-bold text-white hover:bg-[#122b22] disabled:opacity-50"
                            >
                              Add
                            </button>
                          </div>
                        )}

                        {subs.length === 0 ? (
                          <p className="text-[11px] italic text-gray-400 py-2">
                            No subcategories added yet. Click &quot;+ Add Subcategory&quot; above.
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {subs.map((sub) => {
                              const isEditingSub =
                                editingSubcategoryKey === `${catName}:::${sub}`;

                              if (isEditingSub) {
                                return (
                                  <div
                                    key={sub}
                                    className="flex items-center gap-1 rounded-lg border border-[#B89450] bg-white px-2 py-1"
                                  >
                                    <input
                                      type="text"
                                      value={editingSubcategoryValue}
                                      onChange={(e) => setEditingSubcategoryValue(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          e.preventDefault();
                                          void handleRenameSubcategory(catName, sub);
                                        } else if (e.key === "Escape") {
                                          setEditingSubcategoryKey(null);
                                        }
                                      }}
                                      className="w-28 text-xs font-semibold focus:outline-none"
                                      autoFocus
                                    />
                                    <button
                                      type="button"
                                      onClick={() => void handleRenameSubcategory(catName, sub)}
                                      className="text-[10px] font-bold text-green-700"
                                    >
                                      ✓
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingSubcategoryKey(null)}
                                      className="text-[10px] font-bold text-gray-400"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                );
                              }

                              return (
                                <span
                                  key={sub}
                                  className="group inline-flex items-center gap-1.5 rounded-lg border border-[#E5E0D8] bg-[#FAF8F3] px-2.5 py-1 text-[11px] font-medium text-[#282722] hover:border-[#B89450] hover:bg-white transition"
                                >
                                  <span>{sub}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingSubcategoryKey(`${catName}:::${sub}`);
                                      setEditingSubcategoryValue(sub);
                                      setEditingSubcategoryParent(catName);
                                    }}
                                    className="text-gray-400 hover:text-[#B89450] transition opacity-40 group-hover:opacity-100"
                                    title="Rename subcategory"
                                  >
                                    ✎
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void handleDeleteSubcategory(catName, sub)}
                                    className="text-gray-400 hover:text-red-600 transition opacity-40 group-hover:opacity-100"
                                    title="Delete subcategory"
                                  >
                                    ✕
                                  </button>
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW 2: CATEGORIES ONLY */}
        {activeView === "categories" && (
          <div className="space-y-6">
            {/* Create Category Banner */}
            <div className="rounded-2xl border border-[#D6CEBD] bg-white p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#17352A] to-[#285745] text-white text-lg shadow-xs">
                  🏷️
                </span>
                <div>
                  <h3 className="font-serif text-base font-bold text-[#17352A]">
                    Add New Tour Category
                  </h3>
                  <p className="text-xs text-[#5D5A50]">
                    Create a new high-level category to group your tours.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  placeholder="e.g. Wellness & Spa, Marine Adventures, Cultural Journeys"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void handleAddCategory();
                    }
                  }}
                  className="flex-1 rounded-xl border border-[#D6CEBD] bg-[#FAF8F3] px-4 py-2.5 text-xs text-[#282722] focus:border-[#B89450] focus:bg-white focus:outline-none"
                />
                <button
                  type="button"
                  disabled={loading || !newCategoryName.trim()}
                  onClick={() => void handleAddCategory()}
                  className="rounded-xl bg-gradient-to-r from-[#D1B16A] to-[#B89450] px-6 py-2.5 text-xs font-bold text-[#17352A] shadow-md shadow-[#B89450]/20 hover:brightness-105 disabled:opacity-50 transition"
                >
                  {loading ? "Creating..." : "Create Category"}
                </button>
              </div>
            </div>

            {/* Category Table / Cards */}
            <div className="rounded-2xl border border-[#D6CEBD] bg-white shadow-xs overflow-hidden">
              <div className="border-b border-[#E5E0D8] bg-[#FAF8F3] px-6 py-4 flex items-center justify-between">
                <h3 className="font-serif text-sm font-bold text-[#17352A]">
                  All Tour Categories ({totalCategories})
                </h3>
              </div>

              <div className="divide-y divide-[#E5E0D8]">
                {Object.keys(categoriesMap).map((catName) => {
                  const subs = categoriesMap[catName] || [];
                  const isEditing = editingCategoryKey === catName;

                  return (
                    <div
                      key={catName}
                      className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FAF8F3]/50 transition"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FAF8F3] border border-[#D6CEBD] text-[#17352A] text-sm shrink-0">
                          🏷️
                        </span>
                        {isEditing ? (
                          <div className="flex items-center gap-2 flex-1 max-w-md">
                            <input
                              type="text"
                              value={editingCategoryValue}
                              onChange={(e) => setEditingCategoryValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  void handleRenameCategory(catName);
                                } else if (e.key === "Escape") {
                                  setEditingCategoryKey(null);
                                }
                              }}
                              className="flex-1 rounded-lg border border-[#B89450] bg-white px-3 py-1.5 text-xs font-bold text-[#282722] focus:outline-none"
                              autoFocus
                            />
                            <button
                              type="button"
                              disabled={loading || !editingCategoryValue.trim()}
                              onClick={() => void handleRenameCategory(catName)}
                              className="rounded-lg bg-[#17352A] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#122b22]"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingCategoryKey(null)}
                              className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-200"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div>
                            <span className="text-sm font-bold text-[#17352A] block">
                              {catName}
                            </span>
                            <span className="text-[11px] text-[#5D5A50]">
                              Contains {subs.length} {subs.length === 1 ? "subcategory" : "subcategories"}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedParentCategory(catName);
                            setActiveView("subcategories");
                          }}
                          className="rounded-lg border border-[#D6CEBD] bg-white px-3 py-1.5 text-xs font-semibold text-[#17352A] hover:bg-[#FAF8F3] transition"
                        >
                          Manage Subcategories ({subs.length}) →
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCategoryKey(catName);
                            setEditingCategoryValue(catName);
                          }}
                          className="rounded-lg border border-[#D6CEBD] bg-white px-3 py-1.5 text-xs font-semibold text-[#5D5A50] hover:text-[#B89450] hover:bg-[#FAF8F3] transition"
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteCategory(catName)}
                          className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: SUBCATEGORIES ONLY */}
        {activeView === "subcategories" && (
          <div className="space-y-6">
            {/* Filter by Category & Add Subcategory */}
            <div className="rounded-2xl border border-[#D6CEBD] bg-white p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-serif text-base font-bold text-[#17352A] flex items-center gap-2">
                    <span>📂</span> Add Subcategory to &quot;{selectedParentCategory}&quot;
                  </h3>
                  <p className="text-xs text-[#5D5A50]">
                    Select parent category and type the new subcategory name.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#5D5A50]">Parent Category:</span>
                  <select
                    value={selectedParentCategory}
                    onChange={(e) => setSelectedParentCategory(e.target.value)}
                    className="rounded-xl border border-[#D6CEBD] bg-[#FAF8F3] px-3 py-2 text-xs font-bold text-[#17352A] focus:border-[#B89450] focus:bg-white focus:outline-none"
                  >
                    {Object.keys(categoriesMap).map((cat) => (
                      <option key={cat} value={cat}>
                        {cat} ({categoriesMap[cat]?.length || 0})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="text"
                  placeholder={`e.g. New subcategory under "${selectedParentCategory}"...`}
                  value={newSubcategoryName}
                  onChange={(e) => setNewSubcategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void handleAddSubcategory();
                    }
                  }}
                  className="flex-1 rounded-xl border border-[#D6CEBD] bg-[#FAF8F3] px-4 py-2.5 text-xs text-[#282722] focus:border-[#B89450] focus:bg-white focus:outline-none"
                />
                <button
                  type="button"
                  disabled={loading || !newSubcategoryName.trim() || !selectedParentCategory}
                  onClick={() => void handleAddSubcategory()}
                  className="rounded-xl bg-gradient-to-r from-[#D1B16A] to-[#B89450] px-6 py-2.5 text-xs font-bold text-[#17352A] shadow-md shadow-[#B89450]/20 hover:brightness-105 disabled:opacity-50 transition"
                >
                  {loading ? "Adding..." : "+ Add Subcategory"}
                </button>
              </div>
            </div>

            {/* List of Subcategories under selected parent */}
            <div className="rounded-2xl border border-[#D6CEBD] bg-white shadow-xs overflow-hidden">
              <div className="border-b border-[#E5E0D8] bg-[#FAF8F3] px-6 py-4 flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-sm font-bold text-[#17352A]">
                    Subcategories in &quot;{selectedParentCategory}&quot;
                  </h3>
                  <p className="text-[11px] text-[#5D5A50]">
                    {(categoriesMap[selectedParentCategory] || []).length} total subcategories
                  </p>
                </div>
              </div>

              {(categoriesMap[selectedParentCategory] || []).length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-500">
                  No subcategories under &quot;{selectedParentCategory}&quot; yet. Use the field above to add one.
                </div>
              ) : (
                <div className="divide-y divide-[#E5E0D8]">
                  {(categoriesMap[selectedParentCategory] || []).map((sub) => {
                    const isEditing =
                      editingSubcategoryKey === `${selectedParentCategory}:::${sub}`;

                    return (
                      <div
                        key={sub}
                        className="px-6 py-3.5 flex items-center justify-between hover:bg-[#FAF8F3]/50 transition"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FAF8F3] border border-[#D6CEBD] text-[#B89450] text-xs">
                            📂
                          </span>
                          {isEditing ? (
                            <div className="flex items-center gap-2 flex-1 max-w-md">
                              <input
                                type="text"
                                value={editingSubcategoryValue}
                                onChange={(e) => setEditingSubcategoryValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    void handleRenameSubcategory(selectedParentCategory, sub);
                                  } else if (e.key === "Escape") {
                                    setEditingSubcategoryKey(null);
                                  }
                                }}
                                className="flex-1 rounded-lg border border-[#B89450] bg-white px-3 py-1.5 text-xs font-bold text-[#282722] focus:outline-none"
                                autoFocus
                              />
                              <button
                                type="button"
                                disabled={loading || !editingSubcategoryValue.trim()}
                                onClick={() => void handleRenameSubcategory(selectedParentCategory, sub)}
                                className="rounded-lg bg-[#17352A] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#122b22]"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingSubcategoryKey(null)}
                                className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-200"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs font-bold text-[#282722]">
                              {sub}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingSubcategoryKey(`${selectedParentCategory}:::${sub}`);
                              setEditingSubcategoryValue(sub);
                            }}
                            className="rounded-lg border border-[#D6CEBD] bg-white px-2.5 py-1 text-xs font-semibold text-[#5D5A50] hover:text-[#B89450] hover:bg-[#FAF8F3] transition"
                          >
                            Rename
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteSubcategory(selectedParentCategory, sub)}
                            className="rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 transition"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
