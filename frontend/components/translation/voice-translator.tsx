"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, Volume2, ArrowLeftRight, Loader2, Send, AlertCircle, Sparkles, Square } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { speak, cn } from "@/lib/utils";
import { useLanguage } from "@/components/providers/language-provider";

interface TranslationResult {
  originalText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  targetDialect?: string;
  appliedGlossaryTerms: any[];
  latencyMs: number;
  backendUsed: string;
}

export function VoiceTranslator() {
  const { t } = useLanguage();
  const [sourceLang, setSourceLang] = useState<string>("en");
  const [targetLang, setTargetLang] = useState<string>("sat");
  const [targetDialect, setTargetDialect] = useState<string>("sat");
  const [inputText, setInputText] = useState("");
  const [translating, setTranslating] = useState(false);
  const [recording, setRecording] = useState(false);
  const [synthesizing, setSynthesizing] = useState(false);
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [listeningStatus, setListeningStatus] = useState<string>("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const isSpeechRecognizingRef = useRef(false);

  const languages = [
    { code: "en", label: "English", dialect: "" },
    { code: "hi", label: "Hindi (हिन्दी)", dialect: "" },
    { code: "sat", label: "Santali (Ol Chiki ᱥᱟᱱᱛᱟᱲᱤ)", dialect: "sat" },
    { code: "gon", label: "Gondi (Tribal)", dialect: "gon" },
    { code: "hne", label: "Halbi / Chhattisgarhi", dialect: "hne" },
  ];

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
      }
    };
  }, []);

  async function handleTranslate(textToTranslate?: string) {
    const text = (textToTranslate || inputText).trim();
    if (!text) {
      setErrorMessage("Please enter or speak text to translate.");
      return;
    }

    setErrorMessage("");
    setTranslating(true);

    try {
      const resp = await api.translation.translate({
        text,
        source_lang: sourceLang,
        target_lang: targetLang,
        target_dialect: targetDialect || undefined,
        apply_glossary: true,
      });

      setResult({
        originalText: resp.original_text,
        translatedText: resp.translated_text,
        sourceLang: resp.source_lang,
        targetLang: resp.target_lang,
        targetDialect: targetDialect,
        appliedGlossaryTerms: resp.applied_glossary_terms || [],
        latencyMs: resp.latency_ms,
        backendUsed: resp.backend_used,
      });
    } catch (err: any) {
      console.error("Translation API error:", err);
      setErrorMessage(err.message || "Translation service error. Please verify backend connection.");
    } finally {
      setTranslating(false);
    }
  }

  // 1. Real Speech-to-Text: Web Speech Recognition API with MediaRecorder fallback
  function startListening() {
    setErrorMessage("");
    setListeningStatus("Listening to your voice...");

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = sourceLang === "hi" ? "hi-IN" : "en-IN";

        recognition.onstart = () => {
          setRecording(true);
          isSpeechRecognizingRef.current = true;
          setListeningStatus("Listening... speak now into your microphone.");
        };

        recognition.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .map((r: any) => r[0].transcript)
            .join("");
          setInputText(transcript);
          setListeningStatus(`Heard: "${transcript}"`);
        };

        recognition.onerror = (event: any) => {
          console.warn("Speech recognition error:", event.error);
          setRecording(false);
          isSpeechRecognizingRef.current = false;
          setListeningStatus("");
          if (event.error !== "no-speech") {
            setErrorMessage(`Microphone recognition notice: ${event.error}`);
          }
        };

        recognition.onend = () => {
          setRecording(false);
          isSpeechRecognizingRef.current = false;
          setListeningStatus("");
          // Automatically trigger translation if text was captured
          if (inputText.trim()) {
            handleTranslate(inputText.trim());
          }
        };

        recognition.start();
        recognitionRef.current = recognition;
        return;
      } catch (err) {
        console.warn("Web Speech API initialization fallback to MediaRecorder:", err);
      }
    }

    // Fallback: Browser MediaRecorder + Backend Speech Recognition
    startMediaRecorderFallback();
  }

  function stopListening() {
    if (recognitionRef.current && isSpeechRecognizingRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setRecording(false);
      isSpeechRecognizingRef.current = false;
      setListeningStatus("");
      return;
    }

    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      setListeningStatus("");
    }
  }

  async function startMediaRecorderFallback() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        stream.getTracks().forEach((track) => track.stop());

        setTranslating(true);
        setListeningStatus("Transcribing speech via backend AI...");
        try {
          const sttRes = await api.voice.stt(audioBlob, sourceLang);
          if (sttRes.transcribed_text) {
            setInputText(sttRes.transcribed_text);
            await handleTranslate(sttRes.transcribed_text);
          } else {
            setErrorMessage("Could not transcribe speech. Please try speaking again.");
          }
        } catch (err: any) {
          setErrorMessage(err.message || "Speech transcription failed.");
        } finally {
          setTranslating(false);
          setListeningStatus("");
        }
      };

      mediaRecorder.start();
      setRecording(true);
    } catch (err) {
      console.error("Microphone access error:", err);
      setErrorMessage("Microphone access denied or unavailable. Please grant microphone permission in your browser.");
      setListeningStatus("");
    }
  }

  // 2. Real Human Speech Audio Playback
  async function handlePlayAudio(text: string, lang: string) {
    setSynthesizing(true);

    // Extract phonetic Roman text for Ol Chiki if formatted as "ᱫᱟᱜ (Dak)"
    let textToSpeak = text;
    const parenMatch = text.match(/\(([^)]+)\)/);
    if (parenMatch && parenMatch[1]) {
      textToSpeak = parenMatch[1]; // Use Roman phonetics for clear pronunciation
    }

    try {
      // First try backend real gTTS speech synthesis
      const synthRes = await api.voice.synthesize({
        text: textToSpeak,
        target_language: lang === "sat" ? "hi" : lang,
        section_name: "translation_playback",
      });

      if (synthRes.stream_url) {
        if (currentAudioRef.current) {
          currentAudioRef.current.pause();
        }
        const audio = new Audio(synthRes.stream_url);
        currentAudioRef.current = audio;
        audio.onended = () => setSynthesizing(false);
        audio.onerror = () => {
          // If server audio fails to load, use browser speech synthesis
          fallbackBrowserSpeech(textToSpeak, lang);
        };
        await audio.play();
        return;
      }
    } catch (err) {
      console.warn("Backend TTS failed, using browser speech synthesis:", err);
      fallbackBrowserSpeech(textToSpeak, lang);
    }
  }

  function fallbackBrowserSpeech(textToSpeak: string, lang: string) {
    const voiceLang = lang === "en" ? "en-IN" : "hi-IN";
    speak(textToSpeak, voiceLang, () => setSynthesizing(false));
  }

  function swapLanguages() {
    const prevSource = sourceLang;
    setSourceLang(targetLang === "sat" ? "hi" : targetLang);
    setTargetLang(prevSource);
    setResult(null);
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Language Pair Selector */}
      <div className="bg-white border border-gray-200/80 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex-1 min-w-[140px]">
          <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">
            {t("translate_source_lang")}
          </label>
          <select
            value={sourceLang}
            onChange={(e) => setSourceLang(e.target.value)}
            className="w-full text-xs font-semibold text-ink bg-gray-50 border border-gray-200 rounded-lg p-2 outline-none focus:border-emerald"
          >
            {languages.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={swapLanguages}
          aria-label="Swap languages"
          className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors cursor-pointer self-end mb-0.5"
        >
          <ArrowLeftRight className="w-4 h-4 text-gray-600" />
        </button>

        <div className="flex-1 min-w-[140px]">
          <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">
            {t("translate_target_lang")}
          </label>
          <select
            value={targetLang}
            onChange={(e) => {
              setTargetLang(e.target.value);
              const found = languages.find((l) => l.code === e.target.value);
              setTargetDialect(found?.dialect || "");
            }}
            className="w-full text-xs font-semibold text-emerald-950 bg-emerald-50 border border-emerald-200 rounded-lg p-2 outline-none focus:border-emerald"
          >
            {languages.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error alert */}
      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Input Text & Voice Box */}
      <div className="bg-white border border-gray-200/80 rounded-xl p-5 space-y-4 shadow-xs">
        <textarea
          rows={3}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={t("translate_input_placeholder")}
          className="w-full text-sm text-ink placeholder:text-gray-400 outline-none resize-none border-b border-gray-100 pb-2"
        />

        {listeningStatus && (
          <div className="text-xs font-medium text-emerald-700 bg-emerald-50 p-2 rounded border border-emerald-200 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>{listeningStatus}</span>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-1">
          <button
            type="button"
            onClick={recording ? stopListening : startListening}
            className={cn(
              "px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all select-none cursor-pointer",
              recording
                ? "bg-rose-500 hover:bg-rose-600 text-white ring-4 ring-rose-100 scale-105 animate-pulse"
                : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200"
            )}
          >
            {recording ? (
              <>
                <Square className="w-4 h-4 fill-white" />
                <span>{t("translate_stop_listening")}</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4 text-emerald-600" />
                <span>{t("translate_start_listening")}</span>
              </>
            )}
          </button>

          <Button
            onClick={() => handleTranslate()}
            disabled={translating || !inputText.trim()}
            variant="primary"
            size="sm"
            className="text-xs bg-emerald hover:bg-emerald/90 text-white"
          >
            {translating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                <span>{t("loading")}</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5 mr-1.5" />
                <span>{t("translate_btn")}</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Real Translation Results Panel */}
      {result && (
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>{t("translate_result_label")} ({result.targetLang === "sat" ? "ᱥᱟᱱᱛᱟᱲᱤ ᱚᱞ ᱪᱤᱠᱤ" : result.targetLang.toUpperCase()})</span>
            </span>
            <span className="text-[11px] text-emerald-700 font-mono">
              {result.latencyMs}ms
            </span>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-gray-500 font-medium">Source ({result.sourceLang}): {result.originalText}</p>
            <div className="text-2xl font-bold text-emerald-950 leading-relaxed olchiki">
              {result.translatedText}
            </div>
          </div>

          <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between">
            <button
              onClick={() => handlePlayAudio(result.translatedText, result.targetLang)}
              disabled={synthesizing}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-950 bg-white border border-emerald-300 rounded-lg px-3 py-1.5 transition-colors cursor-pointer shadow-xs"
            >
              {synthesizing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                  <span>{t("loading")}</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{t("translate_listen_audio")}</span>
                </>
              )}
            </button>

            {result.appliedGlossaryTerms && result.appliedGlossaryTerms.length > 0 && (
              <span className="text-[11px] text-emerald-800 font-medium">
                {result.appliedGlossaryTerms.length} pedagogical terms aligned
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
