import { z } from "zod";

const envSchema = z.object({
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_DRAFT_MODEL: z.string().default("gpt-5.5"),
  OPENAI_FAST_MODEL: z.string().default("gpt-5.4-mini"),
  GOTENBERG_URL: z.string().url().default("http://localhost:3001"),
  POSTMARK_SERVER_TOKEN: z.string().optional(),
  POSTMARK_FROM_EMAIL: z.string().email().optional(),
  POSTMARK_REPLY_TO: z.string().email().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000")
});

export function getEnv() {
  return envSchema.parse({
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_DRAFT_MODEL: process.env.OPENAI_DRAFT_MODEL || "gpt-5.5",
    OPENAI_FAST_MODEL: process.env.OPENAI_FAST_MODEL || "gpt-5.4-mini",
    GOTENBERG_URL: process.env.GOTENBERG_URL || "http://localhost:3001",
    POSTMARK_SERVER_TOKEN: process.env.POSTMARK_SERVER_TOKEN,
    POSTMARK_FROM_EMAIL: process.env.POSTMARK_FROM_EMAIL,
    POSTMARK_REPLY_TO: process.env.POSTMARK_REPLY_TO,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  });
}
