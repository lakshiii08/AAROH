# AAROH — Frontend Prototype

A mock-data-driven Next.js (App Router) frontend prototype for AAROH, an AI-powered
platform bridging Hindi/English curriculum with Santhali for rural and tribal
primary education. No backend — everything runs on hardcoded data and React state.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000 — it redirects to `/login`.

## Routes

| Route                        | Description                                              |
|-------------------------------|-----------------------------------------------------------|
| `/login`                     | Role-based login shell (Student / Teacher)                |
| `/student/dashboard`         | Student home: lessons, badges, accuracy, nav cards        |
| `/flashcards`                | Interactive Santhali flashcard deck (flip, audio, track)  |
| `/translation`               | Hold-to-speak voice translation mock (Hindi/English ↔ Santhali) |
| `/mock-sheet`                | Split-view worksheet translation & localization tool      |
| `/teacher/dashboard`         | Class performance, learning-gap table, roster, upload UI  |
| `/teacher/flashcard-report`  | Flashcard mastery analytics & remediation list             |

## Notes

- All data lives in `lib/mock-data.ts` — edit it to try different students,
  concepts, or Santhali phrases.
- `lib/utils.ts` includes a `speak()` helper that uses the browser's built-in
  `SpeechSynthesis` API as a stand-in for real Santhali text-to-speech (most
  browsers don't ship a Santhali voice, so it falls back to Hindi).
- Santhali is shown in both **Ol Chiki script** (`Noto Sans Ol Chiki`, loaded via
  Google Fonts in `app/globals.css`) and Romanized transliteration.
- UI primitives (`Button`, `Card`, `Badge`, `Progress`) in `components/ui/` are
  small hand-rolled components in a shadcn-like style — swap in real shadcn/ui
  components later if desired.
- Design tokens (colors, fonts, radii) live in `tailwind.config.ts`:
  emerald (growth/nature), amber (Santhali/audio accent), slate blue (teacher
  data views), on a warm cream background.
