import { useState, useRef, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Heart, Video, RotateCcw, Square, Activity, AlertTriangle, CheckCircle2, XCircle, Sun, Move, User, Eye } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface QualityChecks {
  adequateLighting: boolean;
  minimalMotion: boolean;
  faceCentered: boolean;
  skinVisible: boolean;
}

interface HeartRateResult {
  estimatedHR: number;
  confidence: number;
  qualityChecks: QualityChecks;
  qualityIssues: string[];
  overallQuality: "poor" | "fair" | "good" | "excellent";
  observations: string[];
  skinToneAdaptation: string;
  recommendation: string;
  warning: string | null;
}

interface HeartRateAnalysisProps {
  onResult?: (result: HeartRateResult) => void;
}

export function HeartRateAnalysis({ onResult }: HeartRateAnalysisProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [result, setResult] = useState<HeartRateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
    setVideoReady(false);
  }, []);

  // Called directly from button click (user gesture)
  const startCamera = async () => {
    setError(null);
    setResult(null);
    setVideoReady(false);
    // Stop any existing stream
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      setCameraActive(true);
      // The video element will be rendered after setCameraActive(true),
      // and we'll attach the stream in onLoadedMetadata via a ref callback
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      });
    } catch {
      setError("Camera access denied. Please allow camera permissions.");
      toast.error("Camera access denied");
    }
  };

  const handleVideoReady = () => {
    setVideoReady(true);
  };

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;

    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return null;

    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);

    return canvas.toDataURL("image/jpeg", 0.8).split(",")[1];
  }, []);

  const startAnalysis = useCallback(async () => {
    if (!videoReady) {
      toast.error("Camera not ready yet. Please wait for the preview to appear.");
      return;
    }

    setIsRecording(true);
    setCountdown(5);
    setResult(null);

    for (let i = 5; i > 0; i--) {
      setCountdown(i);
      await new Promise((r) => setTimeout(r, 1000));
    }

    setIsRecording(false);
    setIsAnalyzing(true);
    setCountdown(0);

    const imageBase64 = captureFrame();
    if (!imageBase64) {
      setIsAnalyzing(false);
      toast.error("Failed to capture frame. Please try again.");
      return;
    }

    try {
      if (!SUPABASE_URL?.trim()) {
        throw new Error(
          "Supabase is not configured. Set VITE_SUPABASE_URL (and VITE_SUPABASE_PUBLISHABLE_KEY) in your deployment environment."
        );
      }

      const { data, error: fnError } = await supabase.functions.invoke("analyze-heartrate", {
        body: { imageBase64 },
      });

      if (fnError) {
        const msg = fnError.message || "";
        const isNetworkOrSend =
          /failed to send|fetch|network|load failed/i.test(msg) || msg.includes("Failed to fetch");
        if (isNetworkOrSend) {
          throw new Error(
            "Could not reach the heart rate service. On deploy: set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to your Supabase project, and deploy the 'analyze-heartrate' Edge Function there (see README)."
          );
        }
        throw fnError;
      }
      if (data?.error) throw new Error(data.error);

      setResult(data as HeartRateResult);
      onResult?.(data as HeartRateResult);
      toast.success("Heart rate analysis complete");
    } catch (err: any) {
      console.error("Analysis error:", err);
      toast.error(err?.message || "Analysis failed. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  }, [captureFrame, onResult, videoReady]);

  const handleFlip = async () => {
    const newMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(newMode);
    setVideoReady(false);
    // Restart stream with new facing mode directly (user gesture)
    streamRef.current?.getTracks().forEach((t) => t.stop());
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newMode, width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setError("Failed to switch camera.");
    }
  };

  const qualityColor: Record<string, string> = {
    poor: "text-destructive",
    fair: "text-triage-high",
    good: "text-triage-moderate",
    excellent: "text-triage-low",
  };

  const confidencePercent = (c: number) => Math.round(c * 100);

  const hrColor = (hr: number) =>
    hr < 60 || hr > 100 ? "text-triage-high" : "text-triage-low";

  const QualityCheckItem = ({ passed, label, icon: Icon }: { passed: boolean; label: string; icon: React.ElementType }) => (
    <div className="flex items-center gap-2 text-sm">
      {passed ? <CheckCircle2 className="h-4 w-4 text-triage-low shrink-0" /> : <XCircle className="h-4 w-4 text-destructive shrink-0" />}
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span className={passed ? "text-muted-foreground" : "text-destructive font-medium"}>{label}</span>
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity className="h-5 w-5 text-primary" />
          AI Heart Rate Analysis
          <Badge variant="secondary" className="ml-1 text-xs">Beta</Badge>
        </CardTitle>
        <CardDescription>
          Record a short video and our AI will estimate your heart rate from visual cues.
          Position your face or wrist clearly in frame with good lighting.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!cameraActive ? (
          <Button onClick={startCamera} variant="outline" className="w-full gap-2">
            <Video className="h-4 w-4" />
            Open Camera for Analysis
          </Button>
        ) : (
          <>
            <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
              {error ? (
                <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-destructive">
                  {error}
                </div>
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  onLoadedMetadata={handleVideoReady}
                  className="w-full h-full object-cover"
                />
              )}
              {isRecording && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40">
                  <span className="text-6xl font-bold text-white">{countdown}</span>
                  <p className="mt-2 text-sm text-white/80">Hold still...</p>
                </div>
              )}
              {isAnalyzing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
                  <Activity className="h-10 w-10 text-primary animate-pulse" />
                  <p className="mt-2 text-sm text-white">Analyzing...</p>
                </div>
              )}
            </div>

            <canvas ref={canvasRef} className="hidden" />

            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" size="icon" onClick={handleFlip} disabled={isRecording || isAnalyzing}>
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button onClick={startAnalysis} disabled={isRecording || isAnalyzing || !!error} className="gap-2">
                <Heart className="h-4 w-4" />
                {isRecording ? "Recording..." : isAnalyzing ? "Analyzing..." : "Start Analysis"}
              </Button>
              <Button variant="outline" size="icon" onClick={stopStream}>
                <Square className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}

        {result && (
          <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Heart className={`h-8 w-8 ${hrColor(result.estimatedHR)} animate-pulse`} />
                <div>
                  <p className={`text-3xl font-bold ${hrColor(result.estimatedHR)}`}>
                    {result.estimatedHR} <span className="text-base font-normal text-muted-foreground">bpm</span>
                  </p>
                  <p className="text-xs text-muted-foreground">Estimated Heart Rate</p>
                </div>
              </div>
              <div className="text-right">
                <Badge variant="outline" className={qualityColor[result.overallQuality] || ""}>
                  {result.overallQuality} quality
                </Badge>
                <div className="mt-1.5 flex items-center gap-2">
                  <Progress value={confidencePercent(result.confidence)} className="w-20 h-2" />
                  <span className="text-xs font-medium text-muted-foreground">{confidencePercent(result.confidence)}%</span>
                </div>
              </div>
            </div>

            {result.warning && (
              <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                {result.warning}
              </div>
            )}

            <div>
              <p className="text-sm font-medium mb-2">Quality Checks</p>
              <div className="grid grid-cols-2 gap-2">
                <QualityCheckItem passed={result.qualityChecks.adequateLighting} label="Lighting" icon={Sun} />
                <QualityCheckItem passed={result.qualityChecks.minimalMotion} label="Minimal motion" icon={Move} />
                <QualityCheckItem passed={result.qualityChecks.faceCentered} label="Face centered" icon={User} />
                <QualityCheckItem passed={result.qualityChecks.skinVisible} label="Skin visible" icon={Eye} />
              </div>
              {result.qualityIssues.length > 0 && (
                <div className="mt-2 space-y-1">
                  {result.qualityIssues.map((issue, i) => (
                    <p key={i} className="text-xs text-destructive flex items-center gap-1.5">
                      <AlertTriangle className="h-3 w-3 shrink-0" />
                      {issue}
                    </p>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="text-sm font-medium mb-1.5">Observations</p>
              <ul className="space-y-1">
                {result.observations.map((obs, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
                    {obs}
                  </li>
                ))}
              </ul>
            </div>

            {result.skinToneAdaptation && (
              <div>
                <p className="text-sm font-medium mb-1">Skin Tone Adaptation</p>
                <p className="text-sm text-muted-foreground">{result.skinToneAdaptation}</p>
              </div>
            )}

            <div>
              <p className="text-sm font-medium mb-1">Recommendation</p>
              <p className="text-sm text-muted-foreground">{result.recommendation}</p>
            </div>

            <p className="text-xs text-muted-foreground italic">
              ⚠️ This is an AI estimation based on visual analysis only. It is not a substitute for
              proper medical monitoring equipment. Always use certified devices for accurate readings.
            </p>

            <Button variant="outline" size="sm" onClick={() => { setResult(null); startCamera(); }} className="w-full gap-2">
              <RotateCcw className="h-3.5 w-3.5" />
              Retake Analysis
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
