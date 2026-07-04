import { proposalPatchSchema, type ProposalDocument, type ProposalPatch, type ProposalPatchOperation, type PatchValidationResult } from "@/lib/proposal/types";
import { id } from "@/lib/utils";

const sensitiveFieldWarnings = new Map<string, string>([
  ["deliveryTimeline.durationText", "Delivery timeline changes require salesperson review."],
  ["deliveryTimeline.targetDate", "Delivery date changes require salesperson review."],
  ["pricingNotes", "Pricing notes can change customer expectations. Confirm before sending."]
]);

export function validatePatch(document: ProposalDocument, input: unknown): PatchValidationResult {
  const parsed = proposalPatchSchema.safeParse(input);
  if (!parsed.success) {
    return {
      valid: false,
      errors: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
      warnings: []
    };
  }

  const errors: string[] = [];
  const warnings = [...parsed.data.warnings];
  const sectionIds = new Set(document.sections.map((section) => section.id));
  const lockedSections = new Set(document.sections.filter((section) => section.locked).map((section) => section.id));

  for (const operation of parsed.data.operations) {
    if ("sectionId" in operation && !sectionIds.has(operation.sectionId)) {
      errors.push(`Unknown section: ${operation.sectionId}`);
    }

    if (operation.type === "rewrite_section" && lockedSections.has(operation.sectionId)) {
      errors.push(`Section ${operation.sectionId} is locked and cannot be rewritten by AI.`);
    }

    if (operation.type === "insert_section_after" && !sectionIds.has(operation.afterSectionId)) {
      errors.push(`Cannot insert after unknown section: ${operation.afterSectionId}`);
    }

    if (operation.type === "update_field") {
      const warning = sensitiveFieldWarnings.get(operation.field);
      if (warning) {
        warnings.push(warning);
      }
    }

    if (operation.type === "update_table_cell" && ["quantity", "unitPrice"].includes(operation.column)) {
      warnings.push("Quantity and price changes require manual confirmation. Totals must be recalculated by the app, not the model.");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    patch: parsed.data
  };
}

export function applyPatch(document: ProposalDocument, patch: ProposalPatch): ProposalDocument {
  const next: ProposalDocument = {
    ...document,
    version: document.version + 1,
    intake: structuredClone(document.intake),
    sections: document.sections.map((section) => ({ ...section }))
  };

  for (const operation of patch.operations) {
    applyOperation(next, operation);
  }

  return next;
}

function applyOperation(document: ProposalDocument, operation: ProposalPatchOperation) {
  switch (operation.type) {
    case "rewrite_section": {
      const section = document.sections.find((item) => item.id === operation.sectionId);
      if (section && !section.locked) {
        section.content = operation.newContent;
      }
      return;
    }
    case "insert_section_after": {
      const index = document.sections.findIndex((item) => item.id === operation.afterSectionId);
      if (index >= 0) {
        document.sections.splice(index + 1, 0, {
          id: id("section"),
          title: operation.title,
          content: operation.content
        });
      }
      return;
    }
    case "update_field": {
      if (operation.field === "customClientMessage") {
        document.intake.customClientMessage = operation.value;
        rewriteSection(document, "client-message", operation.value);
      }
      if (operation.field === "deliveryTimeline.durationText") {
        document.intake.deliveryTimeline.type = "duration";
        document.intake.deliveryTimeline.durationText = operation.value;
        rewriteSection(document, "delivery-timeline", `Delivery will be completed within ${operation.value}.`);
      }
      if (operation.field === "deliveryTimeline.targetDate") {
        document.intake.deliveryTimeline.type = "date";
        document.intake.deliveryTimeline.targetDate = operation.value;
        rewriteSection(document, "delivery-timeline", `Delivery is planned for ${operation.value}, subject to final approval and purchase order confirmation.`);
      }
      if (operation.field === "pricingNotes") {
        document.intake.pricingNotes = operation.value;
      }
      return;
    }
    case "update_table_cell": {
      const product = document.intake.products.find((item) => item.id === operation.rowId);
      if (product) {
        Object.assign(product, { [operation.column]: operation.value });
        rewriteSection(
          document,
          "pricing",
          document.intake.products
            .map((item, index) => `${index + 1}. ${item.productName} - ${item.quantity ?? "TBD"} ${item.unit || "unit"} - Unit price: ${item.unitPrice ?? "TBD"}`)
            .join("\n")
        );
      }
      return;
    }
    case "add_timeline_milestone": {
      document.intake.deliveryTimeline.type = "milestones";
      document.intake.deliveryTimeline.milestones.push({
        id: id("milestone"),
        title: operation.title,
        dateOrDuration: operation.dateOrDuration,
        notes: operation.notes
      });
      rewriteSection(
        document,
        "delivery-timeline",
        document.intake.deliveryTimeline.milestones
          .map((milestone) => `- ${milestone.title}: ${milestone.dateOrDuration}${milestone.notes ? ` (${milestone.notes})` : ""}`)
          .join("\n")
      );
      return;
    }
  }
}

function rewriteSection(document: ProposalDocument, sectionId: string, content: string) {
  const section = document.sections.find((item) => item.id === sectionId);
  if (section && !section.locked) {
    section.content = content;
  }
}
