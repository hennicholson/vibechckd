import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isConversationMember } from "@/lib/conversation-access";
import { subscribeToConversation, type ConversationEvent } from "@/lib/conversation-bus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// SSE stream for a single conversation. Clients open `EventSource` against
// this URL and receive `event: message`, `event: read`, `event: invoice_status`
// frames as they're published by other API routes / the Whop webhook.
//
// We keep the connection open until the client disconnects (or the runtime
// kills it after its idle timeout). A heartbeat comment frame every 25s keeps
// proxies and the browser from reaping it.
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: conversationId } = await ctx.params;
  if (!(await isConversationMember(session.user.id, conversationId))) {
    return NextResponse.json({ error: "Not a participant" }, { status: 403 });
  }

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: ConversationEvent) => {
        try {
          controller.enqueue(
            encoder.encode(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`)
          );
        } catch {
          // Controller already closed — clean up.
          unsubscribe?.();
          if (heartbeat) clearInterval(heartbeat);
        }
      };

      // Initial hello so EventSource fires `open` on the client.
      controller.enqueue(encoder.encode(`: connected\n\n`));

      unsubscribe = subscribeToConversation(conversationId, send);

      // Heartbeat every 25s (well under the typical 30-60s proxy idle
      // timeout). Comment frames are ignored by EventSource but keep the
      // socket alive.
      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          if (heartbeat) clearInterval(heartbeat);
        }
      }, 25_000);
    },
    cancel() {
      unsubscribe?.();
      if (heartbeat) clearInterval(heartbeat);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Disable Netlify's automatic gzip — breaks SSE.
      "X-Accel-Buffering": "no",
    },
  });
}
