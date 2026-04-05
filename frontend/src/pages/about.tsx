import { Layout } from "@/components/layout";
import { Activity, Cpu, Database, Film, HardDrive, Layers, Radio, Zap } from "lucide-react";

export default function About() {
  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-12">
        {/* Hero */}
        <div>
          <h1 className="text-4xl font-display font-bold text-white mb-3">
            About ByteStream
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            ByteStream is a video streaming platform built to understand how modern streaming
            actually works under the hood — from upload to HLS segmentation to adaptive playback.
          </p>
        </div>

        {/* What it does */}
        <section className="glass-panel rounded-2xl p-6 border-t border-white/10 space-y-4">
          <h2 className="text-xl font-display font-semibold text-white">What does it do?</h2>
          <p className="text-muted-foreground leading-relaxed">
            Upload a video, and ByteStream processes it into HLS (HTTP Live Streaming) segments using
            FFmpeg. The segments are stored on Cloudflare R2, and the frontend plays them using adaptive
            bitrate streaming via HLS.js. You can see the entire process in real time through the
            Streaming Debug Panel on the watch page.
          </p>
        </section>

        {/* How streaming works */}
        <section className="space-y-4">
          <h2 className="text-xl font-display font-semibold text-white">How Streaming Works</h2>
          <div className="grid gap-3">
            <Step
              icon={<Film className="w-4 h-4" />}
              title="1. Upload"
              desc="You upload a video file (MP4, MKV, MOV). The backend saves it temporarily and returns immediately."
            />
            <Step
              icon={<Cpu className="w-4 h-4" />}
              title="2. FFmpeg Processing"
              desc="In the background, FFmpeg splits the video into 4-second .ts segments and generates a .m3u8 manifest playlist. A thumbnail is extracted at the 5-second mark."
            />
            <Step
              icon={<HardDrive className="w-4 h-4" />}
              title="3. Storage"
              desc="All segments, the manifest, and the thumbnail are uploaded to Cloudflare R2 (S3-compatible object storage). The server never serves video data directly."
            />
            <Step
              icon={<Radio className="w-4 h-4" />}
              title="4. Playback"
              desc="The frontend fetches the .m3u8 manifest URL from the backend, then HLS.js takes over — downloading segments directly from R2 and feeding them to the video element."
            />
            <Step
              icon={<Activity className="w-4 h-4" />}
              title="5. Debug Panel"
              desc="The Streaming Internals panel shows every segment being downloaded in real time — buffer health, bandwidth, segment map, and an event log. This is how Netflix and YouTube work, made visible."
            />
          </div>
        </section>

        {/* Architecture */}
        <section className="glass-panel rounded-2xl p-6 border-t border-white/10 space-y-4">
          <h2 className="text-xl font-display font-semibold text-white">Architecture</h2>
          <pre className="text-sm text-muted-foreground font-mono bg-black/40 rounded-xl p-4 border border-white/5 overflow-x-auto">
{`Browser (React + HLS.js)
     │
     ▼
Spring Boot API ──→ FFmpeg
     │                 │
     ▼                 ▼
PostgreSQL      Cloudflare R2
(metadata)      (.m3u8 + .ts segments)`}
          </pre>
          <p className="text-muted-foreground text-sm">
            The backend handles uploads, processing, and metadata. It never streams video — that's
            all R2. This is the same pattern used by production streaming platforms.
          </p>
        </section>

        {/* Tech stack */}
        <section className="space-y-4">
          <h2 className="text-xl font-display font-semibold text-white">Tech Stack</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <StackCard icon={<Zap />} title="Frontend" items={["React 19", "TypeScript", "Vite", "Tailwind CSS 4", "HLS.js", "TanStack Query"]} />
            <StackCard icon={<Database />} title="Backend" items={["Spring Boot 4", "FFmpeg", "PostgreSQL (Neon)", "Cloudflare R2", "Bucket4j (rate limiting)"]} />
          </div>
        </section>

        {/* What you learn */}
        <section className="glass-panel rounded-2xl p-6 border-t border-white/10 space-y-4">
          <h2 className="text-xl font-display font-semibold text-white">What This Project Teaches</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-muted-foreground text-sm">
            {[
              "HLS streaming protocol",
              "Video segmentation with FFmpeg",
              "Async processing pipelines",
              "S3-compatible object storage",
              "Adaptive bitrate playback",
              "Buffer management strategies",
              "Rate limiting with token buckets",
              "Media Source Extensions",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-primary shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        <div className="text-center text-xs text-muted-foreground pb-8">
          Built by Subash &middot; Source on GitHub
        </div>
      </div>
    </Layout>
  );
}

function Step({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors">
      <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center text-primary shrink-0 mt-0.5">
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-semibold text-white mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function StackCard({ icon, title, items }: { icon: React.ReactNode; title: string; items: string[] }) {
  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/5 p-4 space-y-3">
      <div className="flex items-center gap-2 text-white">
        <span className="text-primary w-4 h-4">{icon}</span>
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item} className="text-sm text-muted-foreground flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-primary/60" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
