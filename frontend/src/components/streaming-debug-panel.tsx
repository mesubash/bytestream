import { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import { formatDuration } from "@/lib/utils";
import {
  Activity,
  Download,
  Gauge,
  Layers,
  Wifi,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────

type SegmentState = "not_loaded" | "loading" | "buffered" | "played";

interface SegmentInfo {
  index: number;
  state: SegmentState;
  startTime: number;
  duration: number;
  size: number | null; // bytes, null if not yet loaded
  loadTimeMs: number | null;
}

interface StreamStats {
  bandwidth: number; // bits per second (HLS estimate)
  currentLevel: number;
  totalLevels: number;
  bufferLength: number; // seconds buffered ahead of playhead
  currentSegment: number;
  totalSegments: number;
  segmentDuration: number;
  totalBytesLoaded: number;
  fragmentsLoaded: number;
}

interface Props {
  hls: Hls | null;
  videoElement: HTMLVideoElement | null;
}

// ─── Component ───────────────────────────────────────────────

export function StreamingDebugPanel({ hls, videoElement }: Props) {
  const [segments, setSegments] = useState<SegmentInfo[]>([]);
  const [stats, setStats] = useState<StreamStats>({
    bandwidth: 0,
    currentLevel: 0,
    totalLevels: 0,
    bufferLength: 0,
    currentSegment: -1,
    totalSegments: 0,
    segmentDuration: 0,
    totalBytesLoaded: 0,
    fragmentsLoaded: 0,
  });
  const [eventLog, setEventLog] = useState<string[]>([]);
  const [collapsed, setCollapsed] = useState(false);

  const segmentsRef = useRef<SegmentInfo[]>([]);
  const totalBytesRef = useRef(0);
  const fragsLoadedRef = useRef(0);
  const logRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((msg: string) => {
    const ts = new Date().toLocaleTimeString("en-US", { hour12: false });
    setEventLog((prev) => [...prev.slice(-80), `[${ts}] ${msg}`]);
  }, []);

  // ─── Initialize segments from manifest ─────────────────────

  useEffect(() => {
    if (!hls) return;

    const onLevelLoaded = (_: any, data: { details: { fragments: any[] } }) => {
      const frags = data.details.fragments;
      const mapped: SegmentInfo[] = frags.map((f, i) => ({
        index: i,
        state: "not_loaded" as SegmentState,
        startTime: f.start,
        duration: f.duration,
        size: null,
        loadTimeMs: null,
      }));
      segmentsRef.current = mapped;
      setSegments([...mapped]);
      addLog(`Manifest loaded: ${frags.length} segments, ~${frags[0]?.duration.toFixed(1)}s each`);
    };

    hls.on(Hls.Events.LEVEL_LOADED, onLevelLoaded);
    return () => {
      hls.off(Hls.Events.LEVEL_LOADED, onLevelLoaded);
    };
  }, [hls, addLog]);

  // ─── Track fragment loading / loaded ───────────────────────

  useEffect(() => {
    if (!hls) return;

    /* eslint-disable @typescript-eslint/no-explicit-any */
    // HLS.js event typings are complex — use any for event data, shapes are stable at runtime
    const onFragLoading = (_e: any, data: any) => {
      const sn = data.frag.sn;
      if (typeof sn !== "number") return;
      const seg = segmentsRef.current[sn];
      if (seg) {
        seg.state = "loading";
        setSegments([...segmentsRef.current]);
        addLog(`Downloading segment #${sn}`);
      }
    };

    const onFragLoaded = (_e: any, data: any) => {
      const sn = data.frag.sn;
      if (typeof sn !== "number") return;
      const seg = segmentsRef.current[sn];
      if (seg) {
        const fragStats = data.frag.stats;
        const size: number = data.payload?.byteLength ?? 0;
        const loadTime: number = fragStats?.loading
          ? fragStats.loading.end - fragStats.loading.start
          : 0;

        seg.state = "buffered";
        seg.size = size;
        seg.loadTimeMs = loadTime;
        totalBytesRef.current += size;
        fragsLoadedRef.current += 1;
        setSegments([...segmentsRef.current]);

        const sizeKB = (size / 1024).toFixed(0);
        const speed =
          loadTime > 0
            ? ((size * 8) / (loadTime / 1000) / 1_000_000).toFixed(1)
            : "—";
        addLog(
          `Segment #${sn} loaded: ${sizeKB} KB in ${loadTime.toFixed(0)}ms (${speed} Mbps)`
        );
      }
    };

    const onFragBuffered = (_e: any, data: any) => {
      const sn = data.frag.sn;
      if (typeof sn !== "number") return;
      const seg = segmentsRef.current[sn];
      if (seg && seg.state !== "played") {
        seg.state = "buffered";
        setSegments([...segmentsRef.current]);
      }
    };

    const onError = (_e: any, data: any) => {
      addLog(`${data.fatal ? "FATAL" : "Error"}: ${data.details}`);
    };
    /* eslint-enable @typescript-eslint/no-explicit-any */

    hls.on(Hls.Events.FRAG_LOADING, onFragLoading);
    hls.on(Hls.Events.FRAG_LOADED, onFragLoaded);
    hls.on(Hls.Events.FRAG_BUFFERED, onFragBuffered);
    hls.on(Hls.Events.ERROR, onError);

    return () => {
      hls.off(Hls.Events.FRAG_LOADING, onFragLoading);
      hls.off(Hls.Events.FRAG_LOADED, onFragLoaded);
      hls.off(Hls.Events.FRAG_BUFFERED, onFragBuffered);
      hls.off(Hls.Events.ERROR, onError);
    };
  }, [hls, addLog]);

  // ─── Periodic stats update ─────────────────────────────────

  useEffect(() => {
    if (!hls || !videoElement) return;

    const interval = setInterval(() => {
      const currentTime = videoElement.currentTime;

      // Mark played segments
      let currentSeg = -1;
      segmentsRef.current.forEach((seg, i) => {
        if (currentTime >= seg.startTime + seg.duration && seg.state === "buffered") {
          seg.state = "played";
        }
        if (currentTime >= seg.startTime && currentTime < seg.startTime + seg.duration) {
          currentSeg = i;
        }
      });
      setSegments([...segmentsRef.current]);

      // Buffer length
      let bufferLength = 0;
      for (let i = 0; i < videoElement.buffered.length; i++) {
        if (
          videoElement.buffered.start(i) <= currentTime &&
          videoElement.buffered.end(i) >= currentTime
        ) {
          bufferLength = videoElement.buffered.end(i) - currentTime;
        }
      }

      setStats({
        bandwidth: hls.bandwidthEstimate || 0,
        currentLevel: hls.currentLevel,
        totalLevels: hls.levels?.length || 0,
        bufferLength,
        currentSegment: currentSeg,
        totalSegments: segmentsRef.current.length,
        segmentDuration: segmentsRef.current[0]?.duration || 0,
        totalBytesLoaded: totalBytesRef.current,
        fragmentsLoaded: fragsLoadedRef.current,
      });
    }, 250);

    return () => clearInterval(interval);
  }, [hls, videoElement]);

  // Auto-scroll event log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [eventLog]);

  if (!hls || segments.length === 0) return null;

  const bufferedCount = segments.filter((s) => s.state === "buffered").length;
  const playedCount = segments.filter((s) => s.state === "played").length;
  const loadingCount = segments.filter((s) => s.state === "loading").length;

  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-black/60 backdrop-blur-md overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Activity className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-white">Streaming Internals</span>
          <span className="text-xs text-muted-foreground bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
            {segments.length} segments
          </span>
        </div>
        {collapsed ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {!collapsed && (
        <div className="px-5 pb-5 space-y-5">
          {/* ─── Segment Map ──────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Segment Map
              </span>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-white/10 border border-white/5" />
                  Not loaded
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-500/70" />
                  Downloading
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/70" />
                  Buffered
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-white/20" />
                  Played
                </span>
              </div>
            </div>

            <div className="flex gap-[2px] w-full">
              {segments.map((seg) => {
                const isCurrent = seg.index === stats.currentSegment;
                let bg = "bg-white/10"; // not_loaded
                if (seg.state === "loading") bg = "bg-amber-500/70 animate-pulse";
                if (seg.state === "buffered") bg = "bg-emerald-500/70";
                if (seg.state === "played") bg = "bg-white/20";

                return (
                  <div
                    key={seg.index}
                    className="group relative"
                    style={{ flex: 1, minWidth: 0 }}
                  >
                    <div
                      className={`h-7 rounded-sm transition-all duration-200 ${bg} ${
                        isCurrent
                          ? "ring-2 ring-primary ring-offset-1 ring-offset-black/60 scale-y-110"
                          : "hover:brightness-125"
                      }`}
                    />
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20 pointer-events-none">
                      <div className="bg-black/95 border border-white/10 rounded-lg px-3 py-2 text-[11px] text-white whitespace-nowrap shadow-xl">
                        <div className="font-semibold text-primary mb-1">
                          Segment #{seg.index}
                        </div>
                        <div>Time: {formatDuration(seg.startTime)}</div>
                        <div>Duration: {seg.duration.toFixed(1)}s</div>
                        <div>
                          Status:{" "}
                          <span
                            className={
                              seg.state === "buffered"
                                ? "text-emerald-400"
                                : seg.state === "loading"
                                  ? "text-amber-400"
                                  : seg.state === "played"
                                    ? "text-white/50"
                                    : "text-white/30"
                            }
                          >
                            {seg.state}
                          </span>
                        </div>
                        {seg.size != null && (
                          <div>Size: {(seg.size / 1024).toFixed(0)} KB</div>
                        )}
                        {seg.loadTimeMs != null && (
                          <div>Load time: {seg.loadTimeMs.toFixed(0)}ms</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Segment counts */}
            <div className="flex gap-4 mt-2 text-[11px] text-muted-foreground">
              <span>
                {playedCount} played
              </span>
              <span>
                {bufferedCount} buffered
              </span>
              <span>
                {loadingCount} downloading
              </span>
              <span>
                {segments.length - playedCount - bufferedCount - loadingCount} pending
              </span>
            </div>
          </div>

          {/* ─── Live Stats ───────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              icon={<Layers className="w-3.5 h-3.5" />}
              label="Current Segment"
              value={
                stats.currentSegment >= 0
                  ? `#${stats.currentSegment} / ${stats.totalSegments}`
                  : `— / ${stats.totalSegments}`
              }
            />
            <StatCard
              icon={<Gauge className="w-3.5 h-3.5" />}
              label="Buffer Health"
              value={`${stats.bufferLength.toFixed(1)}s ahead`}
              status={
                stats.bufferLength > 10
                  ? "good"
                  : stats.bufferLength > 3
                    ? "ok"
                    : "low"
              }
            />
            <StatCard
              icon={<Wifi className="w-3.5 h-3.5" />}
              label="Bandwidth"
              value={`${(stats.bandwidth / 1_000_000).toFixed(1)} Mbps`}
            />
            <StatCard
              icon={<Download className="w-3.5 h-3.5" />}
              label="Downloaded"
              value={`${(stats.totalBytesLoaded / (1024 * 1024)).toFixed(1)} MB`}
              sub={`${stats.fragmentsLoaded} fragments`}
            />
          </div>

          {/* ─── Buffer Window Visualization ──────────────────── */}
          <div>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Buffer Window
            </span>
            <div className="mt-2 relative h-6 bg-white/5 rounded-full overflow-hidden border border-white/5">
              {/* Buffered range */}
              {videoElement && stats.totalSegments > 0 && (
                <>
                  {Array.from({ length: videoElement.buffered.length }).map((_, i) => {
                    const start = videoElement.buffered.start(i);
                    const end = videoElement.buffered.end(i);
                    const duration = videoElement.duration || 1;
                    return (
                      <div
                        key={i}
                        className="absolute inset-y-0 bg-emerald-500/30 border-x border-emerald-500/50"
                        style={{
                          left: `${(start / duration) * 100}%`,
                          width: `${((end - start) / duration) * 100}%`,
                        }}
                      />
                    );
                  })}
                  {/* Playhead */}
                  <div
                    className="absolute inset-y-0 w-0.5 bg-primary shadow-[0_0_6px_rgba(6,182,212,0.8)] z-10"
                    style={{
                      left: `${
                        ((videoElement.currentTime || 0) / (videoElement.duration || 1)) * 100
                      }%`,
                    }}
                  />
                </>
              )}
            </div>
            <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
              <span>0:00</span>
              <span>{formatDuration(videoElement?.duration)}</span>
            </div>
          </div>

          {/* ─── Event Log ────────────────────────────────────── */}
          <div>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Event Log
            </span>
            <div
              ref={logRef}
              className="mt-2 h-32 overflow-y-auto rounded-lg bg-black/80 border border-white/5 p-3 font-mono text-[11px] leading-relaxed text-white/60 scrollbar-thin"
            >
              {eventLog.length === 0 ? (
                <span className="text-white/20">Waiting for events...</span>
              ) : (
                eventLog.map((line, i) => (
                  <div
                    key={i}
                    className={
                      line.includes("FATAL") || line.includes("Error")
                        ? "text-red-400"
                        : line.includes("loaded")
                          ? "text-emerald-400/80"
                          : line.includes("Downloading")
                            ? "text-amber-400/80"
                            : ""
                    }
                  >
                    {line}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Stat Card ───────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  sub,
  status,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  status?: "good" | "ok" | "low";
}) {
  const statusColor =
    status === "good"
      ? "text-emerald-400"
      : status === "ok"
        ? "text-amber-400"
        : status === "low"
          ? "text-red-400"
          : "text-white";

  return (
    <div className="rounded-xl bg-white/5 border border-white/5 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
        {icon}
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <div className={`text-sm font-semibold tabular-nums ${statusColor}`}>
        {value}
      </div>
      {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}
