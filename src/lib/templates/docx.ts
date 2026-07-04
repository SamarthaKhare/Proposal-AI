import mammoth from "mammoth";

export type ImportedTemplate = {
  rawText: string;
  placeholders: string[];
};

const placeholderPattern = /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g;

export async function importDocxTemplate(buffer: Buffer): Promise<ImportedTemplate> {
  const result = await mammoth.extractRawText({ buffer });
  const placeholders = Array.from(result.value.matchAll(placeholderPattern), (match) => match[1]);

  return {
    rawText: result.value,
    placeholders: Array.from(new Set(placeholders)).sort()
  };
}
