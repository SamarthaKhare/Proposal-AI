import { NextResponse } from "next/server";
import { renderProposalHtml } from "@/lib/proposal/render-html";
import { renderPdfFromHtml } from "@/lib/server/pdf";
import { getProposal } from "@/lib/server/demo-store";

async function renderProposal(context: { params: Promise<{ proposalId: string }> }) {
  const { proposalId } = await context.params;
  const proposal = getProposal(proposalId);

  if (!proposal) {
    return NextResponse.json({ error: "Proposal not found." }, { status: 404 });
  }

  const rendered = await renderPdfFromHtml(renderProposalHtml(proposal), `${proposal.id}.pdf`);

  return new NextResponse(new Uint8Array(rendered.buffer), {
    headers: {
      "content-type": rendered.contentType,
      "content-disposition": `inline; filename="${rendered.fileName}"`,
      "x-render-provider": rendered.provider
    }
  });
}

export async function GET(_request: Request, context: { params: Promise<{ proposalId: string }> }) {
  return renderProposal(context);
}

export async function POST(_request: Request, context: { params: Promise<{ proposalId: string }> }) {
  return renderProposal(context);
}
