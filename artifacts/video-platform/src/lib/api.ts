const BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export interface Video {
  id: number | string;
  title: string;
  status: "processing" | "ready" | "failed";
  thumbnailUrl?: string | null;
  duration?: number | null;
  uploadedAt: string;
  manifestUrl?: string | null;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  listVideos: () => request<Video[]>("/api/videos"),
  getVideo: (id: string) => request<Video>(`/api/videos/${id}`),
};
