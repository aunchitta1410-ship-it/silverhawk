"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import LogoutButton from "./LogoutButton";

export default function AdminSidebar() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const locale = segments[0] || "en";

  const menuItems = [
    {
      name: "Dashboard",
      href: `/${locale}/admin`,
      exact: true,
      isActive: pathname === `/${locale}/admin`,
    },
    {
      name: "Bookings",
      href: `/${locale}/admin/bookings`,
      exact: false,
      isActive: pathname.startsWith(`/${locale}/admin/bookings`),
    },
    {
      name: "Payments",
      href: `/${locale}/admin/payments`,
      exact: false,
      isActive: pathname.startsWith(`/${locale}/admin/payments`),
    },
    {
      name: "Tours",
      href: `/${locale}/admin/tours`,
      exact: false,
      isActive: pathname.startsWith(`/${locale}/admin/tours`),
    },
    {
      name: "Category",
      href: `/${locale}/admin/categories`,
      exact: false,
      isActive: pathname.startsWith(`/${locale}/admin/categories`),
    },
    {
      name: "Customers",
      href: `/${locale}/admin/customers`,
      exact: false,
      isActive: pathname.startsWith(`/${locale}/admin/customers`),
    },
    {
      name: "Audit Logs",
      href: `/${locale}/admin/audit-logs`,
      exact: false,
      isActive: pathname.startsWith(`/${locale}/admin/audit-logs`),
    },
    {
      name: "Policies & PDPA",
      href: `/${locale}/admin/policies`,
      exact: false,
      isActive: pathname.startsWith(`/${locale}/admin/policies`),
    },
    {
      name: "Homepage CMS",
      href: `/${locale}/admin/homepage-cms`,
      exact: false,
      isActive: pathname.startsWith(`/${locale}/admin/homepage-cms`),
    },
    {
      name: "Settings",
      href: `/${locale}/admin/settings`,
      exact: false,
      isActive: pathname.startsWith(`/${locale}/admin/settings`),
    },
  ];

  return (
    <aside className="w-64 bg-[#17352A] p-6 text-white min-h-screen flex flex-col justify-between shrink-0">
      <div>
        <div className="mb-8 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Silver Hawk Group Logo"
            className="h-10 w-auto object-contain"
          />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#D1B16A]">
              Silver Hawk Group
            </p>
            <h1 className="text-xl font-bold text-white mt-0.5">
              Admin Panel
            </h1>
          </div>
        </div>

        <nav className="space-y-1">
          {menuItems.map((item) => {
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between rounded-xl px-4 py-2.5 text-sm transition ${
                  item.isActive
                    ? "bg-white/15 font-bold text-[#D1B16A] shadow-xs"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className="flex items-center gap-2">
                  {item.name === "Categories" && <span className="text-xs text-[#D1B16A]/80">🏷️</span>}
                  {item.name === "Subcategories" && <span className="text-xs text-[#D1B16A]/80">📂</span>}
                  <span>{item.name}</span>
                </span>
                {item.isActive && (
                  <span className="h-1.5 w-1.5 rounded-full bg-[#D1B16A]" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="pt-6 border-t border-white/10 space-y-3">
        <LogoutButton />
        <p className="text-[11px] text-white/40 text-center">
          Silver Hawk Admin v2.0
        </p>
      </div>
    </aside>
  );
}
