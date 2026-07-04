import { id } from "@/lib/utils";
import type { ProposalIntake } from "@/lib/forms/default-form";
import type { ProposalDocument, ProposalSection } from "@/lib/proposal/types";

function list(items: string[]) {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : "To be confirmed.";
}

function deliveryText(intake: ProposalIntake) {
  if (intake.deliveryTimeline.type === "date" && intake.deliveryTimeline.targetDate) {
    return `Delivery is planned for ${intake.deliveryTimeline.targetDate}, subject to final approval and purchase order confirmation.`;
  }

  if (intake.deliveryTimeline.type === "duration" && intake.deliveryTimeline.durationText) {
    return `Delivery will be completed within ${intake.deliveryTimeline.durationText}.`;
  }

  if (intake.deliveryTimeline.type === "milestones" && intake.deliveryTimeline.milestones.length > 0) {
    return intake.deliveryTimeline.milestones
      .map((milestone) => `- ${milestone.title}: ${milestone.dateOrDuration}${milestone.notes ? ` (${milestone.notes})` : ""}`)
      .join("\n");
  }

  return "Delivery timeline will be confirmed after final scope approval.";
}

function pricingText(intake: ProposalIntake) {
  const rows = intake.products.map((product, index) => {
    const quantity = product.quantity == null ? "TBD" : `${product.quantity} ${product.unit || "unit"}`;
    const price = product.unitPrice == null ? "TBD" : `${product.unitPrice}`;
    return `${index + 1}. ${product.productName} - ${quantity} - Unit price: ${price}${product.notes ? ` - ${product.notes}` : ""}`;
  });

  return [rows.join("\n"), intake.pricingNotes ? `\nPricing note: ${intake.pricingNotes}` : ""].join("");
}

export function buildProposalFromIntake(intake: ProposalIntake): ProposalDocument {
  const title = `Proposal for ${intake.customerName}`;
  const sections: ProposalSection[] = [
    {
      id: "intro",
      title: "Introduction",
      content: `Dear ${intake.contactName || "Customer"},\n\nThank you for discussing your requirements with us. Based on our conversation, we have prepared this proposal for ${intake.customerName}.`
    },
    {
      id: "client-message",
      title: "Client Note",
      content: intake.customClientMessage || "We appreciate the opportunity to support your requirements and look forward to working with you."
    },
    {
      id: "requirements",
      title: "Captured Requirements",
      content: list([
        ...intake.products.map((product) => `${product.productName}${product.description ? `: ${product.description}` : ""}`),
        ...intake.specialRequirements
      ])
    },
    {
      id: "scope",
      title: "Scope of Work",
      content: `We will provide the products and services listed above, coordinate execution with your team, and confirm final measurements/specifications before fulfillment.`
    },
    {
      id: "delivery-timeline",
      title: "Delivery Timeline",
      content: deliveryText(intake),
      protectedFields: ["deliveryTimeline"]
    },
    {
      id: "pricing",
      title: "Pricing",
      content: pricingText(intake),
      protectedFields: ["products", "pricingNotes"]
    },
    {
      id: "assumptions",
      title: "Assumptions",
      content: list(intake.assumptions)
    },
    {
      id: "terms",
      title: "Terms",
      content: "Commercial terms, taxes, warranty, cancellation policy, and legal conditions remain subject to the approved master terms shared by the business.",
      locked: true
    }
  ];

  return {
    id: id("proposal"),
    title,
    version: 1,
    intake,
    sections
  };
}
