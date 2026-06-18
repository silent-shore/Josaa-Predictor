import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { BarChart3, Search } from "lucide-react";
import "./globals.css";
import { Disclaimer } from "@/components/disclaimer";

export const metadata: Metadata = {
  title: "JoSAA Rank Explorer",
  description: "Search and understand JoSAA opening and closing rank data."
};

const navItems: Array<{ label: string; href: Route }> = [
  { label: "OR-CR Search", href: "/search" },
  { label: "Predictor", href: "/predictor" }
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="sticky top-0 z-20 border-b border-black/10 bg-[#fdfbf7]/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <Link href="/" className="flex items-center gap-2 text-sm font-black tracking-normal text-[var(--foreground)] sm:text-base">
              <span className="grid size-9 place-items-center rounded-md bg-[var(--primary)] text-white">
                <BarChart3 size={18} />
              </span>
              <span>JoSAA Rank Explorer</span>
            </Link>
            <nav className="flex items-center gap-1 overflow-x-auto text-sm text-[var(--muted)]">
              {navItems.map(({ label, href }, index) => {
                const Icon = [Search, BarChart3][index];
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
            Independent JoSAA OR-CR search interface.
          </div>
        </footer>
      </body>
    </html>
  );
}
