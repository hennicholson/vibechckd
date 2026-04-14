import { auth } from "@/lib/auth";
import { db } from "@/db";
import { coderProfiles, portfolioAssets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { uploadToBunny } from "@/lib/bunny";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const VIDEO_TYPES = ["video/mp4", "video/webm"];
const DOC_TYPES = ["application/pdf"];
const ALL_ALLOWED = [...IMAGE_TYPES, ...VIDEO_TYPES, ...DOC_TYPES];

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_GIF_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50 MB

function getExtension(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "bin";
}

function getMaxSize(contentType: string): number {
  if (contentType === "image/gif") return MAX_GIF_SIZE;
  if (VIDEO_TYPES.includes(contentType)) return MAX_VIDEO_SIZE;
  return MAX_IMAGE_SIZE;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const type = formData.get("type") as string | null;
  const itemId = formData.get("itemId") as string | null;

  if (!file || !type) {
    return Response.json(
      { error: "Missing required fields: file and type" },
      { status: 400 }
    );
  }

  if (!["pfp", "preview", "asset"].includes(type)) {
    return Response.json(
      { error: "Invalid type. Must be pfp, preview, or asset" },
      { status: 400 }
    );
  }

  if (type === "asset" && !itemId) {
    return Response.json(
      { error: "itemId is required for asset uploads" },
      { status: 400 }
    );
  }

  // Validate content type
  if (!ALL_ALLOWED.includes(file.type)) {
    return Response.json(
      { error: `File type not allowed: ${file.type}` },
      { status: 400 }
    );
  }

  // Validate size
  const maxSize = getMaxSize(file.type);
  if (file.size > maxSize) {
    const maxMB = Math.round(maxSize / (1024 * 1024));
    return Response.json(
      { error: `File too large. Maximum ${maxMB}MB for this file type` },
      { status: 400 }
    );
  }

  // Build storage path
  const ext = getExtension(file.name);
  let storagePath: string;

  switch (type) {
    case "pfp":
      storagePath = `pfp/${userId}.${ext}`;
      break;
    case "preview":
      storagePath = `previews/${userId}.gif`;
      break;
    case "asset":
      storagePath = `portfolio/${itemId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      break;
    default:
      return Response.json({ error: "Invalid type" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const cdnUrl = await uploadToBunny(buffer, storagePath, file.type);

    // Update database
    if (type === "pfp") {
      await db
        .update(coderProfiles)
        .set({ pfpUrl: cdnUrl, updatedAt: new Date() })
        .where(eq(coderProfiles.userId, userId));
    } else if (type === "preview") {
      // Store GIF preview URL in the tags array as a special entry
      // Convention: tag starting with "gif_preview:" holds the URL
      const [profile] = await db
        .select({ tags: coderProfiles.tags })
        .from(coderProfiles)
        .where(eq(coderProfiles.userId, userId))
        .limit(1);

      if (profile) {
        const existingTags = (profile.tags || []).filter(
          (t) => !t.startsWith("gif_preview:")
        );
        await db
          .update(coderProfiles)
          .set({
            tags: [...existingTags, `gif_preview:${cdnUrl}`],
            updatedAt: new Date(),
          })
          .where(eq(coderProfiles.userId, userId));
      }
    } else if (type === "asset" && itemId) {
      await db
        .update(portfolioAssets)
        .set({ fileUrl: cdnUrl })
        .where(eq(portfolioAssets.id, itemId));
    }

    return Response.json({ success: true, url: cdnUrl });
  } catch (error) {
    console.error("Upload error:", error);
    return Response.json(
      { error: "Upload failed. Please try again." },
      { status: 500 }
    );
  }
}
