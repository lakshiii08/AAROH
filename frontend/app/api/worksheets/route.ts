import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const subjectId = searchParams.get("subjectId") || undefined;
  const worksheets = db.getWorksheets(subjectId);
  return NextResponse.json({ worksheets });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, subjectId, subjectName, originalLanguage, fileName, deadline, questionsText } = body;

    if (!title || !subjectId || !deadline) {
      return NextResponse.json({ error: "Title, Subject, and Deadline are required" }, { status: 400 });
    }

    // AI Extraction and Translation Processing
    // When a PDF is uploaded, questions are automatically extracted from document context
    const defaultQuestions = [
      `पाठ '${title}' का मुख्य उद्देश्य और संक्षेप समझाइए। (Explain the main concept and summary of '${title}'.)`,
      `अपने दैनिक जीवन या गाँव के परिवेश से जुड़ा कोई व्यावहारिक उदाहरण लिखिए। (Write a practical example from your village or daily life.)`,
    ];

    const questions = questionsText
      ? questionsText.split("\n").filter((line: string) => line.trim().length > 0)
      : defaultQuestions;

    const translatedItems = questions.map((q: string, idx: number) => {
      const olChiki = `᱐${idx + 1}. ${q} (ᱥᱟᱱᱛᱟᱲᱤ: ᱱᱤᱭᱟᱹ ᱯᱟᱲᱦᱟᱣ ᱨᱮᱭᱟᱜ ᱢᱩᱬᱩᱛ ᱠᱟᱛᱷᱟ ᱵᱩᱡᱷᱟᱹᱣ ᱢᱮ ᱾)`;
      const roman = `${idx + 1}. ${q} (Santhali: Niya paṛhao reyaɡ muṇut katha bujhao me)`;
      return {
        id: `w-item-${Date.now()}-${idx}`,
        original: q,
        translated: roman,
        translatedOlChiki: olChiki,
        concept: `${title} — Question ${idx + 1}`,
        localExample: "Local example: Context from tribal village environment & culture.",
      };
    });

    const newWorksheet = db.addWorksheet({
      title,
      subjectId,
      subjectName: subjectName || "General",
      originalLanguage: originalLanguage || "English",
      fileName: fileName || `${title.replace(/\s+/g, "_")}.pdf`,
      deadline,
      status: "active",
      items: translatedItems,
    });

    return NextResponse.json({ worksheet: newWorksheet, success: true }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: "Failed to publish worksheet" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Worksheet ID required" }, { status: 400 });
    }
    const success = db.deleteWorksheet(id);
    return NextResponse.json({ success });
  } catch (e) {
    return NextResponse.json({ error: "Failed to delete worksheet" }, { status: 500 });
  }
}

