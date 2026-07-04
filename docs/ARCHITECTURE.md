# Proposal AI Architecture

## Runtime Shape

- `src/app` contains the Next.js App Router UI and API endpoints.
- `src/components` contains the capture/review/proposal/email work surface.
- `src/lib/forms` defines the reviewed intake schema used after OCR.
- `src/lib/proposal` owns proposal generation, patch validation, patch application, and HTML rendering.
- `src/lib/server` isolates OpenAI, Google Vision OCR, Gotenberg PDF rendering, Postmark email, and the local demo store.
- `prisma/schema.prisma` defines the production data model.

## AI Editing Contract

The app never accepts a full replacement proposal from the model. The model returns patch operations. The backend validates those operations before the user can apply them.

Allowed operations:

- `rewrite_section`
- `insert_section_after`
- `update_field`
- `update_table_cell`
- `add_timeline_milestone`

Locked sections, especially `terms`, cannot be rewritten by AI. Delivery, pricing, and quantity edits produce warnings and remain reviewable before sending.

## MVP External Services

- OCR: Google Vision OCR REST API, with demo fallback when credentials are absent.
- AI: OpenAI Responses API, with structured JSON outputs and demo fallback when `OPENAI_API_KEY` is absent.
- PDF: Gotenberg HTML-to-PDF, with HTML fallback when the service is unavailable.
- Email: Postmark, with demo response when credentials are absent.
