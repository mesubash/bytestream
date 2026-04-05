import { useParams, useLocation } from "wouter";
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Hls from "hls.js";
import { api } from "@/lib/api";
import { Layout } from "@/components/layout";
import { VideoPlayer } from "@/components/video-player";
import { StreamingDebugPanel } from "@/components/streaming-debug-panel";
import { Loader2, ArrowLeft, Calendar, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Watch() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hlsInstance, setHlsInstance] = useState<Hls | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!id || !confirm("Delete this video? This cannot be undone.")) return;
    setIsDeleting(true);
    try {
      await api.deleteVideo(id);
      queryClient.invalidateQueries({ queryKey: ["videos"] });
      setLocation("/dashboard");
    } catch {
      alert("Failed to delete video.");
      setIsDeleting(false);
    }
  };

  const { data: video, isLoading: videoLoading, isError: videoError } = useQuery({
    queryKey: ["video", id],
    queryFn: () => api.getVideo(id!),
    enabled: !!id,
  });

  const { data: manifest, isLoading: manifestLoading, isError: manifestError } = useQuery({
    queryKey: ["manifest", id],
    queryFn: () => api.getManifest(id!),
    enabled: !!id && video?.status === "READY",
  });

  const isLoading = videoLoading || (video?.status === "READY" && manifestLoading);
  const isError = videoError || manifestError;
  const manifestUrl = manifest?.manifestUrl;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="-ml-4 text-muted-foreground hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Library
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="w-full aspect-video bg-black/50 border border-white/5 rounded-2xl flex flex-col items-center justify-center">
            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading player...</p>
          </div>
        ) : isError || !video || !manifestUrl ? (
          <div className="w-full aspect-video bg-destructive/5 border border-destructive/20 rounded-2xl flex flex-col items-center justify-center text-destructive">
            <p className="text-lg font-medium">Failed to load video</p>
            <p className="text-sm opacity-80 mt-2">
              {video?.status === "PROCESSING"
                ? "This video is still being processed. Check back soon."
                : video?.status === "FAILED"
                  ? "Video processing failed."
                  : "The video might be processing or unavailable."}
            </p>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <VideoPlayer
              manifestUrl={manifestUrl}
              poster={video.thumbnailUrl ?? undefined}
              videoRef={videoRef}
              onHlsReady={setHlsInstance}
            />

            <div className="mt-8 border-b border-white/10 pb-8">
              <h1 className="text-3xl font-display font-bold text-white mb-4">{video.title}</h1>

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                  <Calendar className="w-4 h-4" />
                  {new Date(video.createdAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
                <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-full border border-primary/20">
                  <span className="relative flex h-2 w-2 mr-1">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                  </span>
                  Ready to Stream
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="ml-auto text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                  Delete
                </Button>
              </div>
            </div>

            <StreamingDebugPanel hls={hlsInstance} videoRef={videoRef} />
          </div>
        )}
      </div>
    </Layout>
  );
}
