import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppHeader } from "@/components/AppHeader";
import { TriageBadge } from "@/components/TriageBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import type { TriageLevel } from "@/data/types";
import {
  ArrowLeft, AlertTriangle, Brain, Heart, Pill, Activity,
  Clock, HelpCircle, User, Phone, MapPin, Weight, ShieldAlert,
} from "lucide-react";

interface FullSubmission {
  id: string;
  name: string;
  date_of_birth: string | null;
  gender: string | null;
  ethnicity: string | null;
  weight: number | null;
  allergies: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  chief_complaint: string;
  symptom_onset: string | null;
  pain_score: number;
  symptoms: string[];
  medical_history: string[];
  medications: string | null;
  wearable_heart_rate: number | null;
  wearable_sleep: number | null;
  wearable_spo2: number | null;
  wearable_hr_trend: number[] | null;
  wearable_afib_detected: boolean | null;
  wearable_afib_details: string | null;
  previous_visit: boolean;
  ai_triage_level: string | null;
  ai_summary: string | null;
  red_flags: string[];
  risk_signals: string[];
  missing_questions: string[];
  nurse_decision: string | null;
  created_at: string;
}

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<FullSubmission | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data, error } = await supabase
        .from("patient_submissions")
        .select("*")
        .eq("id", id)
        .single();
      if (error || !data) {
        setPatient(null);
      } else {
        setPatient(data as FullSubmission);
      }
      setLoading(false);
    };
    fetch();
  }, [id]);

  const getAge = (dob: string | null) => {
    if (!dob) return null;
    return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  };

  const getWaitMinutes = (createdAt: string) => {
    return Math.round((Date.now() - new Date(createdAt).getTime()) / 60000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="container py-16 text-center">
          <p className="text-muted-foreground">Loading patient details...</p>
        </div>
      </div>
    );
  }

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

  const age = getAge(patient.date_of_birth);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container max-w-4xl py-8 animate-slide-in">
        <Button
          variant="ghost"
          size="sm"
          className="mb-5 gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Dashboard
        </Button>

        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">{patient.name}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {age ? `${age} years old` : ""}{age && patient.gender ? " · " : ""}{patient.gender || ""} · Waiting {getWaitMinutes(patient.created_at)} min
            </p>
          </div>
          {patient.ai_triage_level && (
            <TriageBadge level={patient.ai_triage_level as TriageLevel} className="text-sm" />
          )}
        </div>

        <div className="space-y-6">
          {/* AI Summary */}
          {patient.ai_summary && (
            <Card className="border-primary/20 bg-accent/30">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Brain className="h-5 w-5 text-primary" />
                  AI-Structured Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="leading-relaxed text-foreground">{patient.ai_summary}</p>
              </CardContent>
            </Card>
          )}

          {/* Personal & Contact Info */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5 text-primary" />
                  Personal Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {patient.date_of_birth && <p><span className="text-muted-foreground">DOB:</span> {patient.date_of_birth}</p>}
                {patient.gender && <p><span className="text-muted-foreground">Gender:</span> {patient.gender}</p>}
                {patient.ethnicity && <p><span className="text-muted-foreground">Ethnicity:</span> {patient.ethnicity}</p>}
                {patient.weight && <p><span className="text-muted-foreground">Weight:</span> {patient.weight} kg</p>}
                {patient.allergies && (
                  <p className="flex items-start gap-1">
                    <ShieldAlert className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                    <span><span className="text-muted-foreground">Allergies:</span> {patient.allergies}</span>
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Phone className="h-5 w-5 text-primary" />
                  Contact Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {patient.phone && <p><span className="text-muted-foreground">Phone:</span> {patient.phone}</p>}
                {patient.email && <p><span className="text-muted-foreground">Email:</span> {patient.email}</p>}
                {patient.address && (
                  <p className="flex items-start gap-1">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    {patient.address}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

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
                {patient.red_flags && patient.red_flags.length > 0 ? (
                  <ul className="space-y-2">
                    {patient.red_flags.map((flag) => (
                      <li key={flag} className="flex items-start gap-2 rounded-lg bg-triage-high-bg p-3 text-sm font-medium text-triage-high">
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
                {patient.risk_signals && patient.risk_signals.length > 0 ? (
                  <ul className="space-y-2">
                    {patient.risk_signals.map((signal) => (
                      <li key={signal} className="flex items-start gap-2 rounded-lg bg-triage-moderate-bg p-3 text-sm font-medium text-triage-moderate">
                        <Activity className="mt-0.5 h-4 w-4 shrink-0" />
                        {signal}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No risk signals</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Missing Questions */}
          {patient.missing_questions && patient.missing_questions.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <HelpCircle className="h-5 w-5 text-primary" />
                  Missing Critical Questions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {patient.missing_questions.map((q) => (
                    <Badge key={q} variant="outline" className="text-sm">{q}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

        {/* Wearable Data */}
          {(patient.wearable_heart_rate || patient.wearable_sleep || patient.wearable_spo2 || patient.wearable_afib_detected !== null) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Activity className="h-5 w-5 text-primary" />
                  Wearable Data
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {patient.wearable_heart_rate != null && (
                    <div className="rounded-xl border border-border bg-card p-4 text-center">
                      <p className="text-xs text-muted-foreground">Heart Rate</p>
                      <p className="mt-1 text-xl font-bold text-foreground">{patient.wearable_heart_rate} <span className="text-sm font-normal text-muted-foreground">bpm</span></p>
                    </div>
                  )}
                  {patient.wearable_sleep != null && (
                    <div className="rounded-xl border border-border bg-card p-4 text-center">
                      <p className="text-xs text-muted-foreground">Sleep</p>
                      <p className="mt-1 text-xl font-bold text-foreground">{patient.wearable_sleep} <span className="text-sm font-normal text-muted-foreground">hrs</span></p>
                    </div>
                  )}
                  {patient.wearable_spo2 != null && (
                    <div className="rounded-xl border border-border bg-card p-4 text-center">
                      <p className="text-xs text-muted-foreground">SpO₂</p>
                      <p className="mt-1 text-xl font-bold text-foreground">{patient.wearable_spo2}<span className="text-sm font-normal text-muted-foreground">%</span></p>
                    </div>
                  )}
                  {patient.wearable_afib_detected !== null && (
                    <div className={`rounded-xl border p-4 text-center ${patient.wearable_afib_detected ? "border-destructive/30 bg-destructive/10" : "border-border bg-card"}`}>
                      <p className="text-xs text-muted-foreground">AFib</p>
                      <p className={`mt-1 text-sm font-bold ${patient.wearable_afib_detected ? "text-destructive" : "text-triage-low"}`}>
                        {patient.wearable_afib_detected ? "⚠ Detected" : "✓ Normal"}
                      </p>
                    </div>
                  )}
                </div>

                {/* HR Trend Chart */}
                {patient.wearable_hr_trend && Array.isArray(patient.wearable_hr_trend) && patient.wearable_hr_trend.length > 0 && (
                  <div className="rounded-xl border border-border bg-card p-4">
                    <p className="text-xs text-muted-foreground mb-2 font-medium">Heart Rate Trend (24h)</p>
                    <div className="flex items-end gap-px h-16">
                      {(patient.wearable_hr_trend as number[]).map((val: number, i: number) => {
                        const min = Math.min(...(patient.wearable_hr_trend as number[]));
                        const max = Math.max(...(patient.wearable_hr_trend as number[]));
                        const height = max === min ? 50 : ((val - min) / (max - min)) * 100;
                        return (
                          <div
                            key={i}
                            className="flex-1 rounded-t-sm bg-primary/60"
                            style={{ height: `${Math.max(height, 8)}%` }}
                            title={`${val} bpm`}
                          />
                        );
                      })}
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px] text-muted-foreground">24h ago</span>
                      <span className="text-[10px] text-muted-foreground">Now</span>
                    </div>
                  </div>
                )}

                {/* AFib Details */}
                {patient.wearable_afib_detected && patient.wearable_afib_details && (
                  <div className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3">
                    <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                    <p className="text-sm text-destructive">{patient.wearable_afib_details}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

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
                <p className="text-foreground">{patient.chief_complaint}</p>
                {patient.symptom_onset && <p className="text-muted-foreground">Onset: {patient.symptom_onset}</p>}
                <p className="text-muted-foreground">Pain: {patient.pain_score}/10</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Heart className="h-5 w-5 text-primary" />
                  History & Symptoms
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {patient.medical_history && patient.medical_history.length > 0 ? (
                    patient.medical_history.map((h) => (
                      <Badge key={h} variant="secondary" className="text-xs">{h}</Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">None reported</p>
                  )}
                </div>
                {patient.symptoms && patient.symptoms.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {patient.symptoms.map((s) => (
                      <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                    ))}
                  </div>
                )}
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
                {patient.medications ? (
                  <p className="text-sm text-foreground">{patient.medications}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">None reported</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
