import Link from "next/link";

const linkColumns = [
  {
    title: "Product",
    links: [
      { href: "/platforms", label: "Platforms" },
      { href: "/compare", label: "Compare" },
    ],
  },
  {
    title: "Site",
    links: [
      { href: "/", label: "Home" },
      { href: "/admin", label: "Admin" },
    ],
  },
];

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-nav text-white" role="contentinfo">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-2 md:flex md:flex-wrap md:gap-x-12 md:gap-y-6">
          {linkColumns.map((col) => (
            <div key={col.title}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                {col.title}
              </h3>
              <ul className="mt-4 space-y-3">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-300 transition hover:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-nav"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 border-t border-white/10 pt-6">
          <p className="text-xs text-gray-400">
            © {currentYear} XDR Platform Comparison. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
