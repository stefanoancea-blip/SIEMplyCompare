"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const subLinks = [
  { href: "/admin/api-key", label: "API Key" },
  { href: "/admin/platforms", label: "Platforms" },
  { href: "/admin/add", label: "Add platform" },
  { href: "/admin/categories", label: "Category scores" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin/platforms") {
    return pathname === "/admin/platforms" || pathname.startsWith("/admin/platforms/");
  }
  return pathname === href;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <>
      <div className="border-b border-gray-200 bg-content-bg-muted">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <Link
            href="/admin"
            className="text-sm font-medium text-primary hover:underline"
          >
            ← Admin
          </Link>
          <nav aria-label="Admin sections" className="mt-3 flex flex-wrap gap-4">
            {subLinks.map(({ href, label }) => {
              const active = isActive(pathname ?? "", href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-white ${
                    active
                      ? "text-primary"
                      : "text-content-foreground hover:text-primary"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
      {children}
    </>
  );
}
