import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "emerald" | "amber" | "slate" | "neutral";

const toneStyles: Record<Tone, string> = {
  emerald: "bg-emerald-50 text-emerald-800 border-emerald-200/60",
  amber: "bg-amber-50 text-amber-900 border-amber-200/60",
  slate: "bg-slate-50 text-slate-700 border-slate-200/60",
  neutral: "bg-gray-100 text-gray-700 border-gray-200/60",
};

export function Badge({
  className,
  tone = "neutral",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium tracking-tight",
        toneStyles[tone],
        className
      )}
      {...props}
    />
  );
}
