# Proposal AI

Responsive web application for turning salesperson field notes into reviewed, AI-assisted proposals.

## MVP Workflow

1. Salesperson uploads a photo of a predefined paper form.
2. OCR extracts text from the image.
3. OpenAI normalizes the OCR text into a structured proposal intake schema.
4. Salesperson reviews and corrects extracted fields.
5. The app drafts an editable proposal from a selected template.
6. Salesperson requests conversational edits in chat.
7. AI returns structured patch operations that are previewed before apply.
8. The app renders a PDF and sends an approved email with the proposal attached.

## Local Development

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

The UI includes a local demo path so the core workflow can run without external credentials. Real OCR through Amazon Textract, AI, PDF rendering, and email sending through Resend require the environment variables in `.env.example`.

## Verification

```bash
pnpm lint
pnpm test
pnpm build
```
