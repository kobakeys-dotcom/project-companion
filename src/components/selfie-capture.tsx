import { useState, useRef, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, RotateCcw, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SelfieCaptureProps {
  open: boolean;
  onClose: () => void;
  onCapture: (selfieUrl: string) => void;
  title: string;
}

/**
 * Captures a selfie via webcam and uploads it to the private `selfies` bucket.
 * Returns the storage object path (e.g. `userId/timestamp.jpg`) — not a public URL.
 * Use a signed URL to display later.
 */
export function SelfieCapture({ open, onClose, onCapture, title }: SelfieCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [captured, setCaptured] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    setCameraReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 480 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => setCameraReady(true);
      }
    } catch {
      setCameraError("Could not access camera. Please allow camera access and try again.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  }, []);

  useEffect(() => {
    if (open) {
      setCaptured(null);
      setCameraError(null);
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [open, startCamera, stopCamera]);

  const takeSelfie = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    setCaptured(dataUrl);
    stopCamera();
  }, [stopCamera]);

  const retake = useCallback(() => {
    setCaptured(null);
    startCamera();
  }, [startCamera]);

  const confirmSelfie = useCallback(async () => {
    if (!captured) return;
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const blob = await (await fetch(captured)).blob();
      const path = `${user.id}/${Date.now()}.jpg`;

      const { error } = await supabase.storage
        .from("selfies")
        .upload(path, blob, { contentType: "image/jpeg", upsert: false });
      if (error) throw error;

      onCapture(path);
      onClose();
    } catch (err) {
      console.error("Selfie upload failed:", err);
      onCapture("");
      onClose();
    } finally {
      setUploading(false);
    }
  }, [captured, onCapture, onClose]);

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>Take a selfie to verify your identity</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          {cameraError ? (
            <div className="w-full aspect-square bg-muted rounded-lg flex items-center justify-center p-4">
              <p className="text-sm text-muted-foreground text-center">{cameraError}</p>
            </div>
          ) : captured ? (
            <div className="w-full aspect-square rounded-lg overflow-hidden bg-black">
              <img src={captured} alt="Captured selfie" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-full aspect-square rounded-lg overflow-hidden bg-black relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: "scaleX(-1)" }}
              />
              {!cameraReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
              )}
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />

          <div className="flex gap-3 w-full">
            {captured ? (
              <>
                <Button variant="outline" onClick={retake} className="flex-1" disabled={uploading}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Retake
                </Button>
                <Button onClick={confirmSelfie} className="flex-1" disabled={uploading}>
                  {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                  {uploading ? "Uploading..." : "Confirm"}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={handleClose} className="flex-1">
                  Skip
                </Button>
                <Button onClick={takeSelfie} className="flex-1" disabled={!cameraReady}>
                  <Camera className="h-4 w-4 mr-2" />
                  Take Selfie
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
