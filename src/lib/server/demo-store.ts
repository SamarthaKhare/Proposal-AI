import { sampleIntake } from "@/lib/forms/default-form";
import { buildProposalFromIntake } from "@/lib/proposal/build-proposal";
import type { ProposalDocument, ProposalPatch } from "@/lib/proposal/types";
import { applyPatch } from "@/lib/proposal/patch";

type CaptureRecord = {
  id: string;
  formVersion: string;
  fileName: string;
  ocrText?: string;
  extractedFields?: unknown;
};

export type TemplateRecord = {
  id: string;
  name: string;
  placeholders: string[];
  rawText: string;
};

type Store = {
  captures: Map<string, CaptureRecord>;
  templates: Map<string, TemplateRecord>;
  proposals: Map<string, ProposalDocument>;
  patches: Map<string, ProposalPatch>;
};

const globalForStore = globalThis as unknown as { proposalAiStore?: Store };
const defaultProposal = buildProposalFromIntake(sampleIntake);

export const store: Store =
  globalForStore.proposalAiStore ||
  (globalForStore.proposalAiStore = {
    captures: new Map(),
    templates: new Map([
      [
        "standard-product-proposal",
        {
          id: "standard-product-proposal",
          name: "Standard Product Proposal",
          placeholders: [
            "customer_name",
            "contact_name",
            "client_custom_message",
            "scope_of_work",
            "delivery_timeline",
            "pricing_table"
          ],
          rawText: "Proposal for {{customer_name}}"
        }
      ]
    ]),
    proposals: new Map([[defaultProposal.id, defaultProposal]]),
    patches: new Map()
  });

export function saveProposal(document: ProposalDocument) {
  store.proposals.set(document.id, document);
  return document;
}

export function getProposal(id: string) {
  return store.proposals.get(id);
}

export function applyProposalPatch(id: string, patch: ProposalPatch) {
  const proposal = getProposal(id);
  if (!proposal) {
    return undefined;
  }

  const next = applyPatch(proposal, patch);
  store.proposals.set(next.id, next);
  return next;
}
