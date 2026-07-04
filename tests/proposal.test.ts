import { describe, expect, it } from "vitest";
import { sampleIntake } from "@/lib/forms/default-form";
import { buildProposalFromIntake } from "@/lib/proposal/build-proposal";
import { applyPatch, validatePatch } from "@/lib/proposal/patch";
import { renderProposalHtml } from "@/lib/proposal/render-html";

describe("proposal drafting", () => {
  it("builds a sectioned proposal from reviewed intake fields", () => {
    const proposal = buildProposalFromIntake(sampleIntake);

    expect(proposal.title).toContain(sampleIntake.customerName);
    expect(proposal.sections.map((section) => section.id)).toEqual([
      "intro",
      "client-message",
      "requirements",
      "scope",
      "delivery-timeline",
      "pricing",
      "assumptions",
      "terms"
    ]);
    expect(proposal.sections.find((section) => section.id === "terms")?.locked).toBe(true);
  });

  it("rejects AI rewrites to locked terms", () => {
    const proposal = buildProposalFromIntake(sampleIntake);
    const result = validatePatch(proposal, {
      summary: "Changed terms",
      operations: [
        {
          type: "rewrite_section",
          sectionId: "terms",
          newContent: "No terms apply."
        }
      ],
      warnings: []
    });

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("locked");
  });

  it("applies structured custom message and delivery timeline updates", () => {
    const proposal = buildProposalFromIntake(sampleIntake);
    const patch = {
      summary: "Personalized note and timeline",
      operations: [
        {
          type: "update_field",
          field: "customClientMessage",
          value: "We enjoyed meeting your team and can prioritize the showroom opening."
        },
        {
          type: "update_field",
          field: "deliveryTimeline.durationText",
          value: "3 weeks after purchase order confirmation"
        }
      ],
      warnings: []
    };

    const validation = validatePatch(proposal, patch);
    expect(validation.valid).toBe(true);
    expect(validation.patch).toBeDefined();

    const updated = applyPatch(proposal, validation.patch!);
    expect(updated.intake.customClientMessage).toContain("showroom");
    expect(updated.intake.deliveryTimeline.durationText).toBe("3 weeks after purchase order confirmation");
    expect(updated.sections.find((section) => section.id === "delivery-timeline")?.content).toContain("3 weeks");
  });

  it("escapes proposal HTML output", () => {
    const proposal = buildProposalFromIntake({
      ...sampleIntake,
      customerName: "<script>alert(1)</script>"
    });

    const html = renderProposalHtml(proposal);
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>alert(1)</script>");
  });
});
