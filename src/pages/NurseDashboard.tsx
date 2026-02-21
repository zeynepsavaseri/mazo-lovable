import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Clock, Users, Activity, Shield, RefreshCw } from "lucide-react";
import type { TriageLevel } from "@/data/types";

interface Submission {
  id: string;
  name: string;
  date_of_birth: string | null;
  gender: string | null;
  chief_complaint: string;
  pain_score: number;
  ai_triage_level: string | null;
  red_flags: string[];
  nurse_decision: string | null;
  created_at: string;
}

export default function NurseDashboard() {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSubmissions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("patient_submissions")
      .select("id, name, date_of_birth, gender, chief_complaint, pain_score, ai_triage_level, red_flags, nurse_decision, created_at")
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

  const handleDecision = async (id: string, decision: "accept" | "override") => {
    const { error } = await supabase
      .from("patient_submissions")
      .update({ nurse_decision: decision })
      .eq("id", id);
    if (error) {
      toast.error("Failed to save decision");
    } else {
      setSubmissions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, nurse_decision: decision } : s))
      );
      toast.success(decision === "accept" ? "AI triage accepted" : "Triage overridden");
    }
  };

  const sortedSubmissions = [...submissions].sort((a, b) => {
    const order: Record<string, number> = { high: 0, moderate: 1, low: 2 };
    return (order[a.ai_triage_level || "low"] ?? 2) - (order[b.ai_triage_level || "low"] ?? 2);
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
          <Card className="card-elevated group overflow-hidden relative">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-triage-high-bg ring-1 ring-triage-high/10 transition-all duration-200 group-hover:ring-triage-high/20 group-hover:scale-105">
                <AlertTriangle className="h-5 w-5 text-triage-high" strokeWidth={2} />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground tracking-wide uppercase">High Priority</p>
                <p className="text-2xl font-bold tracking-tight text-foreground">{highCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="card-elevated group overflow-hidden relative">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-triage-moderate-bg ring-1 ring-triage-moderate/10 transition-all duration-200 group-hover:ring-triage-moderate/20 group-hover:scale-105">
                <Shield className="h-5 w-5 text-triage-moderate" strokeWidth={2} />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground tracking-wide uppercase">Moderate</p>
                <p className="text-2xl font-bold tracking-tight text-foreground">{moderateCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="card-elevated group overflow-hidden relative">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent ring-1 ring-primary/10 transition-all duration-200 group-hover:ring-primary/20 group-hover:scale-105">
                <Clock className="h-5 w-5 text-primary" strokeWidth={2} />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground tracking-wide uppercase">Avg. Wait</p>
                <p className="text-2xl font-bold tracking-tight text-foreground">{avgWait} min</p>
              </div>
            </CardContent>
          </Card>
          <Card className="card-elevated group overflow-hidden relative">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent ring-1 ring-primary/10 transition-all duration-200 group-hover:ring-primary/20 group-hover:scale-105">
                <Users className="h-5 w-5 text-primary" strokeWidth={2} />
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
                <Activity className="h-3.5 w-3.5 text-primary" strokeWidth={2.5} />
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
                        {sub.nurse_decision ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
                            <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.5} />
                            {sub.nurse_decision === "accept" ? "Accepted" : "Overridden"}
                          </span>
                        ) : (
                          <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => handleDecision(sub.id, "accept")}>
                              Accept
                            </Button>
                            <Button size="sm" variant="secondary" className="h-8 text-xs" onClick={() => handleDecision(sub.id, "override")}>
                              Override
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
