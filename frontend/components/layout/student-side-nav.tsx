import { SideNavBase } from "@/components/layout/side-nav-base";

/**
 * Sidebar used on every student-facing page.
 * Links: Dashboard, Flashcards, Worksheets, Evaluations, Notifications, Settings, Talk & Translate.
 */
export function StudentSideNav() {
  return (
    <SideNavBase
      role="student"
      links={[
        { href: "/student/dashboard", labelKey: "nav_dashboard", labelFallback: "Dashboard", icon: "home" },
        { href: "/flashcards", labelKey: "nav_flashcards", labelFallback: "Flash Cards", icon: "layers" },
        { href: "/student/worksheets", labelKey: "nav_worksheets", labelFallback: "Worksheets", icon: "fileText" },
        { href: "/student/evaluations", labelKey: "nav_evaluations", labelFallback: "Evaluations", icon: "clipboardCheck" },
        { href: "/student/notifications", labelKey: "nav_notifications", labelFallback: "Notifications", icon: "bell" },
        { href: "/student/settings", labelKey: "nav_settings", labelFallback: "Settings", icon: "settings" },
        { href: "/student/translation", labelKey: "nav_translate", labelFallback: "Talk & Translate", icon: "mic" },
      ]}
    />
  );
}
