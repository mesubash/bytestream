import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { api } from "@/lib/api";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload as UploadIcon, X, FileVideo, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Upload() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_SIZE = 50 * 1024 * 1024; // 50MB
  const ALLOWED_EXTENSIONS = ["mp4", "mkv", "mov"];

  const validateAndSetFile = (selected: File) => {
    if (!selected.type.startsWith("video/")) {
      toast({ variant: "destructive", title: "Invalid file", description: "Please select a video file." });
      return;
    }
    const ext = selected.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      toast({ variant: "destructive", title: "Unsupported format", description: `Only ${ALLOWED_EXTENSIONS.join(", ")} files are allowed.` });
      return;
    }
    if (selected.size > MAX_SIZE) {
      toast({ variant: "destructive", title: "File too large", description: `Maximum file size is ${MAX_SIZE / (1024 * 1024)} MB.` });
      return;
    }
    setFile(selected);
    if (!title) setTitle(selected.name.replace(/\.[^/.]+$/, ""));
    setError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
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
      await api.uploadVideo(file, title, (percent) => setProgress(percent));

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
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  className={`w-full aspect-[21/9] border-2 border-dashed rounded-2xl transition-colors flex flex-col items-center justify-center cursor-pointer group ${
                    isDragging
                      ? "border-primary bg-primary/10"
                      : "border-white/10 bg-black/20 hover:bg-white/5"
                  }`}
                >
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors ${
                    isDragging ? "bg-primary/30" : "bg-white/5 group-hover:bg-primary/20"
                  }`}>
                    <UploadIcon className={`w-8 h-8 transition-colors ${
                      isDragging ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                    }`} />
                  </div>
                  <h3 className="text-lg font-medium text-white mb-1">
                    {isDragging ? "Drop your video here" : "Drag & drop or click to select"}
                  </h3>
                  <p className="text-sm text-muted-foreground">MP4, MKV, or MOV up to 50MB</p>
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
