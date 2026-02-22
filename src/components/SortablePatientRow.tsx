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

export interface Submission {
  id: string;
  name: string;
  date_of_birth: string | null;
  gender: string | null;
  chief_complaint: string;
  pain_score: number;
  ai_triage_level: string | null;
  red_flags: string[];
  nurse_decision: string | null;
  status: string;
  created_at: string;
  queue_order: number | null;
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

export function SortablePatientRow({
  sub, index, total, onAccept, onMoveUp, onMoveDown, onSetOrder, onNavigate, getWaitMinutes, getAge,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: sub.id });
  const [editingOrder, setEditingOrder] = useState(false);
  const [orderInput, setOrderInput] = useState("");

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
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
      <TableCell>
        {sub.ai_triage_level ? (
          <TriageBadge level={sub.ai_triage_level as TriageLevel} />
        ) : (
          <span className="text-xs text-muted-foreground italic">Pending</span>
        )}
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
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            disabled={index === 0}
            onClick={() => onMoveUp(sub.id)}
            title="Move up"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            disabled={index === total - 1}
            onClick={() => onMoveDown(sub.id)}
            title="Move down"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs ml-1" onClick={() => onAccept(sub.id)}>
            Patient in Care
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
