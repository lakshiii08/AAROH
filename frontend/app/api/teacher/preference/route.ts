import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const profile = db.getTeacherProfile();
    return NextResponse.json({ profile });
  } catch (e) {
    return NextResponse.json({ error: "Failed to fetch teacher profile" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const updatedProfile = db.updateTeacherProfile(body);
    return NextResponse.json({ profile: updatedProfile, success: true });
  } catch (e) {
    return NextResponse.json({ error: "Failed to update teacher profile" }, { status: 400 });
  }
}
