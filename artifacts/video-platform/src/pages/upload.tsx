import { useState, useRef } from "react";
import { useLocation } from "wouter";
import axios from "axios";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload as UploadIcon, X, FileVideo, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export default function Upload() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (!selected.type.startsWith("video/")) {
        toast({ variant: "destructive", title: "Invalid file", description: "Please select a video file." });
        return;
      }
      setFile(selected);
      if (!title) setTitle(selected.name.replace(/\.[^/.]+$/, ""));
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file || !title) {
      setError("Please provide a title and select a file.");
      return;
    }

    setIsUploading(true);
    setError(null);
    setProgress(0);

    const formData = new FormData();
    formData.append("title", title);
    formData.append("file", file);

    try {
      await axios.post(`${API_BASE}/api/videos/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => {
          setProgress(Math.round((e.loaded * 100) / (e.total ?? 1)));
        },
      });

      toast({ variant: "success", title: "Upload successful", description: "Your video is now processing." });
      setTimeout(() => setLocation("/dashboard"), 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to upload video.");
      setIsUploading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto mt-8">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-white mb-2">Upload Video</h1>
          <p className="text-muted-foreground">Upload a new video to your library. It will be processed for adaptive streaming.</p>
        </div>

        <div className="glass-panel rounded-3xl p-8 border-t border-white/10">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-3 text-destructive">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <div className="space-y-8">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80 ml-1">Video Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter an engaging title"
                disabled={isUploading}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80 ml-1">Video File</label>

              {!file ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full aspect-[21/9] border-2 border-dashed border-white/10 rounded-2xl bg-black/20 hover:bg-white/5 transition-colors flex flex-col items-center justify-center cursor-pointer group"
                >
                  <div className="w-16 h-16 rounded-full bg-white/5 group-hover:bg-primary/20 flex items-center justify-center mb-4 transition-colors">
                    <UploadIcon className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <h3 className="text-lg font-medium text-white mb-1">Select a video file</h3>
                  <p className="text-sm text-muted-foreground">MP4, WebM, or MOV up to 2GB</p>
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                  />
                </div>
              ) : (
                <div className="p-4 border border-white/10 rounded-2xl bg-black/40 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                    <FileVideo className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                  </div>
                  {!isUploading && (
                    <Button variant="ghost" size="icon" onClick={() => setFile(null)} className="shrink-0 text-muted-foreground hover:text-destructive">
                      <X className="w-5 h-5" />
                    </Button>
                  )}
                </div>
              )}
            </div>

            {isUploading && (
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-white">Uploading...</span>
                  <span className="text-primary font-medium">{progress}%</span>
                </div>
                <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden border border-white/10">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-blue-400 transition-all duration-300 relative"
                    style={{ width: `${progress}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-pulse" />
                  </div>
                </div>
                {progress === 100 && (
                  <p className="text-sm text-primary flex items-center gap-1.5 justify-center mt-4">
                    <CheckCircle2 className="w-4 h-4" /> Upload complete! Processing video...
                  </p>
                )}
              </div>
            )}

            <div className="pt-4 border-t border-white/5 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setLocation("/dashboard")} disabled={isUploading}>
                Cancel
              </Button>
              <Button onClick={handleUpload} disabled={!file || !title || isUploading} isLoading={isUploading}>
                {isUploading ? "Uploading..." : "Upload Video"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
