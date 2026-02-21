import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Clock, Stethoscope, Pill, Watch, Send, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const SYMPTOM_OPTIONS = [
  "Chest pain", "Shortness of breath", "Fever", "Headache", "Nausea",
  "Vomiting", "Dizziness", "Abdominal pain", "Back pain", "Cough",
  "Sore throat", "Body aches", "Fatigue", "Swelling", "Numbness",
  "Blurred vision", "Rash", "Difficulty walking",
];

const HISTORY_OPTIONS = [
  "Hypertension", "Diabetes", "Heart disease", "Asthma/COPD",
  "Cancer", "Stroke", "Kidney disease", "Liver disease",
  "Seizures", "Mental health condition", "Autoimmune disorder",
];

export default function PatientIntake() {
  const navigate = useNavigate();
  const [complaint, setComplaint] = useState("");
  const [onset, setOnset] = useState("");
  const [painScore, setPainScore] = useState([3]);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [selectedHistory, setSelectedHistory] = useState<string[]>([]);
  const [medications, setMedications] = useState("");
  const [customSymptom, setCustomSymptom] = useState("");
  const [customHistory, setCustomHistory] = useState("");
  const [wearableHR, setWearableHR] = useState("");
  const [wearableSleep, setWearableSleep] = useState("");

  const toggleItem = (item: string, list: string[], setter: (v: string[]) => void) => {
    setter(list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);
  };

  const painColor = painScore[0] <= 3 ? "text-triage-low" : painScore[0] <= 6 ? "text-triage-moderate" : "text-triage-high";

  const handleSubmit = () => {
    if (!complaint.trim()) {
      toast.error("Please describe your chief complaint");
      return;
    }
    toast.success("Your information has been submitted. A nurse will review it shortly.");
    setTimeout(() => navigate("/"), 1500);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container max-w-3xl py-8 animate-slide-in">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground">Patient Check-In</h1>
          <p className="mt-1.5 text-muted-foreground">
            Please provide your symptoms and medical information to help us prioritize your care.
          </p>
        </div>

        <div className="space-y-6">
          {/* Chief Complaint */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Stethoscope className="h-5 w-5 text-primary" />
                Chief Complaint
              </CardTitle>
              <CardDescription>What brings you to the ER today?</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Describe your main concern in your own words..."
                value={complaint}
                onChange={(e) => setComplaint(e.target.value)}
                className="min-h-[100px] resize-none"
              />
            </CardContent>
          </Card>

          {/* Onset & Pain */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="h-5 w-5 text-primary" />
                  Symptom Onset
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  placeholder="e.g., 2 hours ago, yesterday morning..."
                  value={onset}
                  onChange={(e) => setOnset(e.target.value)}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <AlertCircle className="h-5 w-5 text-primary" />
                  Pain Score
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">No pain</span>
                  <span className={`text-2xl font-bold ${painColor}`}>{painScore[0]}</span>
                  <span className="text-sm text-muted-foreground">Worst</span>
                </div>
                <Slider
                  value={painScore}
                  onValueChange={setPainScore}
                  max={10}
                  min={0}
                  step={1}
                />
              </CardContent>
            </Card>
          </div>

          {/* Symptoms */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Key Symptoms</CardTitle>
              <CardDescription>Select all that apply</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {SYMPTOM_OPTIONS.map((s) => {
                  const selected = selectedSymptoms.includes(s);
                  return (
                    <button
                      key={s}
                      onClick={() => toggleItem(s, selectedSymptoms, setSelectedSymptoms)}
                      className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                        selected
                          ? "border-primary bg-accent text-accent-foreground"
                          : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground"
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
                {/* Custom symptoms added by user */}
                {selectedSymptoms
                  .filter((s) => !SYMPTOM_OPTIONS.includes(s))
                  .map((s) => (
                    <button
                      key={s}
                      onClick={() => toggleItem(s, selectedSymptoms, setSelectedSymptoms)}
                      className="rounded-full border border-primary bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground transition-colors"
                    >
                      {s} ×
                    </button>
                  ))}
              </div>
              {/* Other symptom input */}
              <div className="mt-3 flex gap-2">
                <Input
                  placeholder="Other symptom not listed above..."
                  value={customSymptom}
                  onChange={(e) => setCustomSymptom(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && customSymptom.trim()) {
                      e.preventDefault();
                      if (!selectedSymptoms.includes(customSymptom.trim())) {
                        setSelectedSymptoms((prev) => [...prev, customSymptom.trim()]);
                      }
                      setCustomSymptom("");
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (customSymptom.trim() && !selectedSymptoms.includes(customSymptom.trim())) {
                      setSelectedSymptoms((prev) => [...prev, customSymptom.trim()]);
                      setCustomSymptom("");
                    }
                  }}
                >
                  Add
                </Button>
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

          {/* Wearable Data */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Watch className="h-5 w-5 text-primary" />
                Wearable Device Data
                <Badge variant="secondary" className="ml-1 text-xs">Optional</Badge>
              </CardTitle>
              <CardDescription>If you use a smartwatch or fitness tracker</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-sm">Resting Heart Rate (bpm)</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 72"
                    value={wearableHR}
                    onChange={(e) => setWearableHR(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label className="text-sm">Last Night's Sleep (hours)</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 6.5"
                    value={wearableSleep}
                    onChange={(e) => setWearableSleep(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Button onClick={handleSubmit} size="lg" className="w-full gap-2">
            <Send className="h-4 w-4" />
            Submit Check-In
          </Button>
        </div>
      </main>
    </div>
  );
}
