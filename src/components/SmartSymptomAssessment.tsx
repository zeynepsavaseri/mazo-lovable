import { useState, useRef, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Search,
  ChevronRight,
  Zap,
  X,
  Mic,
  MicOff,
} from "lucide-react";

/* ──────────────────────────────────────────────────── *
 *  TYPES                                               *
 * ──────────────────────────────────────────────────── */

interface FollowUp {
  id: string;
  label: string;
  type: "slider" | "radio" | "check" | "multi-check" | "text";
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
  isPainScale?: boolean;
  /** If set, show this follow-up only when the given answer key equals one of these values */
  showWhen?: { key: string; values: string[] };
}

interface SymptomCategory {
  name: string;
  aliases: string[];
  followUps: FollowUp[];
  involvesPain: boolean;
}

/* ──────────────────────────────────────────────────── *
 *  RED-FLAG RULES                                      *
 * ──────────────────────────────────────────────────── */

interface RedFlagRule {
  message: string;
  test: (selected: string[], answers: Record<string, any>) => boolean;
}

const RED_FLAG_RULES: RedFlagRule[] = [
  {
    message: "Chest pain + shortness of breath — potential cardiac event",
    test: (s) => s.includes("Chest pain") && s.includes("Shortness of breath"),
  },
  {
    message: "Sudden numbness + difficulty speaking — possible stroke",
    test: (s) =>
      s.includes("Numbness") &&
      (s.includes("Difficulty speaking") || s.includes("Slurred speech")),
  },
  {
    message: "Worst headache of life — rule out subarachnoid hemorrhage",
    test: (_s, a) => a["headache_worst"] === "Yes",
  },
  {
    message: "Chest pain with radiation to arm/jaw — possible MI",
    test: (s, a) => {
      if (!s.includes("Chest pain")) return false;
      const rad = a["chest_radiation"];
      return Array.isArray(rad) && (rad.includes("Left arm") || rad.includes("Jaw"));
    },
  },
  {
    message: "High fever with altered mental status — potential sepsis",
    test: (s, a) => {
      const temp = parseFloat(a["fever_temp"] || "0");
      return s.includes("Fever") && temp >= 39;
    },
  },
  {
    message: "Severe abdominal pain — possible surgical emergency",
    test: (s, a) => {
      if (!s.includes("Abdominal pain")) return false;
      const score = a["abdominal_pain_score"];
      return Array.isArray(score) ? score[0] >= 8 : false;
    },
  },
];

/* ──────────────────────────────────────────────────── *
 *  SYMPTOM CATEGORIES & FOLLOW-UPS                     *
 * ──────────────────────────────────────────────────── */

