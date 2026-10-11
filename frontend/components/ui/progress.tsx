import { cn } from "@/lib/utils";

export function Progress({
  value,
  className,
  tone = "emerald",
}: {
  value: number;
  className?: string;
  tone?: "emerald" | "amber" | "slate";
}) {
  const toneBg = {
    emerald: "bg-emerald",
    amber: "bg-amber",
    slate: "bg-slateblue",
  }[tone];

  return (
    <div className={cn("h-2.5 w-full rounded-full bg-ink/8 overflow-hidden", className)}>
      <div
        className={cn("h-full rounded-full transition-all", toneBg)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  );
}
