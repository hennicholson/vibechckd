import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { uploadToBunny } from "@/lib/bunny";
import { db } from "@/db";
import { coderProfiles, portfolioAssets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

const MAX_SIZE: Record<string, number> = {
  image: 10 * 1024 * 1024,   // 10MB
  gif: 5 * 1024 * 1024,      // 5MB
  video: 50 * 1024 * 1024,   // 50MB
  default: 10 * 1024 * 1024,
};

const ALLOWED_TYPES = [
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "application/pdf",
  "video/mp4", "video/webm",
];

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const type = (formData.get("type") as string) || "asset";
  const itemId = formData.get("itemId") as string | null;

  if (!file) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }

  // Validate content type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return Response.json({ error: "File type not supported" }, { status: 400 });
  }

  // Validate size
  const sizeCategory = file.type.startsWith("video/") ? "video" : file.type === "image/gif" ? "gif" : "image";
  const maxSize = MAX_SIZE[sizeCategory] || MAX_SIZE.default;
  if (file.size > maxSize) {
    return Response.json({ error: `File too large. Max ${Math.round(maxSize / 1024 / 1024)}MB` }, { status: 400 });
  }

  // Build storage path
  const ext = file.name.split(".").pop() || "bin";
  const safeName = `${randomUUID()}.${ext}`;
  let path: string;

  if (type === "pfp") {
    path = `pfp/${session.user.id}.${ext}`;
  } else if (type === "preview") {
    path = `previews/${session.user.id}.gif`;
  } else if (type === "asset" && itemId) {
    path = `portfolio/${itemId}/${safeName}`;
  } else {
    path = `uploads/${session.user.id}/${safeName}`;
  }

  let url: string;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    url = await uploadToBunny(buffer, path, file.type || "application/octet-stream");
  } catch (error) {
    console.error("CDN upload failed:", error);
    return Response.json({ error: "Upload to CDN failed. Please try again." }, { status: 502 });
  }

  // Update database based on upload type
  try {
    if (type === "pfp") {
      await db.update(coderProfiles)
        .set({ pfpUrl: url, updatedAt: new Date() })
        .where(eq(coderProfiles.userId, session.user.id));
    } else if (type === "preview") {
      await db.update(coderProfiles)
        .set({ gifPreviewUrl: url, updatedAt: new Date() })
        .where(eq(coderProfiles.userId, session.user.id));
    } else if (type === "asset" && itemId) {
      // Update the specific asset's file_url if an assetId is provided
      const assetId = formData.get("assetId") as string | null;
      if (assetId) {
        await db.update(portfolioAssets)
          .set({ fileUrl: url })
          .where(eq(portfolioAssets.id, assetId));
      }
    }
  } catch (error) {
    console.error("DB update after upload:", error);
    // File is uploaded to CDN even if DB update fails — return the URL
  }

  return Response.json({ success: true, url, filename: file.name });
}
