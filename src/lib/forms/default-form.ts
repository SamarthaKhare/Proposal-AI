import { z } from "zod";

export const productLineSchema = z.object({
  id: z.string().optional(),
  productName: z.string().min(1, "Product name is required"),
  description: z.string().optional().default(""),
  quantity: z.coerce.number().min(0).optional(),
  unit: z.string().optional().default("unit"),
  unitPrice: z.coerce.number().min(0).optional(),
  notes: z.string().optional().default("")
});

export const deliveryMilestoneSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  dateOrDuration: z.string().min(1),
  notes: z.string().optional().default("")
});

export const proposalIntakeSchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  contactName: z.string().optional().default(""),
  contactEmail: z.string().email().optional().or(z.literal("")).default(""),
  phone: z.string().optional().default(""),
  customerAddress: z.string().optional().default(""),
  products: z.array(productLineSchema).min(1, "At least one product or service is required"),
  customClientMessage: z.string().optional().default(""),
  deliveryTimeline: z.object({
    type: z.enum(["date", "duration", "milestones", "unspecified"]).default("unspecified"),
    targetDate: z.string().optional().default(""),
    durationText: z.string().optional().default(""),
    milestones: z.array(deliveryMilestoneSchema).default([])
  }),
  specialRequirements: z.array(z.string()).default([]),
  pricingNotes: z.string().optional().default(""),
  assumptions: z.array(z.string()).default([]),
  sourceWarnings: z.array(z.string()).default([])
});

export type ProductLine = z.infer<typeof productLineSchema>;
export type DeliveryMilestone = z.infer<typeof deliveryMilestoneSchema>;
export type ProposalIntake = z.infer<typeof proposalIntakeSchema>;

export type IntakeFieldDefinition = {
  key: keyof ProposalIntake | "deliveryTimeline.durationText" | "products";
  label: string;
  required: boolean;
  reviewHint?: string;
};

export const defaultFormVersion = "sales-intake-v1";

export const defaultIntakeFields: IntakeFieldDefinition[] = [
  { key: "customerName", label: "Customer Name", required: true },
  { key: "contactName", label: "Contact Person", required: false },
  { key: "contactEmail", label: "Customer Email", required: false, reviewHint: "Confirm manually before sending." },
  { key: "phone", label: "Phone", required: false },
  { key: "products", label: "Products / Services", required: true, reviewHint: "Confirm quantities and prices." },
  {
    key: "deliveryTimeline.durationText",
    label: "Delivery Timeline",
    required: false,
    reviewHint: "Confirm dates and commitments."
  },
  { key: "customClientMessage", label: "Custom Client Message", required: false },
  { key: "specialRequirements", label: "Special Requirements", required: false },
  { key: "pricingNotes", label: "Pricing Notes", required: false, reviewHint: "Do not rely on OCR for math." },
  { key: "assumptions", label: "Assumptions", required: false }
];

export const sampleIntake: ProposalIntake = {
  customerName: "ABC Interiors Pvt. Ltd.",
  contactName: "Priya Sharma",
  contactEmail: "priya@example.com",
  phone: "+91 98765 43210",
  customerAddress: "Ahmedabad, Gujarat",
  products: [
    {
      id: "line_1",
      productName: "Modular kitchen cabinets",
      description: "Custom cabinetry package with installation support.",
      quantity: 20,
      unit: "units",
      unitPrice: 450,
      notes: ""
    }
  ],
  customClientMessage: "Mention that we can prioritize their showroom opening timeline.",
  deliveryTimeline: {
    type: "duration",
    durationText: "4 weeks after purchase order confirmation",
    targetDate: "",
    milestones: []
  },
  specialRequirements: ["Installation must be completed before showroom launch."],
  pricingNotes: "Final pricing subject to site measurement.",
  assumptions: ["Customer will provide site access during business hours."],
  sourceWarnings: []
};

export function parseIntake(input: unknown): ProposalIntake {
  return proposalIntakeSchema.parse(input);
}
