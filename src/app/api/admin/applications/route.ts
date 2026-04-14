import { NextRequest } from "next/server";

const mockApplications = [
  {
    id: "app-1",
    name: "Alex Rivera",
    email: "alex@example.com",
    specialties: ["frontend", "full-stack"],
    portfolioLinks: ["https://alexrivera.dev"],
    rateExpectation: "$120-180/hr",
    pitch: "I build interfaces that feel alive. 5 years at startups, shipped 20+ products.",
    status: "applied",
    createdAt: "2026-04-12",
  },
  {
    id: "app-2",
    name: "Jordan Lee",
    email: "jordan@example.com",
    specialties: ["backend", "automation"],
    portfolioLinks: ["https://github.com/jordanlee"],
    rateExpectation: "$100-160/hr",
    pitch: "Backend specialist with expertise in event-driven architectures and DevOps.",
    status: "under_review",
    createdAt: "2026-04-10",
  },
  {
    id: "app-3",
    name: "Morgan Taylor",
    email: "morgan@example.com",
    specialties: ["security"],
    portfolioLinks: ["https://morgansec.io"],
    rateExpectation: "$180-280/hr",
    pitch: "Former pentester turned builder. I audit and harden codebases.",
    status: "applied",
    createdAt: "2026-04-13",
  },
];

export async function GET() {
  return Response.json({ applications: mockApplications });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id, status } = body as { id: string; status: "approved" | "rejected" };

  console.log(`[Admin] Application ${id} updated to: ${status}`);

  return Response.json({ success: true, id, status });
}
