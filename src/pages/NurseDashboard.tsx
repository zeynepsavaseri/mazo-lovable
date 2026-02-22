import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertTriangle, Clock, Users, Shield, RefreshCw, Activity } from "lucide-react";
import { DuotoneIcon } from "@/components/DuotoneIcon";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { SortablePatientRow, type Submission } from "@/components/SortablePatientRow";

export default function NurseDashboard() {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSubmissions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("patient_submissions")
      .select("id, name, date_of_birth, gender, chief_complaint, pain_score, ai_triage_level, ai_summary, red_flags, risk_signals, triggered_by, confidence_level, risk_score, nurse_decision, status, created_at, queue_order")
      .eq("status", "waiting")
      .order("queue_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Failed to load patient submissions");
      console.error(error);
    } else {
      setSubmissions(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchSubmissions(); }, []);

  const getWaitMinutes = (createdAt: string) =>
    Math.round((Date.now() - new Date(createdAt).getTime()) / 60000);

  const getAge = (dob: string | null) => {
    if (!dob) return null;
    return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  };

  const highCount = submissions.filter((s) => s.ai_triage_level === "high").length;
  const moderateCount = submissions.filter((s) => s.ai_triage_level === "moderate").length;
  const pendingCount = submissions.filter((s) => !s.nurse_decision).length;
  const avgWait = submissions.length > 0
    ? Math.round(submissions.reduce((sum, s) => sum + getWaitMinutes(s.created_at), 0) / submissions.length)
    : 0;

  const persistOrder = useCallback(async (newList: Submission[]) => {
    const updates = newList.map((s, i) => ({ id: s.id, queue_order: i }));
    for (const u of updates) {
      await supabase.from("patient_submissions").update({ queue_order: u.queue_order }).eq("id", u.id);
    }
  }, []);

  const handleAccept = async (id: string) => {
    const { error } = await supabase
      .from("patient_submissions")
      .update({ nurse_decision: "accept", status: "in_treatment" })
      .eq("id", id);
    if (error) {
      toast.error("Failed to save decision");
    } else {
      setSubmissions((prev) => prev.filter((s) => s.id !== id));
      toast.success("Patient is now in care — removed from queue");
    }
  };

  const handleMoveUp = (id: string) => {
    setSubmissions((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx <= 0) return prev;
      const next = arrayMove(prev, idx, idx - 1);
      persistOrder(next);
      return next;
    });
  };

  const handleMoveDown = (id: string) => {
    setSubmissions((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx < 0 || idx >= prev.length - 1) return prev;
      const next = arrayMove(prev, idx, idx + 1);
      persistOrder(next);
      return next;
    });
  };

  const handleSetOrder = (id: string, newPos: number) => {
    setSubmissions((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx < 0) return prev;
      const targetIdx = Math.max(0, Math.min(newPos - 1, prev.length - 1));
      const next = arrayMove(prev, idx, targetIdx);
      persistOrder(next);
      return next;
    });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSubmissions((prev) => {
      const oldIdx = prev.findIndex((s) => s.id === active.id);
      const newIdx = prev.findIndex((s) => s.id === over.id);
      const next = arrayMove(prev, oldIdx, newIdx);
      persistOrder(next);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-8 space-y-8 animate-slide-in">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">Review AI-structured patient summaries and manage the queue.</p>
          </div>
          <Button variant="outline" size="sm" className="gap-2 text-xs font-medium" onClick={fetchSubmissions}>
            <RefreshCw className="h-3.5 w-3.5" strokeWidth={2.5} />
            Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="card-elevated overflow-hidden relative">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-triage-high-bg ring-1 ring-triage-high/10">
                <DuotoneIcon icon={AlertTriangle} className="h-5 w-5 text-triage-high" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground tracking-wide uppercase">High Priority</p>
                <p className="text-2xl font-bold tracking-tight text-foreground">{highCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="card-elevated overflow-hidden relative">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-triage-moderate-bg ring-1 ring-triage-moderate/10">
                <DuotoneIcon icon={Shield} className="h-5 w-5 text-triage-moderate" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground tracking-wide uppercase">Moderate</p>
                <p className="text-2xl font-bold tracking-tight text-foreground">{moderateCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="card-elevated overflow-hidden relative">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent ring-1 ring-primary/10">
                <DuotoneIcon icon={Clock} className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground tracking-wide uppercase">Avg. Wait</p>
                <p className="text-2xl font-bold tracking-tight text-foreground">{avgWait} min</p>
              </div>
            </CardContent>
          </Card>
          <Card className="card-elevated overflow-hidden relative">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent ring-1 ring-primary/10">
                <DuotoneIcon icon={Users} className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground tracking-wide uppercase">Pending</p>
                <p className="text-2xl font-bold tracking-tight text-foreground">{pendingCount}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Patient Table */}
        <Card className="card-elevated overflow-hidden">
          <CardHeader className="pb-4 border-b border-border/50">
            <CardTitle className="flex items-center gap-2.5 text-base font-semibold">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                <DuotoneIcon icon={Activity} className="h-3.5 w-3.5 text-primary" />
              </div>
              Patient Queue
              <span className="ml-auto text-xs font-normal text-muted-foreground">Drag rows, use arrows, or click position numbers to reorder</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <p className="py-12 text-center text-muted-foreground text-sm">Loading submissions...</p>
            ) : submissions.length === 0 ? (
              <p className="py-12 text-center text-muted-foreground text-sm">No patient submissions yet.</p>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="font-semibold text-xs uppercase tracking-wider w-16">#</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider">Patient</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider">AI Flag</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider">Red Flags</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider">Waiting</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider">Pain</TableHead>
                      <TableHead className="text-right font-semibold text-xs uppercase tracking-wider">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <SortableContext items={submissions.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                    <TableBody>
                      {submissions.map((sub, idx) => (
                        <SortablePatientRow
                          key={sub.id}
                          sub={sub}
                          index={idx}
                          total={submissions.length}
                          onAccept={handleAccept}
                          onMoveUp={handleMoveUp}
                          onMoveDown={handleMoveDown}
                          onSetOrder={handleSetOrder}
                          onNavigate={(id) => navigate(`/patient/${id}`)}
                          getWaitMinutes={getWaitMinutes}
                          getAge={getAge}
                        />
                      ))}
                    </TableBody>
                  </SortableContext>
                </Table>
              </DndContext>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
