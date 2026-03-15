import React from "react";
import { Link, useLocation } from "wouter";
import { useAuthStore } from "@/store/use-auth";
import { Play, Upload, LogOut, Video } from "lucide-react";
import { Button } from "./ui/button";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const logout = useAuthStore((s) => s.logout);

  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-background/80 backdrop-blur-xl" style={{ boxShadow: "0 1px 0 rgba(6,182,212,0.15), 0 4px 20px rgba(6,182,212,0.05)" }}>
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30 group-hover:bg-primary/30 transition-colors">
              <Play className="w-4 h-4 text-primary ml-0.5" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight text-white group-hover:text-primary transition-colors hover:drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]">
              ByteStream
            </span>
          </Link>

          <nav className="flex items-center gap-2 md:gap-4">
            <Link 
              href="/dashboard" 
              className={`text-sm font-medium transition-colors px-3 py-2 rounded-md ${
                location === '/dashboard' ? 'text-white bg-white/5' : 'text-muted-foreground hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4" />
                <span className="hidden sm:inline">Library</span>
              </div>
            </Link>
            <Link 
              href="/upload" 
              className={`text-sm font-medium transition-colors px-3 py-2 rounded-md ${
                location === '/upload' ? 'text-white bg-white/5' : 'text-muted-foreground hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">Upload</span>
              </div>
            </Link>
            <div className="w-px h-4 bg-white/10 mx-2" />
            <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground hover:text-destructive">
              <LogOut className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 animate-fade-in-up">
        {children}
      </main>
    </div>
  );
}
