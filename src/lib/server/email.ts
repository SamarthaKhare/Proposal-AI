import { Resend } from "resend";
import { getEnv } from "@/lib/server/env";

export type SendProposalEmailInput = {
  to: string;
  subject: string;
  body: string;
  attachment?: {
    fileName: string;
    contentType: string;
    buffer: Buffer;
  };
};

export type SendProposalEmailResult = {
  status: "sent" | "demo";
  providerMessageId?: string;
  warning?: string;
};

export async function sendProposalEmail(input: SendProposalEmailInput): Promise<SendProposalEmailResult> {
  const env = getEnv();

  if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) {
    return {
      status: "demo",
      warning: "RESEND_API_KEY or RESEND_FROM_EMAIL is not set. Email was not sent."
    };
  }

  const resend = new Resend(env.RESEND_API_KEY);
  const { data, error } = await resend.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to: input.to,
    replyTo: env.RESEND_REPLY_TO || undefined,
    subject: input.subject,
    text: input.body,
    html: `<p>${escapeHtml(input.body).replaceAll("\n", "<br />")}</p>`,
    attachments: input.attachment
      ? [
          {
            filename: input.attachment.fileName,
            content: input.attachment.buffer.toString("base64"),
            contentType: input.attachment.contentType
          }
        ]
      : undefined
  });

  if (error) {
    return {
      status: "demo",
      warning: `Resend email failed: ${error.message}`
    };
  }

  return {
    status: "sent",
    providerMessageId: data?.id
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
