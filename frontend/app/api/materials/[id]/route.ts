import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const material = db.getMaterialById(params.id);
    if (!material) {
      return NextResponse.json(
        { success: false, error: "Material not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, material });
  } catch (error) {
    console.error("GET /api/materials/[id] failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch material" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const updates = await req.json();
    const updated = db.updateMaterial(params.id, updates);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Material not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, material: updated });
  } catch (error) {
    console.error("PATCH /api/materials/[id] failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update material" },
      { status: 500 }
    );
  }
}
