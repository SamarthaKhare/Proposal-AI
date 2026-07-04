import { z } from "zod";
import type { ProposalIntake } from "@/lib/forms/default-form";

export const knownProposalSectionIdSchema = z.enum([
  "intro",
  "client-message",
  "requirements",
  "scope",
  "delivery-timeline",
  "pricing",
  "assumptions",
  "terms"
]);

export const proposalSectionIdSchema = z.string().min(1);

export type KnownProposalSectionId = z.infer<typeof knownProposalSectionIdSchema>;
export type ProposalSectionId = string;

export type ProposalSection = {
  id: ProposalSectionId;
  title: string;
  content: string;
  locked?: boolean;
  protectedFields?: string[];
};

export type ProposalDocument = {
  id: string;
  title: string;
  version: number;
  intake: ProposalIntake;
  sections: ProposalSection[];
};

export const rewriteSectionOperationSchema = z.object({
  type: z.literal("rewrite_section"),
  sectionId: proposalSectionIdSchema,
  newContent: z.string().min(1)
});

export const insertSectionAfterOperationSchema = z.object({
  type: z.literal("insert_section_after"),
  afterSectionId: proposalSectionIdSchema,
  title: z.string().min(1),
  content: z.string().min(1)
});

export const updateFieldOperationSchema = z.object({
  type: z.literal("update_field"),
  field: z.enum([
    "customClientMessage",
    "deliveryTimeline.durationText",
    "deliveryTimeline.targetDate",
    "pricingNotes"
  ]),
  value: z.string()
});

export const updateTableCellOperationSchema = z.object({
  type: z.literal("update_table_cell"),
  sectionId: z.literal("pricing"),
  rowId: z.string().min(1),
  column: z.enum(["productName", "description", "quantity", "unit", "unitPrice", "notes"]),
  value: z.union([z.string(), z.number()])
});

export const addTimelineMilestoneOperationSchema = z.object({
  type: z.literal("add_timeline_milestone"),
  title: z.string().min(1),
  dateOrDuration: z.string().min(1),
  notes: z.string().optional().default("")
});

export const proposalPatchOperationSchema = z.discriminatedUnion("type", [
  rewriteSectionOperationSchema,
  insertSectionAfterOperationSchema,
  updateFieldOperationSchema,
  updateTableCellOperationSchema,
  addTimelineMilestoneOperationSchema
]);

export const proposalPatchSchema = z.object({
  summary: z.string().min(1),
  operations: z.array(proposalPatchOperationSchema).min(1),
  warnings: z.array(z.string()).default([])
});

export type ProposalPatchOperation = z.infer<typeof proposalPatchOperationSchema>;
export type ProposalPatch = z.infer<typeof proposalPatchSchema>;

export type PatchValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
  patch?: ProposalPatch;
};
