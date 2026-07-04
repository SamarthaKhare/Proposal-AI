import { NextResponse, type NextRequest } from "next/server";
import { defaultFormVersion } from "@/lib/forms/default-form";
import { store } from "@/lib/server/demo-store";
import { id } from "@/lib/utils";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A form image file is required." }, { status: 400 });
  }

  const captureId = id("capture");
  const buffer = Buffer.from(await file.arrayBuffer());

  store.captures.set(captureId, {
    id: captureId,
    formVersion: String(formData.get("formVersion") || defaultFormVersion),
    fileName: file.name,
    extractedFields: {
      uploadedBytes: buffer.byteLength,
      contentType: file.type
    }
  });

  return NextResponse.json({
    id: captureId,
    formVersion: String(formData.get("formVersion") || defaultFormVersion),
    fileName: file.name
  });
}
