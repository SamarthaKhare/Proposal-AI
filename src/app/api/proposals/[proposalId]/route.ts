import { NextResponse } from "next/server";
import { getProposal } from "@/lib/server/demo-store";

export async function GET(_request: Request, context: { params: Promise<{ proposalId: string }> }) {
  const { proposalId } = await context.params;
  const proposal = getProposal(proposalId);

  if (!proposal) {
    return NextResponse.json({ error: "Proposal not found." }, { status: 404 });
  }

  return NextResponse.json({ proposal });
}
