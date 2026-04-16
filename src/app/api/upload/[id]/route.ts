import { auth } from "@/lib/auth";
import { db } from "@/db";
import { coderProfiles, portfolioAssets, portfolioItems } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { deleteFromBunny } from "@/lib/bunny";

/**
 * Extract the Bunny CDN storage path from a full CDN URL.
 * e.g. "https://vibechckd-cdn.b-cdn.net/pfp/abc.jpg" -> "pfp/abc.jpg"
 */
function extractStoragePath(cdnUrl: string): string | null {
  const base = process.env.BUNNY_CDN_URL || "https://vibechckd-cdn.b-cdn.net";
  if (!cdnUrl.startsWith(base)) return null;
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
        .select({ gifPreviewUrl: coderProfiles.gifPreviewUrl })
        .from(coderProfiles)
        .where(eq(coderProfiles.userId, userId))
        .limit(1);

      if (profile?.gifPreviewUrl) {
        const storagePath = extractStoragePath(profile.gifPreviewUrl);
        if (storagePath) await deleteFromBunny(storagePath);

        await db
          .update(coderProfiles)
          .set({
            gifPreviewUrl: null,
            updatedAt: new Date(),
          })
          .where(eq(coderProfiles.userId, userId));
      }
    } else if (type === "asset") {
      // SECURITY: Verify the asset belongs to the requesting user's portfolio
      const [profile] = await db
        .select({ id: coderProfiles.id })
        .from(coderProfiles)
        .where(eq(coderProfiles.userId, userId))
        .limit(1);

      if (!profile) {
        return Response.json({ error: "Profile not found" }, { status: 404 });
      }

      // id is the portfolio asset id -- verify ownership through portfolioItems
      const [asset] = await db
        .select({ fileUrl: portfolioAssets.fileUrl })
        .from(portfolioAssets)
        .innerJoin(portfolioItems, eq(portfolioAssets.portfolioItemId, portfolioItems.id))
        .where(
          and(
            eq(portfolioAssets.id, id),
            eq(portfolioItems.coderProfileId, profile.id)
          )
        )
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
