"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StudentSideNav } from "@/components/layout/student-side-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/providers/language-provider";
import { NotificationItem } from "@/lib/db";
import { Bell, CheckCheck, Clock, ArrowRight, FileText } from "lucide-react";

export default function StudentNotificationsPage() {
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      if (data.notifications) setNotifications(data.notifications);
    } catch (e) {
      console.error("Failed to load notifications:", e);
    } finally {
      setLoading(false);
    }
  };

  const markAllRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (e) {
      console.error("Failed to mark read:", e);
    }
  };

  const markItemRead = async (id: string) => {
    try {
      await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch (e) {
      console.error("Failed to mark item read:", e);
    }
  };

  return (
    <div className="min-h-screen md:flex bg-cream">
      <StudentSideNav />

      <main className="flex-1 min-w-0 max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-8 pb-24 md:pb-12 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink tracking-tight">
              {t("notif_title")}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {t("notif_subtitle")}
            </p>
          </div>

          {notifications.some((n) => !n.read) && (
            <Button
              type="button"
              onClick={markAllRead}
              variant="outline"
              size="sm"
              className="text-xs self-start"
            >
              <CheckCheck className="w-3.5 h-3.5 mr-1 text-emerald" />
              <span>{t("notif_mark_all_read")}</span>
            </Button>
          )}
        </div>

        {loading ? (
          <div className="p-8 text-center bg-white rounded-xl border border-gray-200 text-xs text-gray-400">
            {t("loading")}
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-xl border border-gray-200/80 space-y-2">
            <Bell className="w-8 h-8 text-gray-300 mx-auto" />
            <p className="text-sm font-semibold text-gray-700">{t("notif_empty")}</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200/80 rounded-xl divide-y divide-gray-100 overflow-hidden">
            {notifications.map((notif) => {
              const formattedDate = new Date(notif.createdAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div
                  key={notif.id}
                  className={`p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors ${
                    !notif.read ? "bg-amber-50/20" : "bg-white"
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className="mt-0.5 relative">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
                        <FileText className="w-4 h-4" />
                      </div>
                      {!notif.read && (
                        <span className="w-2 h-2 rounded-full bg-amber-500 absolute -top-0.5 -right-0.5 ring-2 ring-white" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge tone={!notif.read ? "amber" : "neutral"}>
                          {notif.subjectName}
                        </Badge>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {formattedDate}
                        </span>
                      </div>

                      <h3 className="font-semibold text-sm text-ink">{notif.title}</h3>
                      <p className="text-xs text-gray-600">{notif.message}</p>
                    </div>
                  </div>

                  <Link
                    href="/student/worksheets"
                    onClick={() => markItemRead(notif.id)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-emerald hover:text-emerald-dark px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-50 transition-colors shrink-0 self-start sm:self-auto"
                  >
                    <span>{t("notif_view_worksheet")}</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
