import { NextResponse } from "next/server";
import { getGeneratedFlashcard, db, FlashcardItem } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = Math.min(parseInt(searchParams.get("limit") || "10", 10), 100);
  const category = searchParams.get("category") || "All";
  const search = searchParams.get("search")?.toLowerCase().trim() || "";
  const random = searchParams.get("random") === "true";
  const excludeSeenParam = searchParams.get("excludeSeen") !== "false"; // Default true to prevent repeat

  const profile = db.getUserProfile();
  const seenSet = new Set(excludeSeenParam ? profile.seenCardIds || [] : []);

  const totalWords = 10000000; // 10 Million+ unique flashcards dataset capacity

  const results: FlashcardItem[] = [];

  if (random) {
    // Generate unique random flashcards avoiding seen cards
    let attempts = 0;
    while (results.length < limit && attempts < 1000) {
      const randIdx = Math.floor(Math.random() * totalWords);
      const card = getGeneratedFlashcard(randIdx);
      attempts++;

      if (seenSet.has(card.id)) continue; // Never repeat seen card for this profile

      const matchesCat = category === "All" || card.category.toLowerCase() === category.toLowerCase();
      if (matchesCat && !results.some((c) => c.id === card.id)) {
        results.push(card);
      }
    }
  } else if (search) {
    // Search across generated items avoiding seen cards
    let scanIdx = 0;
    while (results.length < limit && scanIdx < 10000) {
      const card = getGeneratedFlashcard(scanIdx);
      scanIdx++;

      if (seenSet.has(card.id)) continue; // Skip card already seen by profile

      const matchesSearch =
        card.front.santhaliRoman.toLowerCase().includes(search) ||
        card.front.santhaliOlChiki.includes(search) ||
        card.back.hindi.toLowerCase().includes(search) ||
        card.back.english.toLowerCase().includes(search) ||
        card.concept.toLowerCase().includes(search);
      const matchesCat = category === "All" || card.category.toLowerCase() === category.toLowerCase();

      if (matchesSearch && matchesCat) {
        results.push(card);
      }
    }
  } else {
    // Paginated retrieval filtering out seen cards
    let scanIdx = (page - 1) * limit;
    let foundCount = 0;

    while (results.length < limit && scanIdx < totalWords && scanIdx < 50000) {
      const card = getGeneratedFlashcard(scanIdx);
      scanIdx++;

      if (seenSet.has(card.id)) continue; // Never repeat cards seen by user profile

      const matchesCat = category === "All" || card.category.toLowerCase() === category.toLowerCase();
      if (matchesCat) {
        results.push(card);
      }
    }
  }

  return NextResponse.json({
    page,
    limit,
    totalCount: totalWords,
    seenCount: seenSet.size,
    category,
    cards: results,
  });
}

// POST endpoint to record reviewed/seen card IDs and learning telemetry for teacher
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cardId, cardIds, reset, result, concept, studentId } = body;

    if (reset) {
      db.resetSeenCards();
      return NextResponse.json({ success: true, message: "Seen history reset", seenCount: 0 });
    }

    // If review result ("right" or "practice") is provided, record learning telemetry for teacher
    if (result && cardId) {
      const reviewResult = db.recordFlashcardReview({
        cardId,
        concept: concept || "General Concept",
        result: result === "right" ? "right" : "practice",
        studentId,
      });
      return NextResponse.json({ ...reviewResult });
    }

    let updatedSeen: string[] = [];
    if (cardId) {
      updatedSeen = db.markCardSeen(cardId);
    } else if (Array.isArray(cardIds)) {
      updatedSeen = db.markCardsSeen(cardIds);
    }

    return NextResponse.json({ success: true, seenCount: updatedSeen.length });
  } catch (e) {
    return NextResponse.json({ error: "Failed to record seen cards" }, { status: 400 });
  }
}
