import { NextResponse, type NextRequest } from "next/server";
import { importDocxTemplate } from "@/lib/templates/docx";
import { store } from "@/lib/server/demo-store";
import { id } from "@/lib/utils";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A DOCX file is required." }, { status: 400 });
  }

  const imported = await importDocxTemplate(Buffer.from(await file.arrayBuffer()));
  const template = {
    id: id("template"),
    name: file.name.replace(/\.docx$/i, ""),
    placeholders: imported.placeholders,
    rawText: imported.rawText
  };

  store.templates.set(template.id, template);

  return NextResponse.json({ template });
}
