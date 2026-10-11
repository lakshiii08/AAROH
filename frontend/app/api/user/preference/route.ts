import { NextResponse } from "next/server";
import { db, UserProfile } from "@/lib/db";

export async function GET() {
  const profile = db.getUserProfile();
  return NextResponse.json({ profile });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const current = db.getUserProfile();

    // Strict Backend Enforcement for Students:
    // Students can NEVER mutate their name, rollNo, grade, school, pin, or role.
    // The ONLY setting students are permitted to change is their preferred language.
    if (current.role === "student") {
      const allowedUpdates: Partial<UserProfile> = {};

      if (body.language && ["en", "hi", "sat"].includes(body.language)) {
        allowedUpdates.language = body.language;
        // Sync language preference to the student record in database
        db.updateStudent(current.id, { language: body.language });
      }

      // Allow flashcard seen IDs to sync internally
      if (body.seenCardIds && Array.isArray(body.seenCardIds)) {
        allowedUpdates.seenCardIds = body.seenCardIds;
      }

      const updatedProfile = db.updateUserProfile(allowedUpdates);
      return NextResponse.json({ profile: updatedProfile, success: true });
    }

    // Teacher or Admin role updates
    const updatedProfile = db.updateUserProfile(body);
    return NextResponse.json({ profile: updatedProfile, success: true });
  } catch (e) {
    return NextResponse.json({ error: "Failed to update profile preferences" }, { status: 400 });
  }
}
