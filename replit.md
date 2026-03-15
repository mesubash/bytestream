# ByteStream — Video Streaming Platform

## Overview
A React + Vite frontend for a video streaming platform. The backend is a **Spring application** (external). No authentication — all routes are publicly accessible.

## Structure

```
artifacts/
  video-platform/       ← React + Vite frontend (the only artifact)
    src/
      components/
        cursor-trail.tsx     ← Canvas particle cursor effect
        layout.tsx           ← App shell with top nav
        mouse-spotlight.tsx  ← Mouse glow spotlight effect
        video-card.tsx       ← Video grid card with 3D tilt
        video-player.tsx     ← HLS.js video player with custom controls
        ui/
          button.tsx
          input.tsx
          toast.tsx / toaster.tsx
          tooltip.tsx
      hooks/
        use-toast.ts         ← Toast state management
        use-mobile.tsx
      lib/
        api.ts               ← Typed fetch wrapper for Spring API
        utils.ts
      pages/
        dashboard.tsx        ← Video library grid
        upload.tsx           ← Upload form with progress bar
        watch.tsx            ← Video watch page
        not-found.tsx
      App.tsx                ← Router (no auth)
      index.css              ← Tailwind theme, dot grid, animations
      main.tsx
```

## API Integration

The frontend calls the Spring backend via the `api` object in `src/lib/api.ts`.

**Configure the Spring backend URL** via environment variable:
```
VITE_API_BASE_URL=http://localhost:8080
```
If unset, defaults to same-origin (empty string), which works when Spring is proxied.

**Expected endpoints:**
- `GET /api/videos` → `Video[]`
- `GET /api/videos/:id` → `Video`
- `POST /api/videos/upload` → multipart form upload

**Video type:**
```ts
interface Video {
  id: number | string;
  title: string;
  status: "processing" | "ready" | "failed";
  thumbnailUrl?: string | null;
  duration?: number | null;
  uploadedAt: string;      // ISO date string
  manifestUrl?: string | null;  // HLS .m3u8 URL
}
```

## Design
- Dark near-black background (`hsl(240 10% 4%)`)
- Electric teal/cyan primary (`hsl(189 94% 43%)`)
- Plus Jakarta Sans font
- Animated dot grid background
- Canvas-based teal particle cursor trail
- Subtle mouse spotlight glow
- 3D card tilt effect on video cards
- Glass panel on upload form
- Toast notifications (success, error, info, warning variants)

## Development

```bash
pnpm --filter @workspace/video-platform run dev
```

No database, no auth — pure frontend connecting to Spring.
