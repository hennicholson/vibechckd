import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = process.env.WHOP_API_KEY;
    const companyId = process.env.WHOP_COMPANY_ID;

    if (!apiKey || !companyId) {
      return Response.json({ error: "Whop not configured" }, { status: 500 });
    }

    // Generate an access token for the payout portal
    const res = await fetch("https://api.whop.com/api/v1/access_tokens", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        company_id: companyId,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Whop access token creation failed:", res.status, errorText);
      return Response.json({ error: "Failed to create access token" }, { status: 502 });
    }

    const data = await res.json();
    return Response.json({ token: data.token, companyId });
  } catch (error) {
    console.error("Whop token error:", error);
    return Response.json({ error: "Failed to generate token" }, { status: 500 });
  }
}
