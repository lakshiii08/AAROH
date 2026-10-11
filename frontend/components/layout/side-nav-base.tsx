"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sprout, LogOut, Home, Layers, Mic, FileText, BarChart3, Bell, Settings, Globe, ClipboardCheck, CheckSquare, Users, Folder, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/providers/language-provider";

const icons = {
  home: Home,
  layers: Layers,
  mic: Mic,
  fileText: FileText,
  barChart3: BarChart3,
  bell: Bell,
  settings: Settings,
  globe: Globe,
  clipboardCheck: ClipboardCheck,
  checkSquare: CheckSquare,
  users: Users,
  folder: Folder,
  bookOpen: BookOpen,
} as const;

export type SideNavIconName = keyof typeof icons;

export type SideNavLink = {
  href: string;
  labelKey?: string;
  labelFallback: string;
  icon: SideNavIconName;
  badgeCount?: number;
};

export function SideNavBase({
  role,
  links,
}: {
  role: "student" | "teacher";
  links: SideNavLink[];
}) {
  const pathname = usePathname();
  const { t, language, setLanguage } = useLanguage();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (role === "student") {
      fetch("/api/notifications")
        .then((res) => res.json())
        .then((data) => {
          if (data?.notifications) {
            const unread = data.notifications.filter((n: any) => !n.read).length;
            setUnreadCount(unread);
          }
        })
        .catch(() => {});
    }
  }, [role, pathname]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        aria-label="Main navigation"
        className="hidden md:flex md:flex-col md:w-60 md:shrink-0 md:sticky md:top-0 md:h-screen md:overflow-y-auto border-r border-gray-200/80 bg-white z-20"
      >
        {/* Header with App Logo & Language dropdown */}
        <div className="flex items-center justify-between px-5 h-16 shrink-0 border-b border-gray-100">
          <Link href={role === "student" ? "/student/dashboard" : "/teacher/dashboard"} className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald flex items-center justify-center border border-emerald-100">
              <Sprout className="w-4.5 h-4.5" />
            </div>
            <div>
              <span className="font-display font-bold text-base tracking-tight text-ink block leading-none">AAROH</span>
              <span className="text-[10px] text-gray-400 font-medium leading-none block mt-0.5">
                {role === "student" ? t("portal_student") : t("portal_teacher")}
              </span>
            </div>
          </Link>

          {/* Clean Language Selector */}
          <div className="flex items-center gap-1 bg-gray-50 border border-gray-200/70 rounded-md px-2 py-1 text-xs text-gray-700">
            <Globe className="w-3 h-3 text-gray-400 shrink-0" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as any)}
              className="bg-transparent text-[11px] font-medium outline-none cursor-pointer text-gray-700 pr-0.5"
              aria-label="Select system language"
            >
              <option value="en">EN</option>
              <option value="hi">हिंदी</option>
              <option value="sat">ᱥᱟᱱᱛᱟᱲᱤ</option>
            </select>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 flex flex-col gap-1 px-3 py-4">
          {links.map((link) => {
            const active = pathname === link.href || (link.href !== "/student/dashboard" && pathname.startsWith(link.href));
            const Icon = icons[link.icon];
            const labelText = link.labelKey ? t(link.labelKey) : link.labelFallback;
            const isNotif = link.icon === "bell";
            const badge = isNotif ? unreadCount : link.badgeCount;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-emerald-50 text-emerald font-semibold"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <div className="flex items-center gap-3 truncate">
                  <Icon className={cn("w-4 h-4 shrink-0", active ? "text-emerald" : "text-gray-400")} />
                  <span className="truncate">{labelText}</span>
                </div>
                {badge && badge > 0 ? (
                  <span className="bg-amber-100 text-amber-800 text-[11px] font-semibold px-2 py-0.2 rounded-full shrink-0">
                    {badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        {/* Footer sign out */}
        <div className="p-3 border-t border-gray-100">
          <Link
            href="/login"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5 text-gray-400" />
            <span>{t("nav_signout")}</span>
          </Link>
        </div>
      </aside>

      {/* Mobile bottom navigation */}
      <nav
        aria-label="Main navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-200/90 flex items-stretch shadow-xs"
      >
        {links.map((link) => {
          const active = pathname === link.href;
          const Icon = icons[link.icon];
          const labelText = link.labelKey ? t(link.labelKey) : link.labelFallback;
          const isNotif = link.icon === "bell";
          const badge = isNotif ? unreadCount : link.badgeCount;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium relative transition-colors",
                active ? "text-emerald font-semibold" : "text-gray-500 hover:text-gray-700"
              )}
            >
              <div className="relative">
                <Icon className={cn("w-4.5 h-4.5", active ? "text-emerald" : "text-gray-400")} />
                {badge && badge > 0 ? (
                  <span className="absolute -top-1 -right-2 bg-amber-500 text-white text-[9px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">
                    {badge}
                  </span>
                ) : null}
              </div>
              <span className="truncate max-w-[4rem]">{labelText}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
