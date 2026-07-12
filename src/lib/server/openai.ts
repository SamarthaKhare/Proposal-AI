import OpenAI from "openai";
import { proposalIntakeSchema, type ProposalIntake } from "@/lib/forms/default-form";
import { buildProposalFromIntake } from "@/lib/proposal/build-proposal";
import { proposalPatchSchema, type ProposalDocument, type ProposalPatch } from "@/lib/proposal/types";
import { getEnv } from "@/lib/server/env";

const intakeJsonSchema = {
  name: "proposal_intake",
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "customerName",
      "contactName",
      "contactEmail",
      "phone",
      "customerAddress",
      "products",
      "customClientMessage",
      "deliveryTimeline",
      "specialRequirements",
      "pricingNotes",
      "assumptions",
      "sourceWarnings"
    ],
    properties: {
      customerName: { type: "string" },
      contactName: { type: "string" },
      contactEmail: { type: "string" },
      phone: { type: "string" },
      customerAddress: { type: "string" },
      products: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "productName", "description", "quantity", "unit", "unitPrice", "notes"],
          properties: {
            id: { type: "string" },
            productName: { type: "string" },
            description: { type: "string" },
            quantity: { type: ["number", "null"] },
            unit: { type: "string" },
            unitPrice: { type: ["number", "null"] },
            notes: { type: "string" }
          }
        }
      },
      customClientMessage: { type: "string" },
      deliveryTimeline: {
        type: "object",
        additionalProperties: false,
        required: ["type", "targetDate", "durationText", "milestones"],
        properties: {
          type: { type: "string", enum: ["date", "duration", "milestones", "unspecified"] },
          targetDate: { type: "string" },
          durationText: { type: "string" },
          milestones: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["id", "title", "dateOrDuration", "notes"],
              properties: {
                id: { type: "string" },
                title: { type: "string" },
                dateOrDuration: { type: "string" },
                notes: { type: "string" }
              }
            }
          }
        }
      },
      specialRequirements: { type: "array", items: { type: "string" } },
      pricingNotes: { type: "string" },
      assumptions: { type: "array", items: { type: "string" } },
      sourceWarnings: { type: "array", items: { type: "string" } }
    }
  },
  strict: true
};

const patchJsonSchema = {
  name: "proposal_patch",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["summary", "operations", "warnings"],
    properties: {
      summary: { type: "string" },
      operations: {
        type: "array",
        items: {
          anyOf: [
            {
              type: "object",
              additionalProperties: false,
              required: ["type", "sectionId", "newContent"],
              properties: {
                type: { type: "string", const: "rewrite_section" },
                sectionId: { type: "string" },
                newContent: { type: "string" }
              }
            },
            {
              type: "object",
              additionalProperties: false,
              required: ["type", "afterSectionId", "title", "content"],
              properties: {
                type: { type: "string", const: "insert_section_after" },
                afterSectionId: { type: "string" },
                title: { type: "string" },
                content: { type: "string" }
              }
            },
            {
              type: "object",
              additionalProperties: false,
              required: ["type", "field", "value"],
              properties: {
                type: { type: "string", const: "update_field" },
                field: {
                  type: "string",
                  enum: [
                    "customClientMessage",
                    "deliveryTimeline.durationText",
                    "deliveryTimeline.targetDate",
                    "pricingNotes"
                  ]
                },
                value: { type: "string" }
              }
            },
            {
              type: "object",
              additionalProperties: false,
              required: ["type", "sectionId", "rowId", "column", "value"],
              properties: {
                type: { type: "string", const: "update_table_cell" },
                sectionId: { type: "string", const: "pricing" },
                rowId: { type: "string" },
                column: {
                  type: "string",
                  enum: ["productName", "description", "quantity", "unit", "unitPrice", "notes"]
                },
                value: { anyOf: [{ type: "string" }, { type: "number" }] }
              }
            },
            {
              type: "object",
              additionalProperties: false,
              required: ["type", "title", "dateOrDuration", "notes"],
              properties: {
                type: { type: "string", const: "add_timeline_milestone" },
                title: { type: "string" },
                dateOrDuration: { type: "string" },
                notes: { type: "string" }
              }
            }
          ]
        }
      },
      warnings: { type: "array", items: { type: "string" } }
    }
  },
  strict: true
};

