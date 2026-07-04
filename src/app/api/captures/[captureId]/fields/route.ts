import { NextResponse, type NextRequest } from "next/server";
import { parseIntake } from "@/lib/forms/default-form";
import { store } from "@/lib/server/demo-store";

export async function PATCH(request: NextRequest, context: { params: Promise<{ captureId: string }> }) {
  const { captureId } = await context.params;
  const capture = store.captures.get(captureId);

  if (!capture) {
    return NextResponse.json({ error: "Capture not found." }, { status: 404 });
  }

  const intake = parseIntake(await request.json());
  capture.extractedFields = intake;

  return NextResponse.json({ captureId, intake });
}
