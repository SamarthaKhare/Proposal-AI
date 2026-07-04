import { NextResponse, type NextRequest } from "next/server";
import { validatePatch } from "@/lib/proposal/patch";
import { applyProposalPatch, getProposal } from "@/lib/server/demo-store";

export async function POST(request: NextRequest, context: { params: Promise<{ proposalId: string }> }) {
  const { proposalId } = await context.params;
  const proposal = getProposal(proposalId);

  if (!proposal) {
    return NextResponse.json({ error: "Proposal not found." }, { status: 404 });
  }

  const patchInput = await request.json();
  const validation = validatePatch(proposal, patchInput);

  if (!validation.valid || !validation.patch) {
    return NextResponse.json({ validation }, { status: 400 });
  }

  const next = applyProposalPatch(proposalId, validation.patch);
  return NextResponse.json({ proposal: next, validation });
}
