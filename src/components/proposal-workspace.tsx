"use client";

import { useMemo, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import {
  AlertTriangle,
  Bot,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Eye,
  FileImage,
  FileText,
  Layers,
  Loader2,
  Mail,
  MessageSquare,
  Package,
  Pencil,
  RefreshCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Upload,
  UserRound
} from "lucide-react";
import { sampleIntake, type ProposalIntake } from "@/lib/forms/default-form";
import type { PatchValidationResult, ProposalDocument, ProposalPatch } from "@/lib/proposal/types";
import { SectionEditor } from "@/components/section-editor";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/field";
import { cn } from "@/lib/utils";

type WorkflowStep = "capture" | "review" | "proposal" | "email";

type PendingPatch = {
  patch: ProposalPatch;
  validation: PatchValidationResult;
};

const fallbackProduct = {
  id: "line_1",
  productName: "",
  description: "",
  quantity: undefined,
  unit: "unit",
  unitPrice: undefined,
  notes: ""
};

const steps: Array<{
  id: WorkflowStep;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  { id: "capture", label: "Capture", description: "Photo intake", icon: Camera },
  { id: "review", label: "Review", description: "Confirm fields", icon: ClipboardCheck },
  { id: "proposal", label: "Proposal", description: "Edit draft", icon: Pencil },
  { id: "email", label: "Email", description: "Send proposal", icon: Mail }
];

const samplePrompts = [
  "Make this section more premium and concise.",
  "Add a warm custom note for the client.",
  "Change delivery to 3 weeks after PO confirmation."
];

function emptyEmail() {
  return {
    to: "",
    subject: "",
    body: ""
  };
}

export function ProposalWorkspace() {
  const [step, setStep] = useState<WorkflowStep>("capture");
  const [file, setFile] = useState<File | null>(null);
  const [captureId, setCaptureId] = useState<string | null>(null);
  const [intake, setIntake] = useState<ProposalIntake>(sampleIntake);
  const [proposal, setProposal] = useState<ProposalDocument | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string>("intro");
  const [instruction, setInstruction] = useState("");
  const [pendingPatch, setPendingPatch] = useState<PendingPatch | null>(null);
  const [email, setEmail] = useState(emptyEmail);
  const [templateName, setTemplateName] = useState("Standard Product Proposal");
  const [templatePlaceholders, setTemplatePlaceholders] = useState([
    "customer_name",
    "client_custom_message",
    "scope_of_work",
    "delivery_timeline",
    "pricing_table"
  ]);
  const [status, setStatus] = useState("Ready");
  const [busy, setBusy] = useState(false);

  const currentStepIndex = steps.findIndex((item) => item.id === step);
  const selectedSection = useMemo(
    () => proposal?.sections.find((section) => section.id === selectedSectionId) || proposal?.sections[0],
    [proposal, selectedSectionId]
  );

  async function extractFields() {
    if (!file) {
      setIntake(sampleIntake);
      setStatus("Sample intake loaded");
      setStep("review");
      return;
    }

    setBusy(true);
    setStatus("Uploading capture");
    try {
      const upload = new FormData();
      upload.append("file", file);
      const captureResponse = await fetch("/api/captures", {
        method: "POST",
        body: upload
      });
      const capture = await captureResponse.json();
      setCaptureId(capture.id);

      setStatus("Extracting fields");
      const extraction = new FormData();
      extraction.append("file", file);
      const extractResponse = await fetch(`/api/captures/${capture.id}/extract`, {
        method: "POST",
        body: extraction
      });
      const data = await extractResponse.json();
      setIntake(data.intake);
      setStatus(data.ocr?.warnings?.[0] || "Fields extracted");
      setStep("review");
    } finally {
      setBusy(false);
    }
  }

  async function generateProposal() {
    setBusy(true);
    setStatus("Generating proposal");
    try {
      if (captureId) {
        await fetch(`/api/captures/${captureId}/fields`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(intake)
        });
      }

      const response = await fetch("/api/proposals", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(intake)
      });
      const data = await response.json();
      setProposal(data.proposal);
      setSelectedSectionId(data.proposal.sections[0]?.id || "intro");
      setStatus("Draft ready");
      setStep("proposal");
    } finally {
      setBusy(false);
    }
  }

  async function previewAiEdit() {
    if (!proposal || !instruction.trim()) {
      return;
    }

    setBusy(true);
    setStatus("Preparing AI edit");
    try {
      const response = await fetch(`/api/proposals/${proposal.id}/ai-edit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ instruction, selectedSectionId })
      });
      const data = await response.json();
      setPendingPatch(data);
      setStatus(data.validation?.valid ? "Patch ready" : "Patch needs review");
    } finally {
      setBusy(false);
    }
  }

  async function applyAiEdit() {
    if (!proposal || !pendingPatch?.validation.valid) {
      return;
    }

    setBusy(true);
    setStatus("Applying patch");
    try {
      const response = await fetch(`/api/proposals/${proposal.id}/apply-patch`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(pendingPatch.patch)
      });
      const data = await response.json();
      setProposal(data.proposal);
      setPendingPatch(null);
      setInstruction("");
      setStatus("Proposal updated");
    } finally {
      setBusy(false);
    }
  }

  async function draftEmail() {
    if (!proposal) {
      return;
    }

    setBusy(true);
    setStatus("Drafting email");
    try {
      const response = await fetch(`/api/proposals/${proposal.id}/email-draft`, {
        method: "POST"
      });
      const data = await response.json();
      setEmail({
        to: intake.contactEmail,
        subject: data.subject,
        body: data.body
      });
      setStatus("Email draft ready");
      setStep("email");
    } finally {
      setBusy(false);
    }
  }

  async function sendEmail() {
    if (!proposal) {
      return;
    }

    setBusy(true);
    setStatus("Sending email");
    try {
      const response = await fetch(`/api/proposals/${proposal.id}/send-email`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(email)
      });
      const data = await response.json();
      setStatus(data.warning || `Email ${data.status}`);
    } finally {
      setBusy(false);
    }
  }

  async function importTemplate(fileToImport: File) {
    setBusy(true);
    setStatus("Importing template");
    try {
      const formData = new FormData();
      formData.append("file", fileToImport);
      const response = await fetch("/api/templates/import-docx", {
        method: "POST",
        body: formData
      });
      const data = await response.json();
      setTemplateName(data.template.name);
      setTemplatePlaceholders(data.template.placeholders);
      setStatus("Template imported");
    } finally {
      setBusy(false);
    }
  }

  function updateSelectedSection(content: string) {
    if (!proposal || !selectedSection) {
      return;
    }

    setProposal({
      ...proposal,
      sections: proposal.sections.map((section) => (section.id === selectedSection.id ? { ...section, content } : section))
    });
  }

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-white shadow-panel">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-base font-semibold tracking-tight text-slate-950">Proposal AI</h1>
                <StatusPill busy={busy} status={status} />
              </div>
              <p className="truncate text-xs text-slate-500">Field notes to customer-ready proposal</p>
            </div>
          </div>

          <div className="hidden items-center rounded-lg border border-slate-200 bg-slate-50 p-1 md:flex">
            {steps.map((item, index) => {
              const Icon = item.icon;
              const active = step === item.id;
              const complete = index < currentStepIndex;
              return (
                <button
                  key={item.id}
                  onClick={() => setStep(item.id)}
                  className={cn(
                    "inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium transition",
                    active && "bg-white text-slate-950 shadow-panel",
                    !active && complete && "text-teal-700 hover:bg-white/70",
                    !active && !complete && "text-slate-500 hover:bg-white/70"
                  )}
                >
                  {complete ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="order-2 space-y-4 lg:order-1 lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-panel">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase text-slate-500">Workflow</div>
                <div className="text-sm font-semibold text-slate-950">Proposal run</div>
              </div>
              <Badge>{currentStepIndex + 1} of {steps.length}</Badge>
            </div>
            <div className="space-y-2">
              {steps.map((item, index) => (
                <StepButton
                  key={item.id}
                  step={item}
                  index={index}
                  active={step === item.id}
                  complete={index < currentStepIndex}
                  onClick={() => setStep(item.id)}
                />
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase text-slate-500">Template</div>
                <div className="mt-1 truncate text-sm font-semibold text-slate-950">{templateName}</div>
              </div>
              <Layers className="h-5 w-5 shrink-0 text-teal-700" />
            </div>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-700 transition hover:border-teal-500 hover:bg-teal-50">
              <Upload className="h-4 w-4" />
              Import DOCX
              <input
                type="file"
                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(event) => {
                  const selected = event.target.files?.[0];
                  if (selected) {
                    void importTemplate(selected);
                  }
                }}
                className="sr-only"
              />
            </label>
            <div className="mt-3 flex flex-wrap gap-1.5 text-xs text-slate-500">
              {templatePlaceholders.slice(0, 6).map((placeholder) => (
                <span key={placeholder} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1">
                  {placeholder}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Metric label="Customer" value={intake.customerName} icon={UserRound} />
            <Metric label="Timeline" value={intake.deliveryTimeline.durationText || "TBD"} icon={CalendarDays} />
          </div>
        </aside>

        <section className="order-1 min-w-0 lg:order-2">
          {step === "capture" && (
            <Panel
              eyebrow="Step 1"
              title="Capture field notes"
              icon={FileImage}
              description="Upload the salesperson form or continue with the demo intake."
            >
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="rounded-lg border border-slate-200 bg-white p-5">
                  <div className="mb-5 grid gap-3 sm:grid-cols-3">
                    <Metric label="OCR mode" value={file ? "Photo" : "Demo"} icon={Camera} />
                    <Metric label="Review" value="Required" icon={ShieldCheck} />
                    <Metric label="Output" value="Proposal" icon={FileText} />
                  </div>

                  <label className="group flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center transition hover:border-teal-500 hover:bg-teal-50/70">
                    <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-white text-teal-700 shadow-panel transition group-hover:scale-105">
                      <Upload className="h-7 w-7" />
                    </span>
                    <span className="text-base font-semibold text-slate-950">{file?.name || "Upload form photo"}</span>
                    <span className="mt-1 text-sm text-slate-500">Image capture works from mobile camera or file picker</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(event) => setFile(event.target.files?.[0] || null)}
                      className="sr-only"
                    />
                  </label>

                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    <Button onClick={extractFields} disabled={busy}>
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                      Extract fields
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setIntake(sampleIntake);
                        setStatus("Sample intake loaded");
                        setStep("review");
                      }}
                      disabled={busy}
                    >
                      <Sparkles className="h-4 w-4" />
                      Use sample intake
                    </Button>
                  </div>
                </div>

                <FormPreview intake={intake} />
              </div>
            </Panel>
          )}

          {step === "review" && (
            <Panel
              eyebrow="Step 2"
              title="Review extracted fields"
              icon={ClipboardCheck}
              description="Confirm customer details, quantities, delivery, and custom message before drafting."
            >
              <div className="grid gap-4 xl:grid-cols-3">
                <ReviewCard title="Customer" icon={UserRound}>
                  <FieldGroup label="Customer Name">
                    <Input value={intake.customerName} onChange={(event) => setIntake({ ...intake, customerName: event.target.value })} />
                  </FieldGroup>
                  <FieldGroup label="Contact Person">
                    <Input value={intake.contactName} onChange={(event) => setIntake({ ...intake, contactName: event.target.value })} />
                  </FieldGroup>
                  <FieldGroup label="Customer Email">
                    <Input value={intake.contactEmail} onChange={(event) => setIntake({ ...intake, contactEmail: event.target.value })} />
                  </FieldGroup>
                </ReviewCard>

                <ReviewCard title="Requirement" icon={Package}>
                  <FieldGroup label="Product">
                    <Input
                      value={intake.products[0]?.productName || ""}
                      onChange={(event) =>
                        setIntake({
                          ...intake,
                          products: [{ ...(intake.products[0] || fallbackProduct), productName: event.target.value }]
                        })
                      }
                    />
                  </FieldGroup>
                  <FieldGroup label="Quantity">
                    <Input
                      type="number"
                      value={intake.products[0]?.quantity || ""}
                      onChange={(event) =>
                        setIntake({
                          ...intake,
                          products: [{ ...(intake.products[0] || fallbackProduct), quantity: Number(event.target.value) }]
                        })
                      }
                    />
                  </FieldGroup>
                  <FieldGroup label="Special Requirements">
                    <Textarea
                      value={intake.specialRequirements.join("\n")}
                      onChange={(event) =>
                        setIntake({
                          ...intake,
                          specialRequirements: event.target.value.split("\n").filter(Boolean)
                        })
                      }
                    />
                  </FieldGroup>
                </ReviewCard>

                <ReviewCard title="Client commitments" icon={CalendarDays}>
                  <FieldGroup label="Delivery Timeline">
                    <Input
                      value={intake.deliveryTimeline.durationText}
                      onChange={(event) =>
                        setIntake({
                          ...intake,
                          deliveryTimeline: { ...intake.deliveryTimeline, type: "duration", durationText: event.target.value }
                        })
                      }
                    />
                  </FieldGroup>
                  <FieldGroup label="Custom Client Message">
                    <Textarea
                      className="min-h-36"
                      value={intake.customClientMessage}
                      onChange={(event) => setIntake({ ...intake, customClientMessage: event.target.value })}
                    />
                  </FieldGroup>
                </ReviewCard>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <ShieldCheck className="h-4 w-4 text-teal-700" />
                  Prices, dates, and customer email stay editable before sending.
                </div>
                <Button onClick={generateProposal} disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                  Generate proposal
                </Button>
              </div>
            </Panel>
          )}

          {step === "proposal" && (
            <Panel
              eyebrow="Step 3"
              title={proposal?.title || "Proposal draft"}
              icon={Pencil}
              description="Edit sections manually or ask AI for controlled patch suggestions."
            >
              {!proposal ? (
                <EmptyState message="Generate a proposal after reviewing fields." />
              ) : (
                <div className="grid gap-5 xl:grid-cols-[240px_minmax(0,1fr)_340px]">
                  <div className="space-y-2">
                    {proposal.sections.map((section) => (
                      <button
                        key={section.id}
                        onClick={() => setSelectedSectionId(section.id)}
                        className={cn(
                          "group w-full rounded-lg border p-3 text-left text-sm transition",
                          selectedSectionId === section.id
                            ? "border-teal-600 bg-teal-50 shadow-panel"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                        )}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-slate-950">{section.title}</span>
                          <ChevronRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5" />
                        </span>
                        <span className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                          {section.locked ? <ShieldCheck className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
                          {section.locked ? "Locked terms" : "Editable section"}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="min-w-0">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-panel">
                      <div>
                        <div className="text-xs font-semibold uppercase text-slate-500">Current section</div>
                        <h2 className="text-lg font-semibold tracking-tight text-slate-950">{selectedSection?.title}</h2>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="secondary" onClick={() => window.open(`/api/proposals/${proposal.id}/render`, "_blank")}>
                          <Eye className="h-4 w-4" />
                          Preview
                        </Button>
                        <Button onClick={draftEmail}>
                          <Mail className="h-4 w-4" />
                          Email
                        </Button>
                      </div>
                    </div>
                    {selectedSection && (
                      <SectionEditor
                        content={selectedSection.content}
                        locked={selectedSection.locked}
                        onChange={updateSelectedSection}
                      />
                    )}
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-950 text-white">
                          <Bot className="h-4 w-4" />
                        </span>
                        <div>
                          <h3 className="text-sm font-semibold text-slate-950">AI edit</h3>
                          <p className="text-xs text-slate-500">Patch preview before apply</p>
                        </div>
                      </div>
                      <Badge>v{proposal.version}</Badge>
                    </div>

                    <Textarea
                      className="min-h-32"
                      value={instruction}
                      onChange={(event) => setInstruction(event.target.value)}
                      placeholder="Make this section more formal and add the delivery commitment."
                    />
                    <div className="mt-3 flex flex-wrap gap-2">
                      {samplePrompts.map((prompt) => (
                        <button
                          key={prompt}
                          onClick={() => setInstruction(prompt)}
                          className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-left text-xs text-slate-600 transition hover:border-teal-500 hover:bg-teal-50"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                    <Button className="mt-3 w-full" onClick={previewAiEdit} disabled={busy || !instruction.trim()}>
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      Preview edit
                    </Button>

                    {pendingPatch && (
                      <div className="mt-4 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
                          <div>
                            <div className="text-sm font-semibold text-slate-950">{pendingPatch.patch.summary}</div>
                            <div className="text-xs text-slate-500">{pendingPatch.patch.operations.length} operation previewed</div>
                          </div>
                        </div>

                        {pendingPatch.validation.errors.length > 0 && (
                          <Notice tone="danger" messages={pendingPatch.validation.errors} />
                        )}
                        {pendingPatch.validation.warnings.length > 0 && (
                          <Notice tone="warning" messages={pendingPatch.validation.warnings} />
                        )}

                        <div className="space-y-2">
                          {pendingPatch.patch.operations.map((operation, index) => (
                            <div key={index} className="rounded-md border border-slate-200 bg-white p-2">
                              <div className="mb-1 text-xs font-semibold uppercase text-slate-500">{operation.type}</div>
                              <pre className="max-h-36 overflow-auto whitespace-pre-wrap text-xs leading-relaxed text-slate-700">
                                {JSON.stringify(operation, null, 2)}
                              </pre>
                            </div>
                          ))}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Button size="sm" onClick={applyAiEdit} disabled={!pendingPatch.validation.valid || busy}>
                            Apply
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => setPendingPatch(null)}>
                            Reject
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Panel>
          )}

          {step === "email" && (
            <Panel
              eyebrow="Step 4"
              title="Email proposal"
              icon={Send}
              description="Review the message and attach the generated proposal output."
            >
              {!proposal ? (
                <EmptyState message="Draft a proposal before preparing email." />
              ) : (
                <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                  <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel">
                    <div className="grid gap-4 md:grid-cols-2">
                      <FieldGroup label="Recipient">
                        <Input value={email.to} onChange={(event) => setEmail({ ...email, to: event.target.value })} />
                      </FieldGroup>
                      <FieldGroup label="Subject">
                        <Input value={email.subject} onChange={(event) => setEmail({ ...email, subject: event.target.value })} />
                      </FieldGroup>
                    </div>
                    <FieldGroup label="Body" className="mt-4">
                      <Textarea
                        className="min-h-80"
                        value={email.body}
                        onChange={(event) => setEmail({ ...email, body: event.target.value })}
                      />
                    </FieldGroup>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button variant="secondary" onClick={draftEmail} disabled={busy}>
                        <RefreshCcw className="h-4 w-4" />
                        Draft body
                      </Button>
                      <Button onClick={sendEmail} disabled={busy || !email.to || !email.subject || !email.body}>
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        Send email
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <div className="text-xs font-semibold uppercase text-slate-500">Attachment</div>
                          <div className="mt-1 text-sm font-semibold text-slate-950">{proposal.title}.pdf</div>
                        </div>
                        <FileText className="h-8 w-8 text-teal-700" />
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                        Generated from version {proposal.version} at send time.
                      </div>
                    </div>
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                      <div className="mb-1 flex items-center gap-2 font-semibold">
                        <AlertTriangle className="h-4 w-4" />
                        Demo-safe mode
                      </div>
                      Without Postmark credentials, send returns a demo response.
                    </div>
                  </div>
                </div>
              )}
            </Panel>
          )}
        </section>
      </div>
    </main>
  );
}

function StatusPill({ busy, status }: { busy: boolean; status: string }) {
  return (
    <span className="hidden max-w-56 items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600 sm:inline-flex">
      {busy ? <Loader2 className="h-3 w-3 animate-spin text-teal-700" /> : <span className="h-1.5 w-1.5 rounded-full bg-teal-600" />}
      <span className="truncate">{status}</span>
    </span>
  );
}

function StepButton({
  step,
  index,
  active,
  complete,
  onClick
}: {
  step: (typeof steps)[number];
  index: number;
  active: boolean;
  complete: boolean;
  onClick: () => void;
}) {
  const Icon = step.icon;
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition",
        active && "border-teal-600 bg-teal-50 shadow-panel",
        !active && "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-md border text-sm font-semibold",
          active && "border-teal-600 bg-teal-700 text-white",
          complete && !active && "border-teal-100 bg-teal-50 text-teal-700",
          !active && !complete && "border-slate-200 bg-slate-50 text-slate-500"
        )}
      >
        {complete ? <CheckCircle2 className="h-4 w-4" /> : active ? <Icon className="h-4 w-4" /> : index + 1}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-slate-950">{step.label}</span>
        <span className="block text-xs text-slate-500">{step.description}</span>
      </span>
    </button>
  );
}

function Panel({
  eyebrow,
  title,
  description,
  icon: Icon,
  children
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white/95 p-4 shadow-panel sm:p-5">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase text-teal-700">{eyebrow}</div>
            <h2 className="mt-0.5 text-xl font-semibold tracking-tight text-slate-950">{title}</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">{description}</p>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

function ReviewCard({ title, icon: Icon, children }: { title: string; icon: ComponentType<{ className?: string }>; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-700">
          <Icon className="h-4 w-4" />
        </span>
        <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function FieldGroup({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function FormPreview({ intake }: { intake: ProposalIntake }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold uppercase text-slate-500">Form preview</div>
          <div className="text-sm font-semibold text-slate-950">Sales intake v1</div>
        </div>
        <Badge>OCR-ready</Badge>
      </div>
      <div className="scan-lines rounded-lg border border-slate-200 p-4">
        <div className="mb-4 h-9 w-36 rounded-md bg-slate-950" />
        <div className="space-y-3 text-xs">
          <ScanField label="Customer Name" value={intake.customerName} />
          <ScanField label="Product" value={intake.products[0]?.productName || ""} />
          <ScanField label="Quantity" value={String(intake.products[0]?.quantity || "TBD")} />
          <ScanField label="Timeline" value={intake.deliveryTimeline.durationText || "TBD"} />
          <ScanField label="Message" value={intake.customClientMessage || "TBD"} />
        </div>
      </div>
    </div>
  );
}

function ScanField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-1 font-semibold text-slate-600">{label}</div>
      <div className="rounded-md border border-slate-200 bg-white/90 px-2 py-1.5 text-slate-700 shadow-sm">{value}</div>
    </div>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value: string; icon: ComponentType<{ className?: string }> }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-panel">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="truncate text-sm font-semibold text-slate-950">{value}</div>
    </div>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
      {children}
    </span>
  );
}

function Notice({ tone, messages }: { tone: "warning" | "danger"; messages: string[] }) {
  return (
    <div
      className={cn(
        "rounded-md border p-2 text-xs",
        tone === "warning" && "border-amber-200 bg-amber-50 text-amber-900",
        tone === "danger" && "border-red-200 bg-red-50 text-red-700"
      )}
    >
      {messages.map((message) => (
        <div key={message}>{message}</div>
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
      <MessageSquare className="mb-3 h-8 w-8 text-slate-400" />
      {message}
    </div>
  );
}
