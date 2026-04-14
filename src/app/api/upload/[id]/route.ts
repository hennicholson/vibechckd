import { auth } from "@/lib/auth";
import { db } from "@/db";
import { coderProfiles, portfolioAssets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { deleteFromBunny } from "@/lib/bunny";

/**
 * Extract the Bunny CDN storage path from a full CDN URL.
 * e.g. "https://vibechckd-cdn.b-cdn.net/pfp/abc.jpg" -> "pfp/abc.jpg"
 */
function extractStoragePath(cdnUrl: string): string | null {
  const base = process.env.BUNNY_CDN_URL;
  if (!base || !cdnUrl.startsWith(base)) return null;
  return cdnUrl.slice(base.length + 1); // +1 for the trailing slash
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const userId = session.user.id;

  const url = new URL(request.url);
  const type = url.searchParams.get("type");

  if (!type || !["pfp", "preview", "asset"].includes(type)) {
    return Response.json(
      { error: "type query param required (pfp, preview, or asset)" },
      { status: 400 }
    );
  }

  try {
    if (type === "pfp") {
      // id is ignored for pfp — we use the session userId
      const [profile] = await db
        .select({ pfpUrl: coderProfiles.pfpUrl })
        .from(coderProfiles)
        .where(eq(coderProfiles.userId, userId))
        .limit(1);

      if (profile?.pfpUrl) {
        const storagePath = extractStoragePath(profile.pfpUrl);
        if (storagePath) await deleteFromBunny(storagePath);

        await db
          .update(coderProfiles)
          .set({ pfpUrl: null, updatedAt: new Date() })
          .where(eq(coderProfiles.userId, userId));
      }
    } else if (type === "preview") {
      const [profile] = await db
        .select({ tags: coderProfiles.tags })
        .from(coderProfiles)
        .where(eq(coderProfiles.userId, userId))
        .limit(1);

      if (profile?.tags) {
        const gifTag = profile.tags.find((t) => t.startsWith("gif_preview:"));
        if (gifTag) {
          const gifUrl = gifTag.replace("gif_preview:", "");
          const storagePath = extractStoragePath(gifUrl);
          if (storagePath) await deleteFromBunny(storagePath);

          await db
            .update(coderProfiles)
            .set({
              tags: profile.tags.filter((t) => !t.startsWith("gif_preview:")),
              updatedAt: new Date(),
            })
            .where(eq(coderProfiles.userId, userId));
        }
      }
    } else if (type === "asset") {
      // id is the portfolio asset id
      const [asset] = await db
        .select({ fileUrl: portfolioAssets.fileUrl })
        .from(portfolioAssets)
        .where(eq(portfolioAssets.id, id))
        .limit(1);

      if (asset?.fileUrl) {
        const storagePath = extractStoragePath(asset.fileUrl);
        if (storagePath) await deleteFromBunny(storagePath);

        await db
          .update(portfolioAssets)
          .set({ fileUrl: null })
          .where(eq(portfolioAssets.id, id));
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    return Response.json(
      { error: "Delete failed. Please try again." },
      { status: 500 }
    );
  }
}
