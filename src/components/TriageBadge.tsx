import { TriageLevel } from "@/data/types";
import { cn } from "@/lib/utils";

interface TriageBadgeProps {
  level: TriageLevel;
  className?: string;
}

const config: Record<TriageLevel, { label: string; dotClass: string; bgClass: string; textClass: string }> = {
  high: {
    label: "High",
    dotClass: "bg-triage-high",
    bgClass: "bg-triage-high-bg",
    textClass: "text-triage-high",
  },
  moderate: {
    label: "Moderate",
    dotClass: "bg-triage-moderate",
    bgClass: "bg-triage-moderate-bg",
    textClass: "text-triage-moderate",
  },
  low: {
    label: "Low",
    dotClass: "bg-triage-low",
    bgClass: "bg-triage-low-bg",
    textClass: "text-triage-low",
  },
};

export function TriageBadge({ level, className }: TriageBadgeProps) {
  const c = config[level];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium",
        c.bgClass,
        c.textClass,
        className
      )}
    >
      <span className={cn("h-2 w-2 rounded-full", c.dotClass)} />
      {c.label}
    </span>
  );
}
