import { NextResponse, type NextRequest } from "next/server";
import { parseIntake } from "@/lib/forms/default-form";
import { buildProposalFromIntake } from "@/lib/proposal/build-proposal";
import { saveProposal, store } from "@/lib/server/demo-store";

export async function GET() {
  return NextResponse.json({
    proposals: Array.from(store.proposals.values()).map((proposal) => ({
      id: proposal.id,
      title: proposal.title,
      version: proposal.version,
      customerName: proposal.intake.customerName
    }))
  });
}

export async function POST(request: NextRequest) {
  const intake = parseIntake(await request.json());
  const proposal = saveProposal(buildProposalFromIntake(intake));

  return NextResponse.json({ proposal });
}
