import { getEnv } from "@/lib/server/env";

export type PdfRenderResult = {
  fileName: string;
  contentType: "application/pdf" | "text/html";
  buffer: Buffer;
  provider: "gotenberg" | "html-fallback";
};

export async function renderPdfFromHtml(html: string, fileName: string): Promise<PdfRenderResult> {
  const env = getEnv();

  try {
    const form = new FormData();
    form.append("files", new Blob([html], { type: "text/html" }), "index.html");

    const response = await fetch(`${env.GOTENBERG_URL}/forms/chromium/convert/html`, {
      method: "POST",
      body: form
    });

    if (!response.ok) {
      throw new Error(`Gotenberg returned ${response.status}`);
    }

    return {
      fileName,
      contentType: "application/pdf",
      buffer: Buffer.from(await response.arrayBuffer()),
      provider: "gotenberg"
    };
  } catch {
    return {
      fileName: fileName.replace(/\.pdf$/i, ".html"),
      contentType: "text/html",
      buffer: Buffer.from(html),
      provider: "html-fallback"
    };
  }
}
