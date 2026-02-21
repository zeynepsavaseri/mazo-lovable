import { useState } from "react";
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
import { mockPatients } from "@/data/mockPatients";
import { Patient } from "@/data/types";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Clock, Users, Activity, Shield } from "lucide-react";

export default function NurseDashboard() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>(mockPatients);

  const highCount = patients.filter((p) => p.aiTriageLevel === "high").length;
  const moderateCount = patients.filter((p) => p.aiTriageLevel === "moderate").length;
  const pendingCount = patients.filter((p) => p.nurseDecision === null).length;
  const avgWait = Math.round(patients.reduce((s, p) => s + p.timeWaiting, 0) / patients.length);

  const handleDecision = (id: string, decision: "accept" | "override") => {
    setPatients((prev) =>
      prev.map((p) => (p.id === id ? { ...p, nurseDecision: decision } : p))
    );
    toast.success(
      decision === "accept"
        ? "AI triage accepted"
        : "Triage overridden – please assign new level"
    );
  };

  const sortedPatients = [...patients].sort((a, b) => {
    const order = { high: 0, moderate: 1, low: 2 };
    return order[a.aiTriageLevel] - order[b.aiTriageLevel];
  });

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-8 animate-slide-in">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground">Nurse Triage Dashboard</h1>
          <p className="mt-1.5 text-muted-foreground">Review AI-structured patient summaries and assign triage levels.</p>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-triage-high-bg">
                <AlertTriangle className="h-6 w-6 text-triage-high" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">High Priority</p>
                <p className="text-2xl font-bold text-foreground">{highCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-triage-moderate-bg">
                <Shield className="h-6 w-6 text-triage-moderate" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Moderate</p>
                <p className="text-2xl font-bold text-foreground">{moderateCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg. Wait</p>
                <p className="text-2xl font-bold text-foreground">{avgWait} min</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Review</p>
                <p className="text-2xl font-bold text-foreground">{pendingCount}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Patient Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Patient Queue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>AI Flag</TableHead>
                  <TableHead>Red Flags</TableHead>
                  <TableHead>Time Waiting</TableHead>
                  <TableHead>Pain</TableHead>
                  <TableHead className="text-right">Nurse Decision</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedPatients.map((patient) => (
                  <TableRow
                    key={patient.id}
                    className="cursor-pointer transition-colors hover:bg-muted/50"
                    onClick={() => navigate(`/patient/${patient.id}`)}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">{patient.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {patient.age}y {patient.gender}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <TriageBadge level={patient.aiTriageLevel} />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {patient.redFlags.length > 0 ? (
                          patient.redFlags.slice(0, 2).map((f) => (
                            <span
                              key={f}
                              className="inline-block rounded-md bg-triage-high-bg px-2 py-0.5 text-xs font-medium text-triage-high"
                            >
                              {f}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">None</span>
                        )}
                        {patient.redFlags.length > 2 && (
                          <span className="text-xs text-muted-foreground">+{patient.redFlags.length - 2}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{patient.timeWaiting} min</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{patient.painScore}/10</span>
                    </TableCell>
                    <TableCell className="text-right">
                      {patient.nurseDecision ? (
                        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                          <CheckCircle2 className="h-4 w-4" />
                          {patient.nurseDecision === "accept" ? "Accepted" : "Overridden"}
                        </span>
                      ) : (
                        <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDecision(patient.id, "accept")}
                          >
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleDecision(patient.id, "override")}
                          >
                            Override
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
