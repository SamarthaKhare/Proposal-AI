import { NextResponse, type NextRequest } from "next/server";
import { extractTextFromImage } from "@/lib/server/ocr";
import { extractIntakeWithAi } from "@/lib/server/openai";
import { store } from "@/lib/server/demo-store";

export async function POST(request: NextRequest, context: { params: Promise<{ captureId: string }> }) {
  const { captureId } = await context.params;
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A form image file is required for extraction." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ocr = await extractTextFromImage(buffer);
  if (!ocr.text.trim()) {
    return NextResponse.json(
      {
        error: ocr.warnings[0] || "OCR did not return any text from the uploaded image.",
        captureId,
        ocr
      },
      { status: 503 }
    );
  }

  const intake = await extractIntakeWithAi(ocr.text);

  const capture = store.captures.get(captureId);
  if (capture) {
    capture.ocrText = ocr.text;
    capture.extractedFields = intake;
  }

  return NextResponse.json({
    captureId,
    ocr,
    intake
  });
}
