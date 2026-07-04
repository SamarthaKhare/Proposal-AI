export type OcrResult = {
  text: string;
  provider: "google-vision" | "demo";
  warnings: string[];
};

export async function extractTextFromImage(buffer: Buffer): Promise<OcrResult> {
  const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;

  if (!apiKey) {
    return {
      provider: "demo",
      text: [
        "Customer Name: ABC Interiors Pvt. Ltd.",
        "Contact Person: Priya Sharma",
        "Customer Email: priya@example.com",
        "Product Required: Modular kitchen cabinets",
        "Quantity: 20 units",
        "Delivery Timeline: 4 weeks after PO confirmation",
        "Custom Message: Prioritize before showroom opening",
        "Special Requirement: Installation must finish before showroom launch"
      ].join("\n"),
      warnings: ["GOOGLE_CLOUD_VISION_API_KEY is not set. Demo OCR text was used."]
    };
  }

  const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      requests: [
        {
          image: {
            content: buffer.toString("base64")
          },
          features: [
            {
              type: "DOCUMENT_TEXT_DETECTION"
            }
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    return {
      provider: "google-vision",
      text: "",
      warnings: [`Google Vision OCR failed with status ${response.status}.`]
    };
  }

  const payload = await response.json();
  const text = payload.responses?.[0]?.fullTextAnnotation?.text || payload.responses?.[0]?.textAnnotations?.[0]?.description || "";

  return {
    provider: "google-vision",
    text,
    warnings: text ? [] : ["No text was detected in the uploaded image."]
  };
}
