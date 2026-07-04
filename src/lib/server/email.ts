import { ServerClient } from "postmark";
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

  if (!env.POSTMARK_SERVER_TOKEN || !env.POSTMARK_FROM_EMAIL) {
    return {
      status: "demo",
      warning: "POSTMARK_SERVER_TOKEN or POSTMARK_FROM_EMAIL is not set. Email was not sent."
    };
  }

  const client = new ServerClient(env.POSTMARK_SERVER_TOKEN);
  const result = await client.sendEmail({
    From: env.POSTMARK_FROM_EMAIL,
    To: input.to,
    ReplyTo: env.POSTMARK_REPLY_TO,
    Subject: input.subject,
    TextBody: input.body,
    Attachments: input.attachment
      ? [
          {
            Name: input.attachment.fileName,
            Content: input.attachment.buffer.toString("base64"),
            ContentType: input.attachment.contentType,
            ContentID: ""
          }
        ]
      : undefined
  });

  return {
    status: "sent",
    providerMessageId: result.MessageID
  };
}
