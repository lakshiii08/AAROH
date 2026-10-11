import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const notifications = db.getNotifications();
  return NextResponse.json({ notifications });
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, markAll } = body;
    if (markAll) {
      db.markAllNotificationsRead();
    } else if (id) {
      db.markNotificationRead(id);
    }
    return NextResponse.json({ success: true, notifications: db.getNotifications() });
  } catch (e) {
    return NextResponse.json({ error: "Failed to update notification" }, { status: 400 });
  }
}
