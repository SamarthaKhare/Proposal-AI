import { NextResponse, type NextRequest } from "next/server";
import { validatePatch } from "@/lib/proposal/patch";
import { draftAiPatch } from "@/lib/server/openai";
import { getProposal } from "@/lib/server/demo-store";

export async function POST(request: NextRequest, context: { params: Promise<{ proposalId: string }> }) {
  const { proposalId } = await context.params;
  const proposal = getProposal(proposalId);

  if (!proposal) {
    return NextResponse.json({ error: "Proposal not found." }, { status: 404 });
  }

  const body = await request.json();
  const patch = await draftAiPatch(proposal, String(body.instruction || ""), body.selectedSectionId);
  const validation = validatePatch(proposal, patch);

  return NextResponse.json({ patch, validation });
}
