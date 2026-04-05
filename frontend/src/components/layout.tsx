import React from "react";
import { Link, useLocation } from "wouter";
import { Play, Upload, Video, Info } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      <header
        className="sticky top-0 z-50 w-full border-b border-white/5 bg-background/80 backdrop-blur-xl"
        style={{ boxShadow: "0 1px 0 rgba(6,182,212,0.15), 0 4px 20px rgba(6,182,212,0.05)" }}
      >
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30 group-hover:bg-primary/30 transition-colors">
              <Play className="w-4 h-4 text-primary ml-0.5" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight text-white group-hover:text-primary transition-colors hover:drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]">
              ByteStream
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            <Link
              href="/dashboard"
              className={`text-sm font-medium transition-colors px-3 py-2 rounded-md flex items-center gap-2 ${
                location === "/dashboard"
                  ? "text-white bg-white/5"
                  : "text-muted-foreground hover:text-white hover:bg-white/5"
              }`}
            >
              <Video className="w-4 h-4" />
              <span className="hidden sm:inline">Library</span>
            </Link>
            <Link
              href="/upload"
              className={`text-sm font-medium transition-colors px-3 py-2 rounded-md flex items-center gap-2 ${
                location === "/upload"
                  ? "text-white bg-white/5"
                  : "text-muted-foreground hover:text-white hover:bg-white/5"
              }`}
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Upload</span>
            </Link>
            <Link
              href="/about"
              className={`text-sm font-medium transition-colors px-3 py-2 rounded-md flex items-center gap-2 ${
                location === "/about"
                  ? "text-white bg-white/5"
                  : "text-muted-foreground hover:text-white hover:bg-white/5"
              }`}
            >
              <Info className="w-4 h-4" />
              <span className="hidden sm:inline">About</span>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 animate-fade-in-up">
        {children}
      </main>
    </div>
  );
}
