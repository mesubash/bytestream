import axios from "axios";

const BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export type VideoStatus = "UPLOADING" | "PROCESSING" | "READY" | "FAILED";

export interface VideoSummary {
  id: string;
  title: string;
  durationSeconds: number | null;
  status: VideoStatus;
  thumbnailUrl: string | null;
  createdAt: string;
}

export interface VideoDetail extends VideoSummary {
  description: string | null;
  originalFilename: string | null;
  processingLogs: string[];
}

export interface ManifestResponse {
  videoId: string;
  manifestUrl: string;
  status: VideoStatus;
}

export interface UploadResponse {
  videoId: string;
  title: string;
  status: VideoStatus;
  message: string;
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
  listVideos: () => request<VideoSummary[]>("/api/v1/videos"),

  getVideo: (id: string) => request<VideoDetail>(`/api/v1/videos/${id}`),

  getManifest: (id: string) => request<ManifestResponse>(`/api/v1/videos/${id}/manifest`),

  uploadVideo: (file: File, title: string, onProgress?: (percent: number) => void) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);
    return axios.post<UploadResponse>(`${BASE}/api/v1/videos/upload`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (e) => {
        if (onProgress) onProgress(Math.round((e.loaded * 100) / (e.total ?? 1)));
      },
    });
  },

  deleteVideo: (id: string) => request<void>(`/api/v1/videos/${id}`, { method: "DELETE" }),
};
