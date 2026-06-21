import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { BarChart3, Building2, Search } from "lucide-react";
import "./globals.css";
import { Disclaimer } from "@/components/disclaimer";

export const metadata: Metadata = {
  title: "JoSAA RankMap",
  description: "Search and understand JoSAA opening and closing rank data.",
  icons: {
    icon: "/josaa-rankmap-icon.png",
    shortcut: "/josaa-rankmap-icon.png",
    apple: "/josaa-rankmap-icon.png"
  }
};

const navItems: Array<{ label: string; href: Route }> = [
  { label: "OR-CR Search", href: "/search" },
  { label: "Predictor", href: "/predictor" },
  { label: "Institutes", href: "/institutes" }
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="sticky top-0 z-20 border-b border-black/10 bg-[#fdfbf7]/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <Link href="/" className="focus-ring flex min-h-10 items-center rounded-md">
              <img
                src="/josaa-rankmap-logo.png"
                alt="JoSAA RankMap"
                className="h-10 w-auto max-w-[13rem] object-contain sm:h-11 sm:max-w-[16rem]"
              />
            </Link>
            <nav className="flex items-center gap-1 overflow-x-auto text-sm text-[var(--muted)]">
              {navItems.map(({ label, href }, index) => {
                const Icon = [Search, BarChart3, Building2][index];
                return (
                <Link
                  key={href}
                  href={href}
                  className="focus-ring inline-flex min-h-9 shrink-0 items-center gap-2 rounded-md px-3 py-2 font-semibold hover:bg-white hover:text-[var(--foreground)]"
                >
                  <Icon size={15} />
                  {label}
                </Link>
                );
              })}
            </nav>
          </div>
        </header>
        <Disclaimer />
        <main>{children}</main>
        <footer className="border-t border-[var(--border)] bg-[#fdfbf7]">
          <div className="mx-auto max-w-7xl px-4 py-6 text-sm text-[var(--muted)] sm:px-6 lg:px-8">
            JoSAA RankMap is an independent JoSAA OR-CR search interface.
          </div>
        </footer>
      </body>
    </html>
  );
}
