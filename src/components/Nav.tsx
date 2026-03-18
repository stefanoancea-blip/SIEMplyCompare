"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Button from "@/components/Button";

const mainLinks = [
  { href: "/", label: "Home" },
  { href: "/platforms", label: "Platforms" },
  { href: "/compare", label: "Compare" },
  { href: "/admin", label: "Admin" },
];

export default function Nav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="w-full bg-nav text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        {/* Logo / app name */}
        <Link
          href="/"
          className="shrink-0 text-lg font-semibold text-white hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-nav"
        >
          SIEMplyCompare
        </Link>

        {/* Desktop nav */}
        <nav aria-label="Main" className="hidden items-center gap-8 md:flex">
          <ul className="flex gap-6">
            {mainLinks.map(({ href, label }) => {
              const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={`text-sm font-medium transition hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-nav ${
                      isActive ? "text-white" : "text-gray-300"
                    }`}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Desktop CTA */}
        <div className="hidden shrink-0 md:block">
          <Button href="/compare" variant="primary" className="focus:ring-offset-nav">
            Get started
          </Button>
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          className="inline-flex items-center justify-center rounded p-2 text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-primary md:hidden"
          aria-expanded={mobileOpen}
          aria-controls="mobile-menu"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          <span className="sr-only">{mobileOpen ? "Close menu" : "Open menu"}</span>
          {mobileOpen ? (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu panel */}
      <div
        id="mobile-menu"
        className={`border-t border-white/10 md:hidden ${mobileOpen ? "block" : "hidden"}`}
        role="dialog"
        aria-label="Mobile navigation"
      >
        <nav aria-label="Mobile main" className="px-4 py-4 sm:px-6">
          <ul className="flex flex-col gap-1">
            {mainLinks.map(({ href, label }) => {
              const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className={`block rounded px-3 py-2 text-sm font-medium transition hover:bg-white/10 ${
                      isActive ? "text-white bg-white/5" : "text-gray-300"
                    }`}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 border-t border-white/10 pt-4">
            <Button
              href="/compare"
              variant="primary"
              onClick={() => setMobileOpen(false)}
              className="block w-full text-center"
            >
              Get started
            </Button>
          </div>
        </nav>
      </div>
    </header>
  );
}
