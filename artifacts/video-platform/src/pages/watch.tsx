import { useParams } from "wouter";
import { useGetVideo, useGetVideoManifest } from "@workspace/api-client-react";
import { useAuthHeaders } from "@/hooks/use-auth-headers";
import { Layout } from "@/components/layout";
import { VideoPlayer } from "@/components/video-player";
import { Loader2, ArrowLeft, Calendar, User } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Watch() {
  const { id } = useParams<{ id: string }>();
  const authHeaders = useAuthHeaders();

  const { 
    data: video, 
    isLoading: videoLoading,
    isError: videoError
  } = useGetVideo(id!, { request: authHeaders });

  const { 
    data: manifest, 
    isLoading: manifestLoading,
    isError: manifestError
  } = useGetVideoManifest(id!, { request: authHeaders });

  const isLoading = videoLoading || manifestLoading;
  const isError = videoError || manifestError;

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
        ) : isError || !video || !manifest ? (
          <div className="w-full aspect-video bg-destructive/5 border border-destructive/20 rounded-2xl flex flex-col items-center justify-center text-destructive">
            <p className="text-lg font-medium">Failed to load video</p>
            <p className="text-sm opacity-80 mt-2">The video might be processing or unavailable.</p>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <VideoPlayer 
              manifestUrl={manifest.manifestUrl} 
              poster={video.thumbnailUrl || undefined} 
            />
            
            <div className="mt-8 border-b border-white/10 pb-8">
              <h1 className="text-3xl font-display font-bold text-white mb-4">{video.title}</h1>
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                  <Calendar className="w-4 h-4" />
                  {new Date(video.uploadedAt).toLocaleDateString(undefined, { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </div>
                <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                  <User className="w-4 h-4" />
                  Owner ID: {video.userId}
                </div>
                <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-full border border-primary/20">
                  <span className="relative flex h-2 w-2 mr-1">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                  Ready to Stream
                </div>
              </div>
            </div>
            
            <div className="mt-8">
               <h3 className="text-lg font-semibold text-white mb-4">Description</h3>
               <p className="text-muted-foreground leading-relaxed">
                 {/* Schema doesn't have a description field, using a placeholder text to look complete */}
                 This video was uploaded to StreamVault. The platform automatically processes media to HLS format for adaptive bitrate streaming, ensuring the best possible playback quality based on your network conditions.
               </p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
