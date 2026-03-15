import React, { useRef, useState } from "react";
import { Link } from "wouter";
import { type Video } from "@/lib/api";
import { formatDuration } from "@/lib/utils";
import { PlayCircle, Clock, AlertCircle, Loader2 } from "lucide-react";

interface VideoCardProps {
  video: Video;
}

export function VideoCard({ video }: VideoCardProps) {
  const isReady = video.status === "ready";
  const isProcessing = video.status === "processing";
  const isFailed = video.status === "failed";

  const cardRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState({});
  const [glareStyle, setGlareStyle] = useState({ opacity: 0, transform: "translate(-50%, -50%)" });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const maxTilt = 12;
    setStyle({
      transform: `perspective(1000px) rotateX(${((y - cy) / cy) * -maxTilt}deg) rotateY(${((x - cx) / cx) * maxTilt}deg)`,
      transition: "transform 0.1s ease",
    });
    setGlareStyle({ opacity: 0.15, transform: `translate(${x}px, ${y}px) translate(-50%, -50%)` });
  };

  const handleMouseLeave = () => {
    setStyle({ transform: "perspective(1000px) rotateX(0deg) rotateY(0deg)", transition: "transform 0.5s ease" });
    setGlareStyle({ opacity: 0, transform: "translate(-50%, -50%)" });
  };

  const content = (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="group relative flex flex-col rounded-2xl bg-card border border-white/5 overflow-hidden hover:border-white/10 transition-colors duration-300 hover:shadow-2xl hover:shadow-primary/20 hover:-translate-y-1"
      style={style}
    >
      <div
        className="pointer-events-none absolute left-0 top-0 z-10 h-64 w-64 rounded-full bg-white blur-3xl transition-opacity duration-300 mix-blend-overlay"
        style={glareStyle}
      />

      <div className="aspect-video w-full bg-secondary/50 relative overflow-hidden">
        {video.thumbnailUrl ? (
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-gradient-to-br from-black/20 to-black/60">
            {isProcessing && <Loader2 className="w-8 h-8 animate-spin mb-2 text-primary" />}
            {isFailed && <AlertCircle className="w-8 h-8 mb-2 text-destructive" />}
            {!isProcessing && !isFailed && <PlayCircle className="w-8 h-8 mb-2 opacity-50" />}
          </div>
        )}

        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
          {isReady ? (
            <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.6)] scale-90 group-hover:scale-100 transition-transform duration-300">
              <PlayCircle className="w-8 h-8 text-primary-foreground ml-1" />
            </div>
          ) : isProcessing ? (
            <span className="px-3 py-1.5 rounded-full bg-black/80 text-primary text-sm font-medium border border-primary/20 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Processing
            </span>
          ) : (
            <span className="px-3 py-1.5 rounded-full bg-destructive/90 text-white text-sm font-medium">
              Processing Failed
            </span>
          )}
        </div>

        {isReady && video.duration && (
          <div className="absolute bottom-2 right-2 px-2 py-1 rounded-md bg-black/80 backdrop-blur-md text-xs font-medium text-white flex items-center gap-1.5 shadow-lg border border-white/10">
            <Clock className="w-3 h-3 text-primary" />
            {formatDuration(video.duration)}
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-display font-semibold text-base line-clamp-2 text-white group-hover:text-primary transition-colors leading-snug">
          {video.title}
        </h3>
        <p className="mt-2 text-xs text-muted-foreground">
          {new Date(video.uploadedAt).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </p>
      </div>
    </div>
  );

  if (isReady) return <Link href={`/watch/${video.id}`}>{content}</Link>;
  return <div className="opacity-75 cursor-not-allowed">{content}</div>;
}
