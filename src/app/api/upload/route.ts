import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { coderProfiles, portfolioAssets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";

const MAX_SIZE: Record<string, number> = {
  image: 10 * 1024 * 1024,
  gif: 5 * 1024 * 1024,
  video: 50 * 1024 * 1024,
  default: 10 * 1024 * 1024,
};

const ALLOWED_TYPES = new Set([
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "application/pdf",
  "video/mp4", "video/webm", "video/quicktime",
]);

// Explicit extension whitelist. Matched case-insensitively against the
// final dot-segment of the uploaded filename.
const ALLOWED_EXTENSIONS = new Set([
  "jpg", "jpeg", "png", "gif", "webp",
  "pdf",
  "mp4", "webm", "mov",
]);

export async function POST(request: NextRequest) {
  try {
    // Auth and form parsing in parallel where possible
    const [session, formData] = await Promise.all([
      auth(),
      request.formData(),
    ]);

    const file = formData.get("file") as File | null;
    const type = (formData.get("type") as string) || "asset";

    // Application uploads don't require auth (applicants aren't logged in yet)
    // but have stricter limits to prevent abuse
    const isApplicationUpload = type === "application";
    if (!isApplicationUpload && !session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (isApplicationUpload) {
      // Rate-limit unauthenticated application uploads: 5 per IP per hour.
      const rl = checkRateLimit(
        rateLimitKey(request, "upload:application"),
        5,
        60 * 60 * 1000
      );
      if (!rl.allowed) {
        return Response.json(
          { error: "Too many uploads. Please try again later." },
          {
            status: 429,
            headers: {
              "Retry-After": Math.max(
                1,
                Math.ceil((rl.resetAt - Date.now()) / 1000)
              ).toString(),
            },
          }
        );
      }

      // Restrict unauthenticated uploads: images/PDFs only, 5MB max
      const allowedAppTypes = new Set(["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"]);
      if (file && !allowedAppTypes.has(file.type)) {
        return Response.json({ error: "Only images and PDFs are accepted for applications" }, { status: 400 });
      }
      if (file && file.size > 5 * 1024 * 1024) {
        return Response.json({ error: "Application files must be under 5MB" }, { status: 400 });
      }
    }
    const itemId = formData.get("itemId") as string | null;

    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return Response.json({ error: `File type not supported: ${file.type}` }, { status: 400 });
    }

    // Extension whitelist: reject any file whose extension doesn't match.
    // Defense-in-depth in case a malicious client spoofs the Content-Type.
    const extForCheck = (file.name.split(".").pop() || "").toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(extForCheck)) {
      return Response.json(
        { error: `File extension not allowed: .${extForCheck || "(none)"}` },
        { status: 400 }
      );
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

    if (type === "application") {
      path = `applications/${id}.${ext}`;
    } else if (type === "pfp") {
      path = `pfp/${session!.user!.id}.${ext}`;
    } else if (type === "preview") {
      path = `previews/${session!.user!.id}.gif`;
    } else if (type === "asset" && itemId) {
      path = `portfolio/${itemId}/${id}.${ext}`;
    } else {
      path = `uploads/${session!.user!.id}/${id}.${ext}`;
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
        const userId = session?.user?.id;
        if (type === "pfp" && userId) {
          await db.update(coderProfiles)
            .set({ pfpUrl: url, updatedAt: new Date() })
            .where(eq(coderProfiles.userId, userId));
        } else if (type === "preview" && userId) {
          await db.update(coderProfiles)
            .set({ gifPreviewUrl: url, updatedAt: new Date() })
            .where(eq(coderProfiles.userId, userId));
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

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    if (type !== "pfp" && type !== "preview") {
      return Response.json({ error: "Invalid type parameter" }, { status: 400 });
    }

    // Clear the URL in the database
    if (type === "pfp") {
      await db
        .update(coderProfiles)
        .set({ pfpUrl: null, updatedAt: new Date() })
        .where(eq(coderProfiles.userId, session.user.id));
    } else if (type === "preview") {
      await db
        .update(coderProfiles)
        .set({ gifPreviewUrl: null, updatedAt: new Date() })
        .where(eq(coderProfiles.userId, session.user.id));
    }

    // Optionally delete from CDN storage
    const storageKey = process.env.BUNNY_STORAGE_KEY;
    const storageZone = process.env.BUNNY_STORAGE_ZONE || "vibechckd";
    const storageHost = process.env.BUNNY_STORAGE_HOST || "ny.storage.bunnycdn.com";

    if (storageKey) {
      const ext = type === "preview" ? "gif" : "webp";
      const folder = type === "preview" ? "previews" : "pfp";
      const path = `${folder}/${session.user.id}.${ext}`;
      const deleteUrl = `https://${storageHost}/${storageZone}/${path}`;

      // Best-effort CDN deletion -- do not block response on failure
      fetch(deleteUrl, {
        method: "DELETE",
        headers: { AccessKey: storageKey },
      }).catch(() => {});
    }

    return Response.json({ success: true });
  } catch (err: any) {
    console.error("Delete upload error:", err);
    return Response.json({ error: err?.message || "Delete failed" }, { status: 500 });
  }
}
