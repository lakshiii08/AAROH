import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const subjects = db.getSubjects();
  return NextResponse.json({ subjects });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, icon } = body;
    if (!name) {
      return NextResponse.json({ error: "Subject name is required" }, { status: 400 });
    }
    const newSubject = db.addSubject(name, description, icon);
    return NextResponse.json({ subject: newSubject, success: true }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Subject ID required" }, { status: 400 });
    }
    const success = db.deleteSubject(id);
    return NextResponse.json({ success });
  } catch (e) {
    return NextResponse.json({ error: "Failed to delete subject" }, { status: 500 });
  }
}

