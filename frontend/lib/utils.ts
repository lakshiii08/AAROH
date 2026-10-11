import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Text-to-speech helper with support for Santali/Hindi/English voices */
export function speak(
  text: string,
  lang: "hi-IN" | "en-US" | "en-IN" = "hi-IN",
  onEnd?: () => void
) {
  if (typeof window === "undefined") return;
  if (!("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();

  // Strip brackets, emojis, and numbering for cleaner audio pronunciation
  const cleanText = text
    .replace(/[#(\[{}\])]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleanText) return;

  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = lang;
  utterance.rate = 0.88; // slightly slower for educational clarity

  // Try finding matching voice if available in browser
  const voices = window.speechSynthesis.getVoices();
  if (voices && voices.length > 0) {
    const matchedVoice = voices.find((v) => v.lang.startsWith(lang.split("-")[0]));
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }
  }

  if (onEnd) {
    utterance.onend = () => onEnd();
    utterance.onerror = () => onEnd();
  }

  window.speechSynthesis.speak(utterance);
}
