import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { TriageBadge } from "@/components/TriageBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";
import { GripVertical, ArrowUp, ArrowDown } from "lucide-react";
import type { TriageLevel } from "@/data/types";
import { useState } from "react";
import { riskColor, riskLabel, riskBgColor } from "@/lib/riskScore";


export interface Submission {
  id: string;
  name: string;
  date_of_birth: string | null;
  gender: string | null;
  chief_complaint: string;
  pain_score: number;
  ai_triage_level: string | null;
  ai_summary: string | null;
  red_flags: string[];
  risk_signals: string[];
  triggered_by: string[];
  confidence_level: string | null;
  nurse_decision: string | null;
  status: string;
  created_at: string;
  queue_order: number | null;
  risk_score: number | null;
}

interface Props {
  sub: Submission;
  index: number;
  total: number;
  onAccept: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onSetOrder: (id: string, order: number) => void;
  onNavigate: (id: string) => void;
  getWaitMinutes: (createdAt: string) => number;
  getAge: (dob: string | null) => number | null;
}

const confidenceColor = (level: string | null) => {
  if (level === "high") return "text-triage-high";
  if (level === "moderate") return "text-triage-moderate";
  return "text-muted-foreground";
};

export function SortablePatientRow({
  sub, index, total, onAccept, onMoveUp, onMoveDown, onSetOrder, onNavigate, getWaitMinutes, getAge,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: sub.id });
  const [editingOrder, setEditingOrder] = useState(false);
  const [orderInput, setOrderInput] = useState("");
  const [showDetail, setShowDetail] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <>
      <TableRow
        ref={setNodeRef}
        style={style}
        className={cn(
          "cursor-pointer transition-colors duration-150 hover:bg-muted/40",
          isDragging && "bg-accent shadow-lg ring-2 ring-primary/20 rounded-lg"
        )}
        onClick={() => onNavigate(sub.id)}
      >
        {/* Drag handle + position */}
        <TableCell className="w-16" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1.5">
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Drag to reorder"
            >
              <GripVertical className="h-4 w-4" />
            </button>
            {editingOrder ? (
              <Input
                autoFocus
                type="number"
                min={1}
                max={total}
                className="h-7 w-12 text-xs text-center p-0"
                value={orderInput}
                onChange={(e) => setOrderInput(e.target.value)}
                onBlur={() => {
                  const n = parseInt(orderInput);
                  if (n >= 1 && n <= total) onSetOrder(sub.id, n);
                  setEditingOrder(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const n = parseInt(orderInput);
                    if (n >= 1 && n <= total) onSetOrder(sub.id, n);
                    setEditingOrder(false);
                  }
                  if (e.key === "Escape") setEditingOrder(false);
                }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <button
                className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-xs font-bold tabular-nums hover:bg-primary/10 hover:text-primary transition-colors"
                title="Click to set position"
                onClick={(e) => {
                  e.stopPropagation();
                  setOrderInput(String(index + 1));
                  setEditingOrder(true);
                }}
              >
                {index + 1}
              </button>
            )}
          </div>
        </TableCell>

        {/* Patient info */}
        <TableCell>
          <div>
            <p className="font-semibold text-foreground">{sub.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {getAge(sub.date_of_birth) ? `${getAge(sub.date_of_birth)}y` : ""} {sub.gender || ""}
            </p>
          </div>
        </TableCell>

        {/* AI Flag */}
        <TableCell onClick={(e) => { e.stopPropagation(); setShowDetail(!showDetail); }}>
          <div className="space-y-1 cursor-pointer">
            {sub.ai_triage_level ? (
              <TriageBadge level={sub.ai_triage_level as TriageLevel} />
            ) : (
              <span className="text-xs text-muted-foreground italic">Pending</span>
            )}
            {sub.confidence_level && (
              <p className={cn("text-xs font-medium", confidenceColor(sub.confidence_level))}>
                {sub.confidence_level} confidence
              </p>
            )}
            {sub.triggered_by && sub.triggered_by.length > 0 && (
              <p className="text-xs text-muted-foreground">
                ↳ {sub.triggered_by.slice(0, 2).join(", ")}
                {sub.triggered_by.length > 2 && ` +${sub.triggered_by.length - 2}`}
              </p>
            )}
            {/* ADD THIS */}
            {sub.risk_score !== null && sub.risk_score !== undefined && (
              <div className="mt-1.5 w-24">
                <div className="flex justify-between items-center mb-0.5">
                  <span className={cn("text-xs font-bold tabular-nums", riskColor(sub.risk_score))}>
                    {sub.risk_score}/100
                  </span>
                  <span className={cn("text-xs font-medium", riskColor(sub.risk_score))}>
                    {riskLabel(sub.risk_score)}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", riskBgColor(sub.risk_score))}
                    style={{ width: `${sub.risk_score}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </TableCell>

        {/* Red Flags */}
        <TableCell>
          <div className="flex flex-wrap gap-1">
            {sub.red_flags && sub.red_flags.length > 0 ? (
              sub.red_flags.slice(0, 2).map((f) => (
                <span key={f} className="inline-block rounded-md bg-triage-high-bg px-2 py-0.5 text-xs font-medium text-triage-high ring-1 ring-triage-high/10">
                  {f}
                </span>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            )}
            {sub.red_flags && sub.red_flags.length > 2 && (
              <span className="text-xs text-muted-foreground">+{sub.red_flags.length - 2}</span>
            )}
          </div>
        </TableCell>

        {/* Waiting */}
        <TableCell>
          <span className="font-semibold tabular-nums">{getWaitMinutes(sub.created_at)} min</span>
        </TableCell>

        {/* Pain */}
        <TableCell>
          <span className="font-semibold tabular-nums">{sub.pain_score}/10</span>
        </TableCell>

        {/* Actions */}
        <TableCell className="text-right">
          <div className="flex justify-end items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Button size="icon" variant="ghost" className="h-7 w-7" disabled={index === 0} onClick={() => onMoveUp(sub.id)} title="Move up">
              <ArrowUp className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" disabled={index === total - 1} onClick={() => onMoveDown(sub.id)} title="Move down">
              <ArrowDown className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs ml-1" onClick={() => onAccept(sub.id)}>
              Patient in Care
            </Button>
          </div>
        </TableCell>
      </TableRow>

      {/* Expandable AI detail row */}
      {showDetail && (
        <TableRow className="bg-muted/20 hover:bg-muted/20">
          <TableCell colSpan={7} className="py-3 px-6">
            <div className="grid grid-cols-3 gap-4 text-xs">
              {sub.ai_summary && (
                <div>
                  <p className="font-semibold text-muted-foreground uppercase tracking-wider mb-1">AI Summary</p>
                  <p className="text-foreground leading-relaxed">{sub.ai_summary}</p>
                </div>
              )}
              {sub.triggered_by && sub.triggered_by.length > 0 && (
                <div>
                  <p className="font-semibold text-muted-foreground uppercase tracking-wider mb-1">Triggered By</p>
                  <ul className="space-y-0.5">
                    {sub.triggered_by.map((t) => (
                      <li key={t} className="text-foreground">↳ {t}</li>
                    ))}
                  </ul>
                </div>
              )}
              {sub.risk_signals && sub.risk_signals.length > 0 && (
                <div>
                  <p className="font-semibold text-muted-foreground uppercase tracking-wider mb-1">Risk Signals</p>
                  <ul className="space-y-0.5">
                    {sub.risk_signals.map((r) => (
                      <li key={r} className="text-foreground">{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}