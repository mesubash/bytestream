import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const videosTable = pgTable("videos", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  duration: integer("duration"),
  status: text("status", { enum: ["processing", "ready", "failed"] }).notNull().default("processing"),
  manifestUrl: text("manifest_url"),
  filePath: text("file_path"),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

export const insertVideoSchema = createInsertSchema(videosTable).omit({ id: true, uploadedAt: true });
export type InsertVideo = z.infer<typeof insertVideoSchema>;
export type Video = typeof videosTable.$inferSelect;
