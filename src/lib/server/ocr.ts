import { DetectDocumentTextCommand, TextractClient, type Block } from "@aws-sdk/client-textract";
import { getEnv } from "@/lib/server/env";

export type OcrResult = {
  text: string;
  provider: "aws-textract" | "demo";
  warnings: string[];
};

const demoText = [
  "Customer Name: ABC Interiors Pvt. Ltd.",
  "Contact Person: Priya Sharma",
  "Customer Email: priya@example.com",
  "Product Required: Modular kitchen cabinets",
  "Quantity: 20 units",
  "Delivery Timeline: 4 weeks after PO confirmation",
  "Custom Message: Prioritize before showroom opening",
  "Special Requirement: Installation must finish before showroom launch"
].join("\n");

function hasAwsCredentialSignal(env: ReturnType<typeof getEnv>) {
  return Boolean(
    (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY) ||
      env.AWS_PROFILE ||
      process.env.AWS_WEB_IDENTITY_TOKEN_FILE ||
      process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI ||
      process.env.AWS_CONTAINER_CREDENTIALS_FULL_URI
  );
}

function buildTextractClient(env: ReturnType<typeof getEnv>) {
  return new TextractClient({
    region: env.AWS_REGION,
    credentials:
      env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY
        ? {
            accessKeyId: env.AWS_ACCESS_KEY_ID,
            secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
            sessionToken: env.AWS_SESSION_TOKEN || undefined
          }
        : undefined
  });
}

function blockText(block: Block) {
  return block.Text?.trim() || "";
}

function extractTextractText(blocks: Block[] = []) {
  const lines = blocks.filter((block) => block.BlockType === "LINE").map(blockText).filter(Boolean);
  if (lines.length > 0) {
    return lines.join("\n");
  }

  return blocks.filter((block) => block.BlockType === "WORD").map(blockText).filter(Boolean).join(" ");
}

export async function extractTextFromImage(buffer: Buffer): Promise<OcrResult> {
  const env = getEnv();

  if (!hasAwsCredentialSignal(env)) {
    return {
      provider: "demo",
      text: demoText,
      warnings: ["AWS Textract credentials are not set. Demo OCR text was used."]
    };
  }

  try {
    const client = buildTextractClient(env);
    const response = await client.send(
      new DetectDocumentTextCommand({
        Document: {
          Bytes: buffer
        }
      })
    );

    const text = extractTextractText(response.Blocks);

    return {
      provider: "aws-textract",
      text,
      warnings: text ? [] : ["Amazon Textract did not detect any text in the uploaded image."]
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return {
      provider: "aws-textract",
      text: "",
      warnings: [`Amazon Textract OCR failed: ${message}`]
    };
  }
}
