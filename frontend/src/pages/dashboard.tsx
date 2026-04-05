import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Layout } from "@/components/layout";
import { VideoCard } from "@/components/video-card";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Upload, Video, Loader2, AlertCircle } from "lucide-react";

export default function Dashboard() {
  const { data: videos, isLoading, isError, error } = useQuery({
    queryKey: ["videos"],
    queryFn: api.listVideos,
    refetchInterval: (query) => {
      const data = query.state.data;
      const hasProcessing = data?.some(v => v.status === "PROCESSING" || v.status === "UPLOADING");
      return hasProcessing ? 3000 : false;
    },
  });

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Video Library</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {videos ? `${videos.length} video${videos.length !== 1 ? "s" : ""}` : "Loading..."}
            </p>
          </div>
          <Link href="/upload">
            <Button size="sm" className="gap-2">
              <Upload className="w-4 h-4" />
              Upload Video
            </Button>
          </Link>
        </div>

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" />
            <p className="text-sm">Loading your videos...</p>
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4 border border-destructive/20">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <p className="font-medium text-white mb-1">Failed to load videos</p>
            <p className="text-sm text-center max-w-xs">
              {(error as Error)?.message ?? "Something went wrong. Please try again."}
            </p>
          </div>
        )}

        {!isLoading && !isError && videos && videos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 border border-primary/20">
              <Video className="w-8 h-8 text-primary" />
            </div>
            <p className="font-medium text-white mb-1">No videos yet</p>
            <p className="text-sm text-center max-w-xs mb-6">Upload your first video to get started.</p>
            <Link href="/upload">
              <Button size="sm" className="gap-2">
                <Upload className="w-4 h-4" />
                Upload Video
              </Button>
            </Link>
          </div>
        )}

        {!isLoading && !isError && videos && videos.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
