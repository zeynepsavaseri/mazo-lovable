import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { AppHeader } from "@/components/AppHeader";
import { TriageBadge } from "@/components/TriageBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Clock, Users, Activity, Shield, RefreshCw } from "lucide-react";
import { DuotoneIcon } from "@/components/DuotoneIcon";
import type { TriageLevel } from "@/data/types";

interface Submission {
  id: string;
  name: string;
  date_of_birth: string | null;
  gender: string | null;
  chief_complaint: string;
  pain_score: number;
  ai_triage_level: string | null;
  acuity_score: number | null;
  red_flags: string[];
  nurse_decision: string | null;
  status: string;
  created_at: string;
}

export default function NurseDashboard() {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [overrideTarget, setOverrideTarget] = useState<Submission | null>(null);
  const [overrideLevel, setOverrideLevel] = useState<TriageLevel>("moderate");

  const fetchSubmissions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("patient_submissions")
      .select("id, name, date_of_birth, gender, chief_complaint, pain_score, ai_triage_level, acuity_score, red_flags, nurse_decision, status, created_at")
      .eq("status", "waiting")
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

  const getWaitMinutes = (createdAt: string) => {
    return Math.round((Date.now() - new Date(createdAt).getTime()) / 60000);
  };

  const getAge = (dob: string | null) => {
    if (!dob) return null;
    const diff = Date.now() - new Date(dob).getTime();
    return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
  };

  const highCount = submissions.filter((s) => s.ai_triage_level === "high").length;
  const moderateCount = submissions.filter((s) => s.ai_triage_level === "moderate").length;
  const pendingCount = submissions.filter((s) => !s.nurse_decision).length;
  const avgWait = submissions.length > 0
    ? Math.round(submissions.reduce((sum, s) => sum + getWaitMinutes(s.created_at), 0) / submissions.length)
    : 0;

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

  const handleOverrideConfirm = async () => {
    if (!overrideTarget) return;
    const { error } = await supabase
      .from("patient_submissions")
      .update({
        nurse_decision: "override",
        ai_triage_level: overrideLevel,
        status: "in_treatment",
      })
      .eq("id", overrideTarget.id);
    if (error) {
      toast.error("Failed to save override");
    } else {
      setSubmissions((prev) => prev.filter((s) => s.id !== overrideTarget.id));
      toast.success(`Triage overridden to ${overrideLevel} — moved to treatment`);
    }
    setOverrideTarget(null);
  };

  const sortedSubmissions = [...submissions].sort((a, b) => {
    const order: Record<string, number> = { high: 0, moderate: 1, low: 2 };
    const levelDiff = (order[a.ai_triage_level || "low"] ?? 2) - (order[b.ai_triage_level || "low"] ?? 2);
    if (levelDiff !== 0) return levelDiff;
    return (b.acuity_score ?? 0) - (a.acuity_score ?? 0);
  });

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-8 space-y-8 animate-slide-in">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">Review AI-structured patient summaries and assign triage levels.</p>
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
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <p className="py-12 text-center text-muted-foreground text-sm">Loading submissions...</p>
            ) : submissions.length === 0 ? (
              <p className="py-12 text-center text-muted-foreground text-sm">No patient submissions yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                     <TableHead className="font-semibold text-xs uppercase tracking-wider">Patient</TableHead>
                     <TableHead className="font-semibold text-xs uppercase tracking-wider">AI Flag</TableHead>
                     <TableHead className="font-semibold text-xs uppercase tracking-wider">Acuity</TableHead>
                     <TableHead className="font-semibold text-xs uppercase tracking-wider">Red Flags</TableHead>
                     <TableHead className="font-semibold text-xs uppercase tracking-wider">Waiting</TableHead>
                     <TableHead className="font-semibold text-xs uppercase tracking-wider">Pain</TableHead>
                    <TableHead className="text-right font-semibold text-xs uppercase tracking-wider">Decision</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedSubmissions.map((sub) => (
                    <TableRow
                      key={sub.id}
                      className="cursor-pointer transition-colors duration-150 hover:bg-muted/40"
                      onClick={() => navigate(`/patient/${sub.id}`)}
                    >
                      <TableCell>
                        <div>
                          <p className="font-semibold text-foreground">{sub.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {getAge(sub.date_of_birth) ? `${getAge(sub.date_of_birth)}y` : ""} {sub.gender || ""}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {sub.ai_triage_level ? (
                          <TriageBadge level={sub.ai_triage_level as TriageLevel} />
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Pending</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {sub.acuity_score != null ? (
                          <div className="flex items-center gap-2">
                            <div className="relative h-2 w-16 rounded-full bg-muted overflow-hidden">
                              <div
                                className={cn(
                                  "absolute inset-y-0 left-0 rounded-full transition-all",
                                  sub.acuity_score >= 80 ? "bg-triage-high" :
                                  sub.acuity_score >= 50 ? "bg-triage-moderate" : "bg-triage-low"
                                )}
                                style={{ width: `${sub.acuity_score}%` }}
                              />
                            </div>
                            <span className={cn(
                              "text-sm font-bold tabular-nums",
                              sub.acuity_score >= 80 ? "text-triage-high" :
                              sub.acuity_score >= 50 ? "text-triage-moderate" : "text-triage-low"
                            )}>
                              {sub.acuity_score}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">—</span>
                        )}
                      </TableCell>
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
                      <TableCell>
                        <span className="font-semibold tabular-nums">{getWaitMinutes(sub.created_at)} min</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold tabular-nums">{sub.pain_score}/10</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => handleAccept(sub.id)}>
                            Patient in Care
                          </Button>
                          <Button size="sm" variant="secondary" className="h-8 text-xs" onClick={() => {
                            setOverrideTarget(sub);
                            setOverrideLevel((sub.ai_triage_level as TriageLevel) || "moderate");
                          }}>
                            Override
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Override Dialog */}
        <Dialog open={!!overrideTarget} onOpenChange={(open) => !open && setOverrideTarget(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Override Triage Level</DialogTitle>
              <DialogDescription>
                Select the correct triage level for <strong>{overrideTarget?.name}</strong>.
                Current AI assessment: <strong>{overrideTarget?.ai_triage_level || "none"}</strong>.
              </DialogDescription>
            </DialogHeader>
            <RadioGroup value={overrideLevel} onValueChange={(v) => setOverrideLevel(v as TriageLevel)} className="space-y-3 py-2">
              {(["high", "moderate", "low"] as TriageLevel[]).map((level) => (
                <label
                  key={level}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted has-[button[data-state=checked]]:border-primary has-[button[data-state=checked]]:bg-accent"
                >
                  <RadioGroupItem value={level} />
                  <TriageBadge level={level} />
                  <span className="text-sm font-medium capitalize">{level} Priority</span>
                </label>
              ))}
            </RadioGroup>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOverrideTarget(null)}>Cancel</Button>
              <Button onClick={handleOverrideConfirm}>Confirm Override</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
