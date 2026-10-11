"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sprout, LogOut, Home, Layers, Mic, FileText, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

// Icons are resolved from a string key rather than accepted as a component
// prop, because a function (the icon component) can't be passed from a
// Server Component into this Client Component across the RSC boundary.
const icons = {
  home: Home,
  layers: Layers,
  mic: Mic,
  fileText: FileText,
  barChart3: BarChart3,
} as const;

export type SideNavIconName = keyof typeof icons;

export type SideNavLink = {
  href: string;
  label: string;
  icon: SideNavIconName;
};

export function SideNav({
  role,
  links,
}: {
  role: "student" | "teacher";
  links: SideNavLink[];
}) {
  const pathname = usePathname();
  const accent = role === "student" ? "text-emerald" : "text-slateblue";
  const activeBg = role === "student" ? "bg-emerald-light text-emerald-dark" : "bg-slateblue-light text-slateblue-dark";

  return (
    <>
      {/* Desktop sidebar */}
      <nav
        aria-label="Main navigation"
        className="hidden md:flex md:flex-col md:w-60 md:shrink-0 md:sticky md:top-0 md:h-screen md:overflow-y-auto border-r border-ink/8 bg-white"
      >
        <Link href="/login" className="flex items-center gap-2 px-6 h-16 shrink-0">
          <Sprout className={cn("w-6 h-6", accent)} />
          <span className="font-display font-bold text-lg text-ink">AAROH</span>
        </Link>

        <div className="flex-1 flex flex-col gap-1 px-3 py-2">
          {links.map((link) => {
            const active = pathname === link.href;
            const Icon = icons[link.icon];
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                  active ? activeBg : "text-ink/55 hover:bg-ink/5 hover:text-ink"
                )}
              >
                <Icon className="w-4.5 h-4.5 shrink-0" />
                <span className="truncate">{link.label}</span>
              </Link>
            );
          })}
        </div>

        <Link
          href="/login"
          className="flex items-center gap-2 px-6 h-14 shrink-0 border-t border-ink/8 text-sm font-semibold text-ink/50 hover:text-ink"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </Link>
      </nav>

      {/* Mobile bottom nav */}
      <nav
        aria-label="Main navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-10 bg-white border-t border-ink/8 flex items-stretch"
      >
        {links.map((link) => {
          const active = pathname === link.href;
          const Icon = icons[link.icon];
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-semibold",
                active ? (role === "student" ? "text-emerald-dark" : "text-slateblue-dark") : "text-ink/45"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="truncate max-w-[4.5rem]">{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
