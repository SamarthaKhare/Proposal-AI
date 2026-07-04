import { NextResponse, type NextRequest } from "next/server";
import { renderProposalHtml } from "@/lib/proposal/render-html";
import { renderPdfFromHtml } from "@/lib/server/pdf";
import { sendProposalEmail } from "@/lib/server/email";
import { getProposal } from "@/lib/server/demo-store";

export async function POST(request: NextRequest, context: { params: Promise<{ proposalId: string }> }) {
  const { proposalId } = await context.params;
  const proposal = getProposal(proposalId);

  if (!proposal) {
    return NextResponse.json({ error: "Proposal not found." }, { status: 404 });
  }

  const body = await request.json();
  if (!body.to || !body.subject || !body.body) {
    return NextResponse.json({ error: "to, subject, and body are required." }, { status: 400 });
  }

  const rendered = await renderPdfFromHtml(renderProposalHtml(proposal), `${proposal.id}.pdf`);
  const result = await sendProposalEmail({
    to: body.to,
    subject: body.subject,
    body: body.body,
    attachment: {
      fileName: rendered.fileName,
      contentType: rendered.contentType,
      buffer: rendered.buffer
    }
  });

  return NextResponse.json(result);
}
