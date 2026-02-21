import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Heart, Clock, Stethoscope, Pill, Watch, Send, AlertCircle, User, Camera, Mic, Video, X, Paperclip, MapPin, Phone, Weight, ShieldAlert, Building2, Loader2, Bluetooth, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { DobPicker } from "@/components/DobPicker";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CameraModal } from "@/components/CameraModal";
import { SmartSymptomAssessment, type SymptomAssessmentData } from "@/components/SmartSymptomAssessment";
import { HeartRateAnalysis } from "@/components/HeartRateAnalysis";

// Symptom options now handled by SmartSymptomAssessment

const HISTORY_OPTIONS = [
  "Heart disease", "Stroke", "Kidney disease", "Asthma/COPD", "Seizures",
];

export default function PatientIntake() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState<Date>();
  const [consentGiven, setConsentGiven] = useState(false);
  const [gender, setGender] = useState("");
  const [ethnicity, setEthnicity] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [weight, setWeight] = useState("");
  const [allergies, setAllergies] = useState("");
  const [previousVisit, setPreviousVisit] = useState<string>("");
  const [isRetrievingRecords, setIsRetrievingRecords] = useState(false);
  const [retrievedRecords, setRetrievedRecords] = useState<any>(null);
  const [complaint, setComplaint] = useState("");
  const [onset, setOnset] = useState("");
  const [painScore, setPainScore] = useState([3]);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [symptomAssessment, setSymptomAssessment] = useState<SymptomAssessmentData | null>(null);
  const [selectedHistory, setSelectedHistory] = useState<string[]>([]);
  const [medications, setMedications] = useState("");
  const [customHistory, setCustomHistory] = useState("");
  const [wearableHR, setWearableHR] = useState("");
  const [wearableSleep, setWearableSleep] = useState("");
  const [attachments, setAttachments] = useState<{ type: string; name: string; url: string }[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [cameraMode, setCameraMode] = useState<"photo" | "video" | null>(null);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [wearableSpo2, setWearableSpo2] = useState("");
  const [wearableAfibDetected, setWearableAfibDetected] = useState<boolean | null>(null);
  const [wearableAfibDetails, setWearableAfibDetails] = useState("");
  const [wearableHrTrend, setWearableHrTrend] = useState<number[]>([]);
  const [syncedData, setSyncedData] = useState<{ hr: number; sleep: number; spo2: number; hrTrend: number[]; afibDetected: boolean; afibDetails: string } | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const handleCameraCapture = (file: { type: string; name: string; url: string }) => {
    setAttachments((prev) => [...prev, file]);
    toast.success(`${file.type.charAt(0).toUpperCase() + file.type.slice(1)} captured`);
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        const timestamp = new Date().toLocaleTimeString();
        setAttachments((prev) => [...prev, { type: "voice", name: `Recording ${timestamp}`, url }]);
        toast.success("Voice recording saved");
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.info("Recording... tap Stop when done");
    } catch {
      toast.error("Microphone access denied");
    }
  };

  const stopVoiceRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => {
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const toggleItem = (item: string, list: string[], setter: (v: string[]) => void) => {
    setter(list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);
  };

  const painColor = painScore[0] <= 3 ? "text-triage-low" : painScore[0] <= 6 ? "text-triage-moderate" : "text-triage-high";

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!symptomAssessment?.primarySymptom && !complaint.trim()) {
      toast.error("Please tell us what brought you in today");
      return;
    }
    if (!consentGiven) {
      toast.error("Please agree to share your information before submitting");
      return;
    }

    setIsSubmitting(true);
    try {
      const submissionData = {
        name: name || "Anonymous",
        date_of_birth: dateOfBirth?.toISOString().split("T")[0] || null,
        gender: gender || null,
        ethnicity: ethnicity || null,
        weight: weight ? parseFloat(weight) : null,
        allergies: allergies || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        chief_complaint: symptomAssessment?.primarySymptom || complaint,
        symptom_onset: onset || null,
        pain_score: symptomAssessment?.painScore ?? painScore[0],
        symptoms: symptomAssessment?.selectedSymptoms || selectedSymptoms,
        medical_history: selectedHistory,
        medications: medications || null,
        wearable_heart_rate: wearableHR ? parseFloat(wearableHR) : null,
        wearable_sleep: wearableSleep ? parseFloat(wearableSleep) : null,
        wearable_spo2: wearableSpo2 ? parseFloat(wearableSpo2) : null,
        wearable_hr_trend: wearableHrTrend.length > 0 ? wearableHrTrend : null,
        wearable_afib_detected: wearableAfibDetected,
        wearable_afib_details: wearableAfibDetails || null,
        previous_visit: previousVisit === "yes",
        attachments: attachments.map((a) => ({ type: a.type, name: a.name })),
      };

      // Get AI triage assessment
      let triageData: any = {};
      try {
        const { data, error } = await supabase.functions.invoke("triage-patient", {
          body: submissionData,
        });
        if (!error && data) triageData = data;
      } catch {
        console.warn("AI triage unavailable, saving without assessment");
      }

      // Save to database
      const { error: dbError } = await supabase.from("patient_submissions").insert({
        ...submissionData,
        ai_triage_level: triageData.ai_triage_level || null,
        ai_summary: triageData.ai_summary || null,
        red_flags: triageData.red_flags || [],
        risk_signals: triageData.risk_signals || [],
        missing_questions: triageData.missing_questions || [],
      });

      if (dbError) throw dbError;

      toast.success("Your information has been submitted. A nurse will review it shortly.");
      setTimeout(() => navigate("/"), 1500);
    } catch (error) {
      console.error("Submission error:", error);
      toast.error("Failed to submit. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container max-w-3xl py-8 animate-slide-in">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">Patient Check-In</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Please provide your symptoms and medical information to help us prioritize your care.
          </p>
        </div>

        <div className="space-y-6">
          {/* Demographics */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5 text-primary" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label className="text-sm">Full Name</Label>
                  <Input
                    placeholder="e.g., John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label className="text-sm">Date of Birth</Label>
                  <DobPicker value={dateOfBirth} onChange={setDateOfBirth} />
                </div>
                <div>
                  <Label className="text-sm">Gender</Label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="non-binary">Non-binary</SelectItem>
                      <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm">Ethnicity</Label>
                  <Select value={ethnicity} onValueChange={setEthnicity}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Select ethnicity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="white">White</SelectItem>
                      <SelectItem value="black">Black or African American</SelectItem>
                      <SelectItem value="hispanic">Hispanic or Latino</SelectItem>
                      <SelectItem value="asian">Asian</SelectItem>
                      <SelectItem value="native-american">Native American</SelectItem>
                      <SelectItem value="pacific-islander">Pacific Islander</SelectItem>
                      <SelectItem value="mixed">Mixed / Multiracial</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm">Weight (kg)</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 70"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label className="text-sm">Allergies</Label>
                  <Input
                    placeholder="e.g., Penicillin, Peanuts..."
                    value={allergies}
                    onChange={(e) => setAllergies(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Phone className="h-5 w-5 text-primary" />
                Contact Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-sm">Phone Number (with country code)</Label>
                  <Input
                    type="tel"
                    placeholder="e.g., +1 555-123-4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label className="text-sm">Email Address</Label>
                  <Input
                    type="email"
                    placeholder="e.g., john@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-sm">Address</Label>
                  <Input
                    placeholder="e.g., 123 Main St, City, State, ZIP"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Previous Hospital Visit */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building2 className="h-5 w-5 text-primary" />
                Previous Hospital Visit
              </CardTitle>
              <CardDescription>Have you visited this hospital before?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup value={previousVisit} onValueChange={async (value) => {
                setPreviousVisit(value);
                if (value === "yes" && name.trim()) {
                  setIsRetrievingRecords(true);
                  setRetrievedRecords(null);
                  try {
                    const { data, error } = await supabase.functions.invoke("retrieve-patient-records", {
                      body: { patientName: name, dateOfBirth: dateOfBirth?.toISOString() },
                    });
                    if (error) throw error;
                    setRetrievedRecords(data);
                    if (data?.found) {
                      toast.success("Previous medical records retrieved successfully!");
                      if (data.medicalHistory?.length) {
                        setSelectedHistory((prev) => [...new Set([...prev, ...data.medicalHistory])]);
                      }
                      if (data.medications) {
                        setMedications((prev) => prev ? prev : data.medications);
                      }
                      if (data.allergies && !allergies) {
                        setAllergies(data.allergies);
                      }
                    } else {
                      toast.info("No previous records found. Please fill in your details manually.");
                    }
                  } catch {
                    toast.info("Could not retrieve records automatically. Please fill in your details manually.");
                  } finally {
                    setIsRetrievingRecords(false);
                  }
                }
              }} className="flex gap-4">
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border p-3 transition-colors hover:bg-muted has-[button[data-state=checked]]:border-primary has-[button[data-state=checked]]:bg-accent">
                  <RadioGroupItem value="yes" />
                  <span className="text-sm font-medium">Yes</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border p-3 transition-colors hover:bg-muted has-[button[data-state=checked]]:border-primary has-[button[data-state=checked]]:bg-accent">
                  <RadioGroupItem value="no" />
                  <span className="text-sm font-medium">No</span>
                </label>
              </RadioGroup>

              {isRetrievingRecords && (
                <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  Retrieving your previous medical records...
                </div>
              )}

              {retrievedRecords?.found && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
                  <p className="font-medium text-primary flex items-center gap-1.5">
                    <ShieldAlert className="h-4 w-4" />
                    Previous records found and auto-filled
                  </p>
                  <p className="mt-1 text-muted-foreground">Your medical history, medications, and allergies have been pre-populated from your previous visit. Please review and update if needed.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Smart Symptom Assessment */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Stethoscope className="h-5 w-5 text-primary" />
                What Brought You In?
              </CardTitle>
              <CardDescription>Start typing your main symptom — we'll ask the right follow-up questions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SmartSymptomAssessment
                onChange={(data) => {
                  setSymptomAssessment(data);
                  setComplaint(data.primarySymptom || "");
                  setSelectedSymptoms(data.selectedSymptoms);
                  setPainScore([data.painScore]);
                }}
              />

              {/* Media attachments */}
              <div className="border-t border-border/50 pt-4">
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Attach photo, voice, or video</p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setCameraMode("photo")}>
                    <Camera className="h-4 w-4" /> Photo
                  </Button>
                  {!isRecording ? (
                    <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={startVoiceRecording}>
                      <Mic className="h-4 w-4" /> Voice
                    </Button>
                  ) : (
                    <Button type="button" variant="destructive" size="sm" className="gap-1.5 animate-pulse" onClick={stopVoiceRecording}>
                      <Mic className="h-4 w-4" /> Stop
                    </Button>
                  )}
                  <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setCameraMode("video")}>
                    <Video className="h-4 w-4" /> Video
                  </Button>
                </div>
                {attachments.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {attachments.map((att, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-2 text-sm">
                        <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <a href={att.url} target="_blank" rel="noopener noreferrer" className="truncate text-primary underline underline-offset-2 hover:text-primary/80" onClick={(e) => e.stopPropagation()}>
                          {att.name}
                        </a>
                        <Badge variant="secondary" className="text-xs shrink-0">{att.type}</Badge>
                        <button onClick={() => removeAttachment(i)} className="ml-auto shrink-0 rounded-full p-0.5 text-muted-foreground hover:text-destructive transition-colors">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Medical History */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Heart className="h-5 w-5 text-primary" />
                Medical History
              </CardTitle>
              <CardDescription>Select any conditions you have or had</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {HISTORY_OPTIONS.map((h) => (
                  <label
                    key={h}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-border p-3 transition-colors hover:bg-muted has-[input:checked]:border-primary has-[input:checked]:bg-accent"
                  >
                    <Checkbox
                      checked={selectedHistory.includes(h)}
                      onCheckedChange={() => toggleItem(h, selectedHistory, setSelectedHistory)}
                    />
                    <span className="text-sm">{h}</span>
                  </label>
                ))}
                {/* Custom history items */}
                {selectedHistory
                  .filter((h) => !HISTORY_OPTIONS.includes(h))
                  .map((h) => (
                    <label
                      key={h}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-primary bg-accent p-3 transition-colors"
                    >
                      <Checkbox
                        checked
                        onCheckedChange={() => toggleItem(h, selectedHistory, setSelectedHistory)}
                      />
                      <span className="text-sm">{h}</span>
                    </label>
                  ))}
              </div>
              {/* Other condition input */}
              <div className="mt-3 flex gap-2">
                <Input
                  placeholder="Other condition not listed above..."
                  value={customHistory}
                  onChange={(e) => setCustomHistory(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && customHistory.trim()) {
                      e.preventDefault();
                      if (!selectedHistory.includes(customHistory.trim())) {
                        setSelectedHistory((prev) => [...prev, customHistory.trim()]);
                      }
                      setCustomHistory("");
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (customHistory.trim() && !selectedHistory.includes(customHistory.trim())) {
                      setSelectedHistory((prev) => [...prev, customHistory.trim()]);
                      setCustomHistory("");
                    }
                  }}
                >
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Medications */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Pill className="h-5 w-5 text-primary" />
                Current Medications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="List your current medications and dosages..."
                value={medications}
                onChange={(e) => setMedications(e.target.value)}
                className="min-h-[80px] resize-none"
              />
            </CardContent>
          </Card>

          {/* AI Heart Rate Analysis */}
          <HeartRateAnalysis onResult={(result) => {
            if (!wearableHR && result.estimatedHR) {
              setWearableHR(String(result.estimatedHR));
            }
          }} />

          {/* Wearable Data */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Watch className="h-5 w-5 text-primary" />
                Wearable Device
                <Badge variant="secondary" className="ml-1 text-xs">Optional</Badge>
              </CardTitle>
              <CardDescription>Connect your smartwatch or fitness tracker to auto-sync health data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <Select value={selectedDevice} onValueChange={setSelectedDevice}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select your device" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="apple-watch">Apple Watch</SelectItem>
                    <SelectItem value="fitbit">Fitbit</SelectItem>
                    <SelectItem value="garmin">Garmin</SelectItem>
                    <SelectItem value="samsung-galaxy">Samsung Galaxy Watch</SelectItem>
                    <SelectItem value="whoop">WHOOP</SelectItem>
                    <SelectItem value="oura">Oura Ring</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!selectedDevice || isSyncing}
                  className="gap-2 shrink-0"
                  onClick={async () => {
                    setIsSyncing(true);
                    // Simulate syncing from the selected device
                    await new Promise((r) => setTimeout(r, 2000));
                    const hr = Math.floor(Math.random() * 33) + 62;
                    const sleep = +(Math.random() * 4 + 5).toFixed(1);
                    const spo2 = Math.floor(Math.random() * 4) + 95; // 95–98
                    const hrTrend = Array.from({ length: 24 }, () => Math.floor(Math.random() * 30) + 60);
                    const afibDetected = Math.random() < 0.15; // 15% chance
                    const afibDetails = afibDetected ? "Irregular rhythm detected during resting period. Recommend ECG follow-up." : "No irregular rhythms detected in the last 24 hours.";
                    setSyncedData({ hr, sleep, spo2, hrTrend, afibDetected, afibDetails });
                    setWearableHR(String(hr));
                    setWearableSleep(String(sleep));
                    setWearableSpo2(String(spo2));
                    setWearableHrTrend(hrTrend);
                    setWearableAfibDetected(afibDetected);
                    setWearableAfibDetails(afibDetails);
                    setIsSyncing(false);
                    toast.success(`Synced data from ${selectedDevice.replace("-", " ")}`);
                  }}
                >
                  {isSyncing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Bluetooth className="h-4 w-4" />
                  )}
                  {isSyncing ? "Syncing..." : "Sync"}
                </Button>
              </div>

              {syncedData && (
                <div className="rounded-xl border border-primary/20 bg-accent/40 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">
                      Data synced from {selectedDevice.replace(/-/g, " ")}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-card p-3 text-center border border-border/50">
                      <p className="text-xs text-muted-foreground mb-0.5">Resting Heart Rate</p>
                      <p className="text-xl font-bold text-foreground">{syncedData.hr} <span className="text-sm font-normal text-muted-foreground">bpm</span></p>
                    </div>
                    <div className="rounded-lg bg-card p-3 text-center border border-border/50">
                      <p className="text-xs text-muted-foreground mb-0.5">Last Night's Sleep</p>
                      <p className="text-xl font-bold text-foreground">{syncedData.sleep} <span className="text-sm font-normal text-muted-foreground">hrs</span></p>
                    </div>
                    <div className="rounded-lg bg-card p-3 text-center border border-border/50">
                      <p className="text-xs text-muted-foreground mb-0.5">SpO₂</p>
                      <p className="text-xl font-bold text-foreground">{syncedData.spo2}<span className="text-sm font-normal text-muted-foreground">%</span></p>
                    </div>
                    <div className={cn("rounded-lg p-3 text-center border", syncedData.afibDetected ? "bg-destructive/10 border-destructive/30" : "bg-card border-border/50")}>
                      <p className="text-xs text-muted-foreground mb-0.5">AFib Detection</p>
                      <p className={cn("text-sm font-bold", syncedData.afibDetected ? "text-destructive" : "text-triage-low")}>
                        {syncedData.afibDetected ? "⚠ Detected" : "✓ Normal"}
                      </p>
                    </div>
                  </div>
                  {/* HR Trend mini sparkline */}
                  {syncedData.hrTrend.length > 0 && (
                    <div className="mt-3 rounded-lg bg-card p-3 border border-border/50">
                      <p className="text-xs text-muted-foreground mb-2">Heart Rate Trend (24h)</p>
                      <div className="flex items-end gap-px h-12">
                        {syncedData.hrTrend.map((val, i) => {
                          const min = Math.min(...syncedData.hrTrend);
                          const max = Math.max(...syncedData.hrTrend);
                          const height = max === min ? 50 : ((val - min) / (max - min)) * 100;
                          return (
                            <div
                              key={i}
                              className="flex-1 rounded-t-sm bg-primary/60 transition-all"
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
                  {syncedData.afibDetected && (
                    <div className="mt-2 flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                      <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                      <p className="text-xs text-destructive">{syncedData.afibDetails}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Data Sharing Consent */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <label className="flex cursor-pointer items-start gap-3">
                <Checkbox
                  checked={consentGiven}
                  onCheckedChange={(checked) => setConsentGiven(checked === true)}
                  className="mt-0.5"
                />
                <span className="text-sm text-muted-foreground leading-relaxed">
                  I agree to share my personal and medical information with the treating clinicians for the purpose of my care. I understand that this information will be kept <strong className="text-foreground">strictly confidential</strong> and will not be disclosed to unauthorized individuals.
                </span>
              </label>
            </CardContent>
          </Card>

          <Button onClick={handleSubmit} size="lg" className="w-full gap-2" disabled={!consentGiven || isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {isSubmitting ? "Submitting & Analyzing..." : "Submit Check-In"}
          </Button>
        </div>

        <CameraModal
          open={cameraMode !== null}
          onClose={() => setCameraMode(null)}
          mode={cameraMode ?? "photo"}
          onCapture={handleCameraCapture}
        />
      </main>
    </div>
  );
}
