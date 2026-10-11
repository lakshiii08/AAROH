import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json().catch(() => ({}));
    const deadline = body.deadline || "2026-10-30T17:00:00Z";

    const result = db.approveAndAssignMaterial(params.id, deadline);
    if (!result) {
      return NextResponse.json(
        {
          success: false,
          error: "Material not found or generated content is missing",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      material: result.material,
      worksheet: result.worksheet,
      message: `Assigned as worksheet to students. Deadline: ${deadline}`,
    });
  } catch (error) {
    console.error("POST /api/materials/[id]/assign failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to approve and assign material" },
      { status: 500 }
    );
  }
}
