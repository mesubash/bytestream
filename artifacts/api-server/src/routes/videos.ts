import { Router, type IRouter } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db, videosTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router: IRouter = Router();

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("video/")) {
      cb(null, true);
    } else {
      cb(new Error("Only video files are allowed"));
    }
  },
});

function serializeVideo(video: typeof videosTable.$inferSelect) {
  return {
    id: video.id,
    title: video.title,
    thumbnailUrl: video.thumbnailUrl ?? null,
    duration: video.duration ?? null,
    status: video.status,
    uploadedAt: video.uploadedAt.toISOString(),
    userId: video.userId,
  };
}

router.get("/", async (req: AuthRequest, res) => {
  req.userId = 1;
  try {
    const videos = await db.select().from(videosTable).orderBy(videosTable.uploadedAt);
    res.json(videos.map(serializeVideo));
  } catch (err) {
    console.error("List videos error:", err);
    res.status(500).json({ error: "Server error", message: "Failed to fetch videos" });
  }
});

router.post("/upload", upload.single("file"), async (req: AuthRequest, res) => {
  req.userId = req.userId ?? 1;
  const { title } = req.body;
  if (!title || typeof title !== "string") {
    res.status(400).json({ error: "Bad request", message: "Title is required" });
    return;
  }

  if (!req.file) {
    res.status(400).json({ error: "Bad request", message: "Video file is required" });
    return;
  }

  try {
    const filePath = req.file.path;
    const manifestUrl = `/api/videos/stream/${req.file.filename}`;

    const [video] = await db
      .insert(videosTable)
      .values({
        title,
        filePath,
        manifestUrl,
        status: "ready",
        userId: req.userId!,
      })
      .returning();

    res.status(201).json(serializeVideo(video));
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Server error", message: "Upload failed" });
  }
});

router.get("/:id", async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id ?? "");
  if (isNaN(id)) {
    res.status(400).json({ error: "Bad request", message: "Invalid video ID" });
    return;
  }

  try {
    const [video] = await db.select().from(videosTable).where(eq(videosTable.id, id));
    if (!video) {
      res.status(404).json({ error: "Not found", message: "Video not found" });
      return;
    }
    res.json(serializeVideo(video));
  } catch (err) {
    console.error("Get video error:", err);
    res.status(500).json({ error: "Server error", message: "Failed to fetch video" });
  }
});

router.get("/:id/manifest", async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id ?? "");
  if (isNaN(id)) {
    res.status(400).json({ error: "Bad request", message: "Invalid video ID" });
    return;
  }

  try {
    const [video] = await db.select().from(videosTable).where(eq(videosTable.id, id));
    if (!video) {
      res.status(404).json({ error: "Not found", message: "Video not found" });
      return;
    }

    const manifestUrl = video.manifestUrl ?? `/api/videos/stream/${video.id}`;
    res.json({
      videoId: video.id,
      manifestUrl,
      title: video.title,
    });
  } catch (err) {
    console.error("Get manifest error:", err);
    res.status(500).json({ error: "Server error", message: "Failed to fetch manifest" });
  }
});

export default router;
