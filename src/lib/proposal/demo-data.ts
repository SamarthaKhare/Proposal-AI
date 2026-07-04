import { sampleIntake } from "@/lib/forms/default-form";
import { buildProposalFromIntake } from "@/lib/proposal/build-proposal";

export const demoProposal = buildProposalFromIntake(sampleIntake);