const SYMPTOM_CATEGORIES: SymptomCategory[] = [
  {
    name: "Chest pain",
    aliases: ["chest tightness", "heart pain", "chest pressure", "angina"],
    involvesPain: true,
    followUps: [
      { id: "chest_pain_score", label: "Pain intensity", type: "slider", min: 0, max: 10, step: 1, isPainScale: true },
      { id: "chest_type", label: "Type of pain", type: "radio", options: ["Pressure", "Sharp", "Burning", "Tightness", "Aching"] },
      { id: "chest_radiation", label: "Does pain radiate to?", type: "multi-check", options: ["Left arm", "Right arm", "Jaw", "Back", "Neck", "None"] },
      { id: "chest_breathing", label: "Worse with breathing?", type: "radio", options: ["Yes", "No"] },
      { id: "chest_onset", label: "Onset", type: "radio", options: ["Sudden", "Gradual", "Intermittent"] },
    ],
  },
  {
    name: "Headache",
    aliases: ["migraine", "head pain", "head pressure"],
    involvesPain: true,
    followUps: [
      { id: "headache_pain_score", label: "Pain intensity", type: "slider", min: 0, max: 10, step: 1, isPainScale: true },
      { id: "headache_onset", label: "Onset type", type: "radio", options: ["Sudden (thunderclap)", "Gradual", "Chronic / recurring"] },
      { id: "headache_worst", label: "Worst headache of your life?", type: "radio", options: ["Yes", "No"] },
      { id: "headache_visual", label: "Visual changes?", type: "radio", options: ["Yes", "No"] },
      { id: "headache_nausea", label: "Nausea or vomiting?", type: "radio", options: ["Yes", "No"] },
      { id: "headache_stiff_neck", label: "Stiff neck?", type: "radio", options: ["Yes", "No"] },
    ],
  },
  {
    name: "Shortness of breath",
    aliases: ["difficulty breathing", "dyspnea", "can't breathe", "breathless", "sob"],
    involvesPain: false,
    followUps: [
      { id: "sob_severity", label: "Severity", type: "radio", options: ["Mild", "Moderate", "Severe"] },
      { id: "sob_trigger", label: "When does it occur?", type: "radio", options: ["At rest", "With exertion", "Both"] },
      { id: "sob_history", label: "History of asthma/COPD?", type: "radio", options: ["Yes", "No"] },
      { id: "sob_chest_tight", label: "Chest tightness?", type: "radio", options: ["Yes", "No"] },
      { id: "sob_chest_pain_score", label: "Chest pain intensity", type: "slider", min: 0, max: 10, step: 1, isPainScale: true, showWhen: { key: "sob_chest_tight", values: ["Yes"] } },
      { id: "sob_onset", label: "How quickly did it start?", type: "radio", options: ["Suddenly", "Over hours", "Over days"] },
    ],
  },
  {
    name: "Fever",
    aliases: ["high temperature", "feel hot", "chills", "feverish"],
    involvesPain: false,
    followUps: [
      { id: "fever_temp", label: "Measured temperature (°F)", type: "text" },
      { id: "fever_duration", label: "How long?", type: "radio", options: ["< 24 hours", "1–3 days", "3–7 days", "> 1 week"] },
      { id: "fever_chills", label: "Chills or rigors?", type: "radio", options: ["Yes", "No"] },
      { id: "fever_exposure", label: "Recent infection exposure?", type: "radio", options: ["Yes", "No", "Not sure"] },
      { id: "fever_rash", label: "Associated rash?", type: "radio", options: ["Yes", "No"] },
    ],
  },
  {
    name: "Abdominal pain",
    aliases: ["stomach pain", "belly pain", "stomach ache", "cramps", "abdominal cramps"],
    involvesPain: true,
    followUps: [
      { id: "abdominal_pain_score", label: "Pain intensity", type: "slider", min: 0, max: 10, step: 1, isPainScale: true },
      { id: "abdominal_location", label: "Location", type: "radio", options: ["Upper right", "Upper left", "Lower right", "Lower left", "Diffuse / all over", "Around navel"] },
      { id: "abdominal_type", label: "Type", type: "radio", options: ["Cramping", "Sharp", "Burning", "Dull / aching"] },
      { id: "abdominal_nausea", label: "Nausea or vomiting?", type: "radio", options: ["Yes", "No"] },
      { id: "abdominal_bowel", label: "Changes in bowel movements?", type: "radio", options: ["Diarrhea", "Constipation", "Blood in stool", "Normal"] },
    ],
  },
  {
    name: "Dizziness",
    aliases: ["vertigo", "lightheaded", "faint", "feeling faint", "room spinning"],
    involvesPain: false,
    followUps: [
      { id: "dizzy_type", label: "What does it feel like?", type: "radio", options: ["Room spinning (vertigo)", "Lightheaded / faint", "Off balance", "Foggy"] },
      { id: "dizzy_position", label: "Related to position changes?", type: "radio", options: ["Yes", "No"] },
      { id: "dizzy_hearing", label: "Hearing loss or ringing?", type: "radio", options: ["Yes", "No"] },
      { id: "dizzy_fainted", label: "Did you faint / lose consciousness?", type: "radio", options: ["Yes", "No"] },
    ],
  },
  {
    name: "Numbness",
    aliases: ["tingling", "pins and needles", "weakness", "can't feel"],
    involvesPain: false,
    followUps: [
      { id: "numb_location", label: "Where?", type: "multi-check", options: ["Face", "Left arm", "Right arm", "Left leg", "Right leg", "Both sides"] },
      { id: "numb_onset", label: "Onset", type: "radio", options: ["Sudden (minutes)", "Gradual (hours)", "Days / weeks"] },
      { id: "numb_speech", label: "Difficulty speaking or slurred speech?", type: "radio", options: ["Yes", "No"] },
      { id: "numb_vision", label: "Vision changes?", type: "radio", options: ["Yes", "No"] },
    ],
  },
  {
    name: "Trauma",
    aliases: ["injury", "fall", "accident", "hurt", "wound", "cut", "fracture", "broken"],
    involvesPain: true,
    followUps: [
      { id: "trauma_pain_score", label: "Pain intensity", type: "slider", min: 0, max: 10, step: 1, isPainScale: true },
      { id: "trauma_mechanism", label: "How did it happen?", type: "radio", options: ["Fall", "Motor vehicle accident", "Assault", "Sports injury", "Other"] },
      { id: "trauma_location", label: "Body area affected", type: "multi-check", options: ["Head", "Neck / spine", "Chest", "Abdomen", "Arm / hand", "Leg / foot"] },
      { id: "trauma_bleeding", label: "Active bleeding?", type: "radio", options: ["Yes, severe", "Yes, minor", "No"] },
      { id: "trauma_consciousness", label: "Lost consciousness?", type: "radio", options: ["Yes", "No"] },
    ],
  },
  {
    name: "Vomiting",
    aliases: ["throwing up", "nausea", "feeling sick", "emesis"],
    involvesPain: false,
    followUps: [
      { id: "vomit_frequency", label: "How often?", type: "radio", options: ["Once", "Several times", "Can't keep anything down"] },
      { id: "vomit_blood", label: "Blood in vomit?", type: "radio", options: ["Yes", "No"] },
      { id: "vomit_duration", label: "How long?", type: "radio", options: ["< 6 hours", "6–24 hours", "> 24 hours"] },
      { id: "vomit_diarrhea", label: "Diarrhea as well?", type: "radio", options: ["Yes", "No"] },
    ],
  },
  {
    name: "Pain",
    aliases: ["ache", "soreness", "hurting", "pain", "sore", "general pain"],
    involvesPain: true,
    followUps: [
      { id: "pain_score", label: "Pain intensity", type: "slider", min: 0, max: 10, step: 1, isPainScale: true },
      { id: "pain_location", label: "Where is the pain?", type: "text" },
      { id: "pain_type", label: "Type of pain", type: "radio", options: ["Sharp", "Dull / aching", "Burning", "Throbbing", "Cramping"] },
      { id: "pain_onset", label: "When did it start?", type: "radio", options: ["Today", "1–3 days ago", "This week", "> 1 week"] },
      { id: "pain_constant", label: "Is it constant or intermittent?", type: "radio", options: ["Constant", "Comes and goes"] },
    ],
  },
];

