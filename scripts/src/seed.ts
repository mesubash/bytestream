import { db, usersTable, videosTable } from "@workspace/db";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

async function seed() {
  const email = "demo@example.com";
  const password = "demo123";

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing) {
    console.log("Demo user already exists");
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db
    .insert(usersTable)
    .values({ email, passwordHash, name: "Demo User" })
    .returning();

  console.log(`Created demo user: ${user.email} (id: ${user.id})`);

  const demoVideos = [
    {
      title: "Big Buck Bunny",
      thumbnailUrl: "https://peach.blender.org/wp-content/uploads/title_anouncement.jpg",
      duration: 596,
      status: "ready" as const,
      manifestUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
      userId: user.id,
    },
    {
      title: "Elephant Dream",
      thumbnailUrl: "https://orange.blender.org/wp-content/uploads/title_anouncement.jpg",
      duration: 654,
      status: "ready" as const,
      manifestUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
      userId: user.id,
    },
    {
      title: "HLS Test Stream",
      thumbnailUrl: null,
      duration: 180,
      status: "ready" as const,
      manifestUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
      userId: user.id,
    },
  ];

  for (const v of demoVideos) {
    const [video] = await db.insert(videosTable).values(v).returning();
    console.log(`Created video: ${video.title} (id: ${video.id})`);
  }

  console.log("Seed complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
