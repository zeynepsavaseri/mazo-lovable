import { useState, useRef, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Heart, Video, RotateCcw, Square, Activity, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface HeartRateResult {
  estimatedHR: number;
  confidence: "low" | "medium" | "high";
  observations: string[];
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
  }, []);

  const startCamera = useCallback(async () => {
    setError(null);
    setResult(null);
    stopStream();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch {
      setError("Camera access denied. Please allow camera permissions.");
      toast.error("Camera access denied");
    }
  }, [facingMode, stopStream]);

  useEffect(() => {
    return () => stopStream();
  }, [stopStream]);

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
    // Ensure video is actually playing with valid dimensions
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      toast.error("Camera not ready. Please wait a moment and try again.");
      return;
    }

    setIsRecording(true);
    setCountdown(5);
    setResult(null);

    // Countdown for 5 seconds to let user position
    for (let i = 5; i > 0; i--) {
      setCountdown(i);
      await new Promise((r) => setTimeout(r, 1000));
    }

    setIsRecording(false);
    setIsAnalyzing(true);
    setCountdown(0);

    // Capture a frame
    const imageBase64 = captureFrame();
    if (!imageBase64) {
      setIsAnalyzing(false);
      toast.error("Failed to capture frame. Please try again.");
      return;
    }

    try {
      const { data, error: fnError } = await supabase.functions.invoke("analyze-heartrate", {
        body: { imageBase64 },
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      setResult(data as HeartRateResult);
      onResult?.(data as HeartRateResult);
      toast.success("Heart rate analysis complete");
    } catch (err: any) {
      console.error("Analysis error:", err);
      toast.error(err.message || "Analysis failed. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  }, [captureFrame, onResult]);

  const handleFlip = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  useEffect(() => {
    if (cameraActive) startCamera();
  }, [facingMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const confidenceColor = {
    low: "text-triage-high",
    medium: "text-triage-moderate",
    high: "text-triage-low",
  };

  const hrColor = (hr: number) =>
    hr < 60 || hr > 100 ? "text-triage-high" : "text-triage-low";

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
          Position your face or wrist clearly in frame.
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
              <Button
                onClick={startAnalysis}
                disabled={isRecording || isAnalyzing || !!error}
                className="gap-2"
              >
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
              <Badge variant="outline" className={confidenceColor[result.confidence]}>
                {result.confidence} confidence
              </Badge>
            </div>

            {result.warning && (
              <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                {result.warning}
              </div>
            )}

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
