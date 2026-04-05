import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground p-4">
      <div className="text-center glass-panel p-10 rounded-3xl max-w-md w-full relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
        <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-10 h-10 text-destructive" />
        </div>
        <h1 className="text-4xl font-display font-bold text-white mb-2">404</h1>
        <p className="text-muted-foreground mb-8">The page you are looking for doesn't exist or has been moved.</p>
        <Link href="/">
          <Button size="lg" className="w-full">Return Home</Button>
        </Link>
      </div>
    </div>
  );
}
