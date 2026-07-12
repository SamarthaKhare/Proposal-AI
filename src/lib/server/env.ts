import { z } from "zod";

function optionalEnv(value: string | undefined) {
  return value || undefined;
}

const envSchema = z.object({
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_DRAFT_MODEL: z.string().default("gpt-5.6-terra"),
  OPENAI_FAST_MODEL: z.string().default("gpt-5.6-luna"),
  AWS_REGION: z.string().default("us-east-1"),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_SESSION_TOKEN: z.string().optional(),
  AWS_PROFILE: z.string().optional(),
  GOTENBERG_URL: z.string().url().default("http://localhost:3001"),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().email().optional(),
  RESEND_REPLY_TO: z.string().email().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000")
});

export function getEnv() {
  return envSchema.parse({
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_DRAFT_MODEL: process.env.OPENAI_DRAFT_MODEL || "gpt-5.6-terra",
    OPENAI_FAST_MODEL: process.env.OPENAI_FAST_MODEL || "gpt-5.6-luna",
    AWS_REGION: process.env.AWS_REGION || "us-east-1",
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    AWS_SESSION_TOKEN: process.env.AWS_SESSION_TOKEN,
    AWS_PROFILE: process.env.AWS_PROFILE,
    GOTENBERG_URL: process.env.GOTENBERG_URL || "http://localhost:3001",
    RESEND_API_KEY: optionalEnv(process.env.RESEND_API_KEY),
    RESEND_FROM_EMAIL: optionalEnv(process.env.RESEND_FROM_EMAIL),
    RESEND_REPLY_TO: optionalEnv(process.env.RESEND_REPLY_TO),
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  });
}
