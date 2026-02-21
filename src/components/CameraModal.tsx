import { useState, useRef, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, Video, X, RotateCcw, Square } from "lucide-react";

interface CameraModalProps {
  open: boolean;
  onClose: () => void;
  mode: "photo" | "video";
  onCapture: (file: { type: string; name: string; url: string }) => void;
}

export function CameraModal({ open, onClose, mode, onCapture }: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [error, setError] = useState<string | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startStream = useCallback(async () => {
    setError(null);
    stopStream();
    try {
      const constraints: MediaStreamConstraints = {
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: mode === "video",
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setError("Camera access denied. Please allow camera permissions and try again.");
    }
  }, [facingMode, mode, stopStream]);

  useEffect(() => {
    if (open) {
      startStream();
    } else {
      stopStream();
      setIsRecording(false);
      setError(null);
    }
    return () => stopStream();
  }, [open, startStream, stopStream]);

  const handleFlip = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  // Re-start stream when facingMode changes
  useEffect(() => {
    if (open) startStream();
  }, [facingMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const takePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const timestamp = new Date().toLocaleTimeString();
        onCapture({ type: "photo", name: `Photo ${timestamp}`, url });
        onClose();
      }
    }, "image/jpeg", 0.9);
  };

  const startRecording = () => {
    const stream = streamRef.current;
    if (!stream) return;

    chunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported("video/webm") ? "video/webm" : "video/mp4";
    const recorder = new MediaRecorder(stream, { mimeType });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const timestamp = new Date().toLocaleTimeString();
      onCapture({ type: "video", name: `Video ${timestamp}`, url });
      onClose();
    };

    mediaRecorderRef.current = recorder;
    recorder.start(1000);
    setIsRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            {mode === "photo" ? (
              <><Camera className="h-5 w-5 text-primary" /> Take Photo</>
            ) : (
              <><Video className="h-5 w-5 text-primary" /> Record Video</>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="relative bg-black aspect-video">
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-destructive-foreground bg-destructive/10">
              {error}
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted={mode === "photo"}
              className="w-full h-full object-cover"
            />
          )}
          {isRecording && (
            <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-destructive px-2.5 py-1 text-xs font-medium text-destructive-foreground animate-pulse">
              <span className="h-2 w-2 rounded-full bg-destructive-foreground" />
              REC
            </div>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />

        <div className="flex items-center justify-center gap-4 p-4">
          <Button variant="outline" size="icon" onClick={handleFlip} disabled={!!error}>
            <RotateCcw className="h-4 w-4" />
          </Button>

          {mode === "photo" ? (
            <Button size="lg" className="gap-2 rounded-full px-8" onClick={takePhoto} disabled={!!error}>
              <Camera className="h-5 w-5" />
              Capture
            </Button>
          ) : !isRecording ? (
            <Button size="lg" className="gap-2 rounded-full px-8" onClick={startRecording} disabled={!!error}>
              <Video className="h-5 w-5" />
              Start Recording
            </Button>
          ) : (
            <Button size="lg" variant="destructive" className="gap-2 rounded-full px-8" onClick={stopRecording}>
              <Square className="h-4 w-4" />
              Stop
            </Button>
          )}

          <Button variant="outline" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
