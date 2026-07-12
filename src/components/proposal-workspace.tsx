"use client";

import { useMemo, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import {
  Bot,
  Check,
  FileImage,
  FileText,
  Mail,
  Pencil,
  RefreshCcw,
  Send,
  Sparkles,
  Upload
} from "lucide-react";
import { sampleIntake, type ProposalIntake } from "@/lib/forms/default-form";
import type { PatchValidationResult, ProposalDocument, ProposalPatch } from "@/lib/proposal/types";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/field";
import { SectionEditor } from "@/components/section-editor";
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

const steps: Array<{ id: WorkflowStep; label: string; icon: ComponentType<{ className?: string }> }> = [
  { id: "capture", label: "Capture", icon: FileImage },
  { id: "review", label: "Review", icon: Check },
  { id: "proposal", label: "Proposal", icon: Pencil },
  { id: "email", label: "Email", icon: Mail }
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

  const selectedSection = useMemo(
    () => proposal?.sections.find((section) => section.id === selectedSectionId) || proposal?.sections[0],
    [proposal, selectedSectionId]
  );
  const statusIsIssue = /failed|error|required|subscription|cannot|not/i.test(status);

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
      if (!captureResponse.ok) {
        throw new Error(capture.error || "Capture upload failed.");
      }
      setCaptureId(capture.id);

      setStatus("Extracting fields");
      const extraction = new FormData();
      extraction.append("file", file);
      const extractResponse = await fetch(`/api/captures/${capture.id}/extract`, {
        method: "POST",
        body: extraction
      });
      const data = await extractResponse.json();
      if (!extractResponse.ok) {
        setStatus(data.error || data.ocr?.warnings?.[0] || "Field extraction failed.");
        return;
      }
      setIntake(data.intake);
      setStatus(data.ocr?.warnings?.[0] || "Fields extracted");
      setStep("review");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Field extraction failed.");
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
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border/80 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-950 text-white shadow-sm">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight sm:text-base">Proposal AI</h1>
              <p className="hidden text-xs text-slate-500 sm:block">Sales intake to client-ready proposal</p>
            </div>
          </div>
          <div
            className={cn(
              "max-w-[58vw] truncate rounded-full border px-3 py-1 text-xs font-medium sm:max-w-[520px]",
              statusIsIssue ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-800"
            )}
            role="status"
            aria-live="polite"
            title={status}
          >
            {status}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <div className="rounded-md border border-border/80 bg-white p-2 shadow-panel">
            {steps.map((item, index) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setStep(item.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition",
                    step === item.id ? "bg-slate-950 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-md",
                      step === item.id ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-medium">{item.label}</span>
                    <span className={cn("text-xs", step === item.id ? "text-white/65" : "text-slate-400")}>Step {index + 1}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="rounded-md border border-border/80 bg-white p-4 shadow-panel">
            <div className="mb-2 text-xs font-medium text-slate-500">Template</div>
            <div className="text-sm font-semibold text-slate-950">{templateName}</div>
            <div className="mt-3 flex items-center gap-3">
              <label className="inline-flex h-8 shrink-0 cursor-pointer items-center justify-center whitespace-nowrap rounded-md bg-slate-100 px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-200">
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
                Choose file
              </label>
              <span className="min-w-0 truncate text-xs text-slate-500">Optional DOCX template</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5 text-xs text-slate-500">
              {templatePlaceholders.slice(0, 5).map((placeholder) => (
                <span key={placeholder} className="rounded-md bg-slate-100 px-2 py-1">
                  {placeholder}
                </span>
              ))}
            </div>
          </div>
        </aside>

        <section className="min-w-0">
          {step === "capture" && (
            <Panel title="Capture" icon={FileImage}>
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
                <div className="rounded-md border border-dashed border-slate-300 bg-slate-50/70 p-5">
                  <Label>Form image</Label>
                  <div className="flex min-h-56 flex-col items-center justify-center rounded-md border border-border bg-white p-5 text-center">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-emerald-50 text-primary">
                      <Upload className="h-6 w-6" />
                    </div>
                    <label className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md bg-slate-950 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800">
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(event) => setFile(event.target.files?.[0] || null)}
                        className="sr-only"
                      />
                      Choose image
                    </label>
                    <div className="mt-4 max-w-full truncate text-sm font-medium text-slate-900">
                      {file?.name || "Sample intake available"}
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button onClick={extractFields} disabled={busy}>
                      <RefreshCcw className="h-4 w-4" />
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
                      Load sample
                    </Button>
                  </div>
                </div>

                <div className="scan-lines rounded-md border border-border bg-white p-4 shadow-panel">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="h-2 w-20 rounded-full bg-primary" />
                    <div className="text-xs font-medium text-slate-400">Preview</div>
                  </div>
                  <div className="space-y-3 text-xs text-slate-500">
                    <ScanField label="Customer Name" value={intake.customerName} />
                    <ScanField label="Product" value={intake.products[0]?.productName || ""} />
                    <ScanField label="Quantity" value={String(intake.products[0]?.quantity || "TBD")} />
                    <ScanField label="Timeline" value={intake.deliveryTimeline.durationText || "TBD"} />
                    <ScanField label="Message" value={intake.customClientMessage || "TBD"} />
                  </div>
                </div>
              </div>
            </Panel>
          )}

          {step === "review" && (
            <Panel title="Review Fields" icon={Check}>
              <div className="grid gap-x-4 gap-y-5 lg:grid-cols-2">
                <FieldGroup label="Customer Name">
                  <Input value={intake.customerName} onChange={(event) => setIntake({ ...intake, customerName: event.target.value })} />
                </FieldGroup>
                <FieldGroup label="Contact Person">
                  <Input value={intake.contactName} onChange={(event) => setIntake({ ...intake, contactName: event.target.value })} />
                </FieldGroup>
                <FieldGroup label="Customer Email">
                  <Input value={intake.contactEmail} onChange={(event) => setIntake({ ...intake, contactEmail: event.target.value })} />
                </FieldGroup>
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
                <FieldGroup label="Custom Client Message">
                  <Textarea
                    value={intake.customClientMessage}
                    onChange={(event) => setIntake({ ...intake, customClientMessage: event.target.value })}
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
              </div>
              <div className="mt-6 flex justify-end">
                <Button onClick={generateProposal} disabled={busy}>
                  <FileText className="h-4 w-4" />
                  Generate proposal
                </Button>
              </div>
            </Panel>
          )}

          {step === "proposal" && (
            <Panel title="Proposal" icon={Pencil}>
              {!proposal ? (
                <EmptyState message="No proposal generated" />
              ) : (
                <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)_320px]">
                  <div className="space-y-2">
                    {proposal.sections.map((section) => (
                      <button
                        key={section.id}
                        onClick={() => setSelectedSectionId(section.id)}
                        className={cn(
                          "w-full rounded-md px-3 py-2.5 text-left text-sm transition",
                          selectedSectionId === section.id ? "bg-slate-950 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                        )}
                      >
                        <span className="block font-medium">{section.title}</span>
                        <span className={cn("text-xs", selectedSectionId === section.id ? "text-white/65" : "text-slate-400")}>
                          {section.locked ? "Locked" : `Section ${section.id}`}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="min-w-0">
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h2 className="text-xl font-semibold tracking-tight">{selectedSection?.title}</h2>
                        <p className="mt-1 text-xs text-slate-500">Version {proposal.version}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => window.open(`/api/proposals/${proposal.id}/render`, "_blank")}
                        >
                          <FileText className="h-4 w-4" />
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

                  <div className="self-start rounded-md border border-border bg-slate-50/70 p-4 shadow-panel">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white text-primary shadow-sm">
                        <Bot className="h-4 w-4" />
                      </span>
                      <h3 className="text-sm font-semibold">AI Edit</h3>
                    </div>
                    <Textarea
                      value={instruction}
                      onChange={(event) => setInstruction(event.target.value)}
                      placeholder="Make this section more formal and add the delivery commitment."
                    />
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" onClick={previewAiEdit} disabled={busy || !instruction.trim()}>
                        <Sparkles className="h-4 w-4" />
                        Preview edit
                      </Button>
                    </div>

                    {pendingPatch && (
                      <div className="mt-4 space-y-3 rounded-md border border-border bg-white p-3">
                        <div className="text-sm font-medium">{pendingPatch.patch.summary}</div>
                        {pendingPatch.validation.errors.length > 0 && (
                          <div className="rounded-md bg-red-50 p-2 text-xs text-red-700">
                            {pendingPatch.validation.errors.join("\n")}
                          </div>
                        )}
                        {pendingPatch.validation.warnings.length > 0 && (
                          <div className="rounded-md bg-amber-50 p-2 text-xs text-amber-900">
                            {pendingPatch.validation.warnings.join("\n")}
                          </div>
                        )}
                        <div className="space-y-2">
                          {pendingPatch.patch.operations.map((operation, index) => (
                            <pre key={index} className="overflow-auto rounded-md bg-slate-50 p-2 text-xs text-slate-700">
                              {JSON.stringify(operation, null, 2)}
                            </pre>
                          ))}
                        </div>
                        <div className="flex gap-2">
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
            <Panel title="Email" icon={Send}>
              {!proposal ? (
                <EmptyState message="No proposal selected" />
              ) : (
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
                  <div className="space-y-4">
                    <FieldGroup label="Recipient">
                      <Input value={email.to} onChange={(event) => setEmail({ ...email, to: event.target.value })} />
                    </FieldGroup>
                    <FieldGroup label="Subject">
                      <Input value={email.subject} onChange={(event) => setEmail({ ...email, subject: event.target.value })} />
                    </FieldGroup>
                    <FieldGroup label="Body">
                      <Textarea
                        className="min-h-72"
                        value={email.body}
                        onChange={(event) => setEmail({ ...email, body: event.target.value })}
                      />
                    </FieldGroup>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button variant="secondary" onClick={draftEmail} disabled={busy}>
                        <RefreshCcw className="h-4 w-4" />
                        Draft body
                      </Button>
                      <Button onClick={sendEmail} disabled={busy || !email.to || !email.subject || !email.body}>
                        <Send className="h-4 w-4" />
                        Send
                      </Button>
                    </div>
                  </div>
                  <div className="self-start rounded-md border border-border bg-slate-50/70 p-4 shadow-panel">
                    <div className="mb-3 text-sm font-semibold">Attachment</div>
                    <div className="rounded-md border border-border bg-white p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-50 text-primary">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-sm font-medium">{proposal.title}.pdf</div>
                          <div className="text-xs text-slate-500">Generated at send time</div>
                        </div>
                      </div>
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

function Panel({
  title,
  icon: Icon,
  children
}: {
  title: string;
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
}) {
  return (
    <div className="rounded-md border border-border/80 bg-white p-5 shadow-panel">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-slate-600">
          <Icon className="h-4 w-4" />
        </span>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function FieldGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function ScanField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-1 font-medium text-slate-500">{label}</div>
      <div className="min-h-8 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-slate-800">{value}</div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-48 items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50/70 text-sm text-slate-500">
      {message}
    </div>
  );
}
