import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { coderProfiles, portfolioAssets } from "@/db/schema";
import { eq } from "drizzle-orm";

const MAX_SIZE: Record<string, number> = {
  image: 10 * 1024 * 1024,
  gif: 5 * 1024 * 1024,
  video: 50 * 1024 * 1024,
  default: 10 * 1024 * 1024,
};

const ALLOWED_TYPES = new Set([
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "application/pdf",
  "video/mp4", "video/webm",
]);

export async function POST(request: NextRequest) {
  try {
    // Auth and form parsing in parallel where possible
    const [session, formData] = await Promise.all([
      auth(),
      request.formData(),
    ]);

    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const file = formData.get("file") as File | null;
    const type = (formData.get("type") as string) || "asset";
    const itemId = formData.get("itemId") as string | null;

    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return Response.json({ error: `File type not supported: ${file.type}` }, { status: 400 });
    }

    const sizeCategory = file.type.startsWith("video/") ? "video" : file.type === "image/gif" ? "gif" : "image";
    const maxSize = MAX_SIZE[sizeCategory] || MAX_SIZE.default;
    if (file.size > maxSize) {
      return Response.json({ error: `File too large. Max ${Math.round(maxSize / 1024 / 1024)}MB` }, { status: 400 });
    }

    // Build storage path
    const ext = file.name.split(".").pop() || "bin";
    const id = crypto.randomUUID();
    let path: string;

    if (type === "pfp") {
      path = `pfp/${session.user.id}.${ext}`;
    } else if (type === "preview") {
      path = `previews/${session.user.id}.gif`;
    } else if (type === "asset" && itemId) {
      path = `portfolio/${itemId}/${id}.${ext}`;
    } else {
      path = `uploads/${session.user.id}/${id}.${ext}`;
    }

    // Get env vars
    const storageKey = process.env.BUNNY_STORAGE_KEY;
    const storageZone = process.env.BUNNY_STORAGE_ZONE || "vibechckd";
    const storageHost = process.env.BUNNY_STORAGE_HOST || "ny.storage.bunnycdn.com";
    const cdnUrl = process.env.BUNNY_CDN_URL || "https://vibechckd-cdn.b-cdn.net";

    if (!storageKey) {
      return Response.json({ error: "CDN not configured" }, { status: 500 });
    }

    // Upload directly to Bunny — stream the file without buffering into Buffer
    const arrayBuffer = await file.arrayBuffer();
    const uploadUrl = `https://${storageHost}/${storageZone}/${path}`;

    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        AccessKey: storageKey,
        "Content-Type": file.type || "application/octet-stream",
      },
      body: new Uint8Array(arrayBuffer),
    });

    if (!uploadRes.ok) {
      const text = await uploadRes.text().catch(() => "");
      return Response.json({ error: `CDN upload failed (${uploadRes.status}): ${text}` }, { status: 502 });
    }

    // Append cache-bust for static paths (pfp/preview use fixed filenames)
    const cacheBust = (type === "pfp" || type === "preview") ? `?v=${Date.now()}` : "";
    const url = `${cdnUrl}/${path}${cacheBust}`;

    // Update database in the background — don't block the response
    const dbUpdatePromise = (async () => {
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
          const assetId = formData.get("assetId") as string | null;
          if (assetId) {
            await db.update(portfolioAssets)
              .set({ fileUrl: url })
              .where(eq(portfolioAssets.id, assetId));
          }
        }
      } catch (e) {
        console.error("DB update after upload:", e);
      }
    })();

    // Wait for DB but with a timeout — if it takes >2s, respond anyway
    await Promise.race([
      dbUpdatePromise,
      new Promise(resolve => setTimeout(resolve, 2000)),
    ]);

    return Response.json({ success: true, url, filename: file.name });
  } catch (err: any) {
    console.error("Upload error:", err);
    return Response.json({ error: err?.message || "Upload failed" }, { status: 500 });
  }
}
