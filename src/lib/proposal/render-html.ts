import type { ProposalDocument } from "@/lib/proposal/types";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatContent(content: string) {
  return escapeHtml(content)
    .split("\n")
    .map((line) => {
      if (line.startsWith("- ")) {
        return `<li>${line.slice(2)}</li>`;
      }
      return line ? `<p>${line}</p>` : "<br />";
    })
    .join("");
}

export function renderProposalHtml(document: ProposalDocument) {
  const sections = document.sections
    .map(
      (section) => `
        <section class="proposal-section" data-section-id="${section.id}">
          <h2>${escapeHtml(section.title)}</h2>
          <div>${formatContent(section.content)}</div>
        </section>
      `
    )
    .join("");

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(document.title)}</title>
    <style>
      body { color: #111827; font-family: Arial, sans-serif; margin: 40px; }
      h1 { color: #0f766e; font-size: 28px; margin-bottom: 28px; }
      h2 { color: #0f172a; font-size: 16px; margin: 26px 0 8px; }
      p { line-height: 1.55; margin: 0 0 8px; }
      li { line-height: 1.5; margin-bottom: 4px; }
      .meta { color: #64748b; font-size: 12px; margin-bottom: 28px; }
      .proposal-section { break-inside: avoid; border-top: 1px solid #e5e7eb; padding-top: 14px; }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(document.title)}</h1>
    <div class="meta">Proposal version ${document.version}</div>
    ${sections}
  </body>
</html>`;
}
