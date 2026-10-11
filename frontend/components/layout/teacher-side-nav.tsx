import { SideNavBase } from "@/components/layout/side-nav-base";

/**
 * Sidebar used on every teacher-facing page.
 * Links: Class Overview, Assignments & Subjects, Student Performance, Settings, Talk & Translate.
 */
export function TeacherSideNav() {
  return (
    <SideNavBase
      role="teacher"
      links={[
        { href: "/teacher/dashboard", labelKey: "nav_teacher_overview", labelFallback: "Overview", icon: "home" },
        { href: "/teacher/materials", labelKey: "nav_teacher_materials", labelFallback: "Books & Materials", icon: "bookOpen" },
        { href: "/teacher/worksheets", labelKey: "nav_teacher_worksheets", labelFallback: "Assignments & Subjects", icon: "fileText" },
        { href: "/teacher/students", labelKey: "nav_teacher_students", labelFallback: "Student Performance", icon: "users" },
        { href: "/teacher/settings", labelKey: "nav_teacher_settings", labelFallback: "Settings", icon: "settings" },
        { href: "/translation?role=teacher", labelKey: "nav_translate", labelFallback: "Talk & Translate", icon: "mic" },
      ]}
    />
  );
}