/* ──────────────────────────────────────────────────── *
 *  EXPORTED DATA SHAPE                                 *
 * ──────────────────────────────────────────────────── */

export interface SymptomAssessmentData {
  primarySymptom: string;
  selectedSymptoms: string[];
  followUpAnswers: Record<string, any>;
  painScore: number;
  redFlags: string[];
}

interface Props {
  onChange: (data: SymptomAssessmentData) => void;
}

/* ──────────────────────────────────────────────────── *
 *  COMPONENT                                           *
 * ──────────────────────────────────────────────────── */

export function SmartSymptomAssessment({ onChange }: Props) {
  const [query, setQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isListening, setIsListening] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join("");
      setQuery(transcript);
      setShowSuggestions(true);
    };

    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.start();
    setIsListening(true);
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Filtered suggestions
  const suggestions = useMemo(() => {
    if (!query.trim()) return SYMPTOM_CATEGORIES.map((c) => c.name);
    const q = query.toLowerCase();
    return SYMPTOM_CATEGORIES
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.aliases.some((a) => a.includes(q))
      )
      .map((c) => c.name);
  }, [query]);

  // Derive active categories
  const activeCategories = useMemo(
    () => SYMPTOM_CATEGORIES.filter((c) => selectedSymptoms.includes(c.name)),
    [selectedSymptoms]
  );

  // Primary pain score (first pain-scale follow-up found)
  const primaryPainScore = useMemo(() => {
    for (const cat of activeCategories) {
      for (const fu of cat.followUps) {
        if (fu.isPainScale && answers[fu.id] !== undefined) {
          const val = answers[fu.id];
          return Array.isArray(val) ? val[0] : val;
        }
      }
    }
    return 0;
  }, [activeCategories, answers]);

  // Red flags
  const detectedFlags = useMemo(
    () =>
      RED_FLAG_RULES.filter((r) => r.test(selectedSymptoms, answers)).map(
        (r) => r.message
      ),
    [selectedSymptoms, answers]
  );

  // Emit changes
  useEffect(() => {
    onChange({
      primarySymptom: selectedSymptoms[0] || "",
      selectedSymptoms,
      followUpAnswers: answers,
      painScore: primaryPainScore,
      redFlags: detectedFlags,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSymptoms, answers, primaryPainScore, detectedFlags]);

  const addSymptom = (name: string) => {
    if (!selectedSymptoms.includes(name)) {
      setSelectedSymptoms((prev) => [...prev, name]);
    }
    setQuery("");
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const removeSymptom = (name: string) => {
    setSelectedSymptoms((prev) => prev.filter((s) => s !== name));
    // clean up answers
    const cat = SYMPTOM_CATEGORIES.find((c) => c.name === name);
    if (cat) {
      setAnswers((prev) => {
        const next = { ...prev };
        cat.followUps.forEach((fu) => delete next[fu.id]);
        return next;
      });
    }
  };

  const addFreeText = () => {
    const trimmed = query.trim();
    if (trimmed && !selectedSymptoms.includes(trimmed)) {
      setSelectedSymptoms((prev) => [...prev, trimmed]);
    }
    setQuery("");
    setShowSuggestions(false);
  };

  const setAnswer = (id: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const shouldShowFollowUp = (fu: FollowUp) => {
    if (!fu.showWhen) return true;
    const val = answers[fu.showWhen.key];
    return fu.showWhen.values.includes(val);
  };

  const painColor = (score: number) =>
    score <= 3 ? "text-triage-low" : score <= 6 ? "text-triage-moderate" : "text-triage-high";

  return (
    <div className="space-y-4">
      {/* Search input */}
      <div ref={containerRef} className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            placeholder="What brought you in today?"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (suggestions.length === 1) {
                  addSymptom(suggestions[0]);
                } else if (query.trim()) {
                  addFreeText();
                }
              }
            }}
            className="pl-10 pr-12 h-12 text-base"
          />
          <button
            type="button"
            onClick={isListening ? stopListening : startListening}
            className={cn(
              "absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 transition-colors",
              isListening
                ? "bg-destructive text-destructive-foreground animate-pulse"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
            title={isListening ? "Stop listening" : "Speak your symptoms"}
          >
            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>
        </div>

        {/* Autocomplete dropdown */}
        {showSuggestions && query.trim() && (
          <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-popover shadow-lg overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
            {suggestions.length > 0 ? (
              suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={cn(
                    "flex w-full items-center justify-between px-4 py-3 text-sm text-left transition-colors hover:bg-muted",
                    selectedSymptoms.includes(s) && "opacity-50"
                  )}
                  onClick={() => addSymptom(s)}
                  disabled={selectedSymptoms.includes(s)}
                >
                  <span className="font-medium">{s}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              ))
            ) : (
              <button
                type="button"
                className="flex w-full items-center gap-2 px-4 py-3 text-sm text-left hover:bg-muted"
                onClick={addFreeText}
              >
                <span className="text-muted-foreground">Add:</span>
                <span className="font-medium">"{query.trim()}"</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Selected symptoms chips */}
      {selectedSymptoms.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedSymptoms.map((s) => {
            const hasCat = SYMPTOM_CATEGORIES.some((c) => c.name === s);
            return (
              <Badge
                key={s}
                variant="secondary"
                className={cn(
                  "gap-1.5 pl-3 pr-1.5 py-1.5 text-sm cursor-default",
                  hasCat && "border-primary/20 bg-primary/10 text-primary"
                )}
              >
                {s}
                <button
                  type="button"
                  onClick={() => removeSymptom(s)}
                  className="rounded-full p-0.5 hover:bg-foreground/10 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}

      {/* Red flags detected silently — passed to backend for nurse review, not shown to patient */}

      {/* Dynamic follow-ups per selected symptom */}
      {activeCategories.map((cat) => (
        <Card
          key={cat.name}
          className="overflow-hidden border-border/60 animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
        >
          <div className="flex items-center gap-2.5 px-5 pt-4 pb-2">
            <Zap className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold tracking-wide text-foreground">
              Tell us more about your {cat.name.toLowerCase()}
            </h3>
          </div>
          <CardContent className="space-y-5 pt-2">
            {cat.followUps.filter(shouldShowFollowUp).map((fu) => (
              <FollowUpField
                key={fu.id}
                followUp={fu}
                value={answers[fu.id]}
                onChange={(v) => setAnswer(fu.id, v)}
                painColor={painColor}
              />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ──────────────────────────────────────────────────── *
 *  FOLLOW-UP FIELD RENDERER                            *
 * ──────────────────────────────────────────────────── */

function FollowUpField({
  followUp,
  value,
  onChange,
  painColor,
}: {
  followUp: FollowUp;
  value: any;
  onChange: (v: any) => void;
  painColor: (n: number) => string;
}) {
  const fu = followUp;

  if (fu.type === "slider") {
    const val = Array.isArray(value) ? value : [fu.min ?? 0];
    const score = val[0];
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm">{fu.label}</Label>
          <span className={cn("text-lg font-bold tabular-nums", fu.isPainScale && painColor(score))}>
            {score}/{fu.max}
          </span>
        </div>
        <Slider
          value={val}
          onValueChange={onChange}
          min={fu.min}
          max={fu.max}
          step={fu.step}
        />
        {fu.isPainScale && (
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>No pain</span>
            <span>Worst possible</span>
          </div>
        )}
      </div>
    );
  }

  if (fu.type === "radio") {
    return (
      <div className="space-y-2">
        <Label className="text-sm">{fu.label}</Label>
        <RadioGroup
          value={value || ""}
          onValueChange={onChange}
          className="flex flex-wrap gap-2"
        >
          {fu.options!.map((opt) => (
            <label
              key={opt}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition-all",
                value === opt
                  ? "border-primary bg-primary/10 text-primary shadow-sm"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
              )}
            >
              <RadioGroupItem value={opt} className="sr-only" />
              {opt}
            </label>
          ))}
        </RadioGroup>
      </div>
    );
  }

  if (fu.type === "multi-check") {
    const selected: string[] = Array.isArray(value) ? value : [];
    const toggle = (opt: string) => {
      if (opt === "None") {
        onChange(selected.includes("None") ? [] : ["None"]);
        return;
      }
      const next = selected.includes(opt)
        ? selected.filter((s) => s !== opt)
        : [...selected.filter((s) => s !== "None"), opt];
      onChange(next);
    };
    return (
      <div className="space-y-2">
        <Label className="text-sm">{fu.label}</Label>
        <div className="flex flex-wrap gap-2">
          {fu.options!.map((opt) => {
            const checked = selected.includes(opt);
            return (
              <label
                key={opt}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition-all",
                  checked
                    ? "border-primary bg-primary/10 text-primary shadow-sm"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                )}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => toggle(opt)}
                  className="sr-only"
                />
                {opt}
              </label>
            );
          })}
        </div>
      </div>
    );
  }

  if (fu.type === "text") {
    return (
      <div className="space-y-2">
        <Label className="text-sm">{fu.label}</Label>
        <Input
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type here..."
          className="max-w-xs"
        />
      </div>
    );
  }

  return null;
}
