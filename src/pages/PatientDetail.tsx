import { useParams, useNavigate } from "react-router-dom";
import { AppHeader } from "@/components/AppHeader";
import { TriageBadge } from "@/components/TriageBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockPatients } from "@/data/mockPatients";
import {
  ArrowLeft,
  AlertTriangle,
  Brain,
  Heart,
  Pill,
  Activity,
  Clock,
  HelpCircle,
  Thermometer,
} from "lucide-react";

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const patient = mockPatients.find((p) => p.id === id);

  if (!patient) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="container py-16 text-center">
          <p className="text-muted-foreground">Patient not found.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/")}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container max-w-4xl py-8 animate-slide-in">
        <Button
          variant="ghost"
          className="mb-6 gap-2 text-muted-foreground hover:text-foreground"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>

        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">{patient.name}</h1>
            <p className="mt-1 text-muted-foreground">
              {patient.age} years old · {patient.gender} · Waiting {patient.timeWaiting} min
            </p>
          </div>
          <TriageBadge level={patient.aiTriageLevel} className="text-base" />
        </div>

        <div className="space-y-6">
          {/* AI Summary */}
          <Card className="border-primary/20 bg-accent/30">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Brain className="h-5 w-5 text-primary" />
                AI-Structured Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="leading-relaxed text-foreground">{patient.aiSummary}</p>
            </CardContent>
          </Card>

          {/* Red Flags & Risk Signals */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <AlertTriangle className="h-5 w-5 text-triage-high" />
                  Red Flags
                </CardTitle>
              </CardHeader>
              <CardContent>
                {patient.redFlags.length > 0 ? (
                  <ul className="space-y-2">
                    {patient.redFlags.map((flag) => (
                      <li
                        key={flag}
                        className="flex items-start gap-2 rounded-lg bg-triage-high-bg p-3 text-sm font-medium text-triage-high"
                      >
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        {flag}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No red flags detected</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Activity className="h-5 w-5 text-triage-moderate" />
                  Risk Signals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {patient.riskSignals.map((signal) => (
                    <li
                      key={signal}
                      className="flex items-start gap-2 rounded-lg bg-triage-moderate-bg p-3 text-sm font-medium text-triage-moderate"
                    >
                      <Activity className="mt-0.5 h-4 w-4 shrink-0" />
                      {signal}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Missing Questions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <HelpCircle className="h-5 w-5 text-primary" />
                Missing Critical Questions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {patient.missingQuestions.map((q) => (
                  <Badge key={q} variant="outline" className="text-sm">
                    {q}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Vitals */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Thermometer className="h-5 w-5 text-primary" />
                Vital Signs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  { label: "Heart Rate", value: `${patient.vitalSigns.heartRate} bpm`, warn: patient.vitalSigns.heartRate > 100 },
                  { label: "Blood Pressure", value: patient.vitalSigns.bloodPressure, warn: false },
                  { label: "Temperature", value: `${patient.vitalSigns.temperature}°F`, warn: patient.vitalSigns.temperature > 100.4 },
                  { label: "SpO₂", value: `${patient.vitalSigns.oxygenSat}%`, warn: patient.vitalSigns.oxygenSat < 95 },
                ].map((v) => (
                  <div
                    key={v.label}
                    className={`rounded-xl border p-4 text-center ${
                      v.warn ? "border-triage-high/30 bg-triage-high-bg" : "border-border bg-card"
                    }`}
                  >
                    <p className="text-sm text-muted-foreground">{v.label}</p>
                    <p className={`mt-1 text-xl font-bold ${v.warn ? "text-triage-high" : "text-foreground"}`}>
                      {v.value}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Details grid */}
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="h-5 w-5 text-primary" />
                  Complaint
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-foreground">{patient.chiefComplaint}</p>
                <p className="text-muted-foreground">Onset: {patient.symptomOnset}</p>
                <p className="text-muted-foreground">Pain: {patient.painScore}/10</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Heart className="h-5 w-5 text-primary" />
                  History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {patient.medicalHistory.length > 0 ? (
                    patient.medicalHistory.map((h) => (
                      <Badge key={h} variant="secondary" className="text-xs">
                        {h}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">None reported</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Pill className="h-5 w-5 text-primary" />
                  Medications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm">
                  {patient.medications.length > 0 ? (
                    patient.medications.map((m) => (
                      <li key={m} className="text-foreground">{m}</li>
                    ))
                  ) : (
                    <li className="text-muted-foreground">None reported</li>
                  )}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