function demoIntakeFromText(ocrText: string): ProposalIntake {
  const hasEmail = /([^\s]+@[^\s]+)/.exec(ocrText)?.[1] ?? "";
  return proposalIntakeSchema.parse({
    customerName: /Customer Name:\s*(.+)/i.exec(ocrText)?.[1]?.trim() || "Unknown Customer",
    contactName: /Contact Person:\s*(.+)/i.exec(ocrText)?.[1]?.trim() || "",
    contactEmail: hasEmail,
    phone: "",
    customerAddress: "",
    products: [
      {
        id: "line_1",
        productName: /Product Required:\s*(.+)/i.exec(ocrText)?.[1]?.trim() || "Product or service to be confirmed",
        description: "",
        quantity: Number(/Quantity:\s*(\d+)/i.exec(ocrText)?.[1] || 0) || undefined,
        unit: /Quantity:\s*\d+\s*(.+)/i.exec(ocrText)?.[1]?.trim() || "unit",
        unitPrice: undefined,
        notes: ""
      }
    ],
    customClientMessage: /Custom Message:\s*(.+)/i.exec(ocrText)?.[1]?.trim() || "",
    deliveryTimeline: {
      type: "duration",
      durationText: /Delivery Timeline:\s*(.+)/i.exec(ocrText)?.[1]?.trim() || "",
      targetDate: "",
      milestones: []
    },
    specialRequirements: [/Special Requirement:\s*(.+)/i.exec(ocrText)?.[1]?.trim()].filter(
      (value): value is string => Boolean(value)
    ),
    pricingNotes: "",
    assumptions: [],
    sourceWarnings: ["Demo extractor used. Review all fields before drafting."]
  });
}

export async function extractIntakeWithAi(ocrText: string): Promise<ProposalIntake> {
  const env = getEnv();

  if (!env.OPENAI_API_KEY) {
    return demoIntakeFromText(ocrText);
  }

  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  const response = await client.responses.create({
    model: env.OPENAI_FAST_MODEL,
    input: [
      {
        role: "system",
        content: "Extract a sales proposal intake from OCR text. Never invent missing prices, emails, or delivery dates. Use empty strings or warnings when unsure."
      },
      {
        role: "user",
        content: `OCR text:\n${ocrText}`
      }
    ],
    text: {
      format: {
        type: "json_schema",
        ...intakeJsonSchema
      }
    }
  });

  return proposalIntakeSchema.parse(JSON.parse(response.output_text));
}

export async function draftAiPatch(document: ProposalDocument, instruction: string, selectedSectionId?: string): Promise<ProposalPatch> {
  const env = getEnv();

  if (!env.OPENAI_API_KEY) {
    const targetSection = selectedSectionId || "client-message";
    return proposalPatchSchema.parse({
      summary: "Demo edit prepared without calling OpenAI.",
      operations: [
        {
          type: "rewrite_section",
          sectionId: targetSection,
          newContent: `Updated per request: ${instruction}`
        }
      ],
      warnings: ["OPENAI_API_KEY is not set. Demo patch was generated."]
    });
  }

  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  const response = await client.responses.create({
    model: env.OPENAI_DRAFT_MODEL,
    input: [
      {
        role: "system",
        content: [
          "You are a proposal editor that returns structured patch operations only.",
          "Do not edit locked terms.",
          "Do not silently change totals, discounts, dates, or customer identity.",
          "Prefer rewriting the selected section when a selectedSectionId is provided."
        ].join(" ")
      },
      {
        role: "user",
        content: JSON.stringify({
          instruction,
          selectedSectionId,
          document: {
            title: document.title,
            sections: document.sections.map((section) => ({
              id: section.id,
              title: section.title,
              content: section.content,
              locked: section.locked || false
            })),
            intake: document.intake
          }
        })
      }
    ],
    text: {
      format: {
        type: "json_schema",
        ...patchJsonSchema
      }
    }
  });

  return proposalPatchSchema.parse(JSON.parse(response.output_text));
}

export async function draftEmailBody(document: ProposalDocument) {
  const env = getEnv();
  if (!env.OPENAI_API_KEY) {
    return {
      subject: document.title,
      body: `Hi ${document.intake.contactName || "there"},\n\nPlease find attached our proposal for ${document.intake.customerName}. We would be happy to discuss any questions.\n\nRegards`
    };
  }

  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  const response = await client.responses.create({
    model: env.OPENAI_FAST_MODEL,
    input: [
      {
        role: "system",
        content: "Draft a concise professional email body for sending an attached proposal. Do not add commitments not present in the proposal."
      },
      {
        role: "user",
        content: JSON.stringify({
          title: document.title,
          customerName: document.intake.customerName,
          contactName: document.intake.contactName,
          customClientMessage: document.intake.customClientMessage,
          deliveryTimeline: document.intake.deliveryTimeline
        })
      }
    ]
  });

  return {
    subject: document.title,
    body: response.output_text
  };
}
