// Shared AI client - points at a self-hosted vLLM server (OpenAI-compatible)
// when AI_BASE_URL is set, and falls back to Groq cloud otherwise.
// All API routes import `groq` and `AI_MODEL` from here.

import Groq from "groq-sdk";

// Shared AI model for all routes. Defaults to the self-hosted vLLM model.
export const AI_MODEL = process.env.AI_MODEL || "careerpath-ai";

// The groq-sdk appends its own path prefix ("/openai/v1/...") to baseURL.
// OpenAI-compatible servers like vLLM serve "/v1/..." instead, so when
// AI_BASE_URL points at a self-hosted server we transparently rewrite the
// path in-flight. AI_BASE_URL should be the server ROOT (no /v1 suffix);
// a trailing "/v1" is stripped defensively.
const AI_BASE_URL = process.env.AI_BASE_URL?.replace(/\/$/, "").replace(/\/v1$/, "");

// True when the AI endpoint is our own vLLM server (supports vLLM-only
// extensions like guided_json). False when falling back to Groq cloud.
export const isSelfHostedAI = Boolean(AI_BASE_URL);

type GroqOptions = NonNullable<ConstructorParameters<typeof Groq>[0]>;
const adaptedFetch: NonNullable<GroqOptions["fetch"]> | undefined = AI_BASE_URL
    ? (input, init) => {
          const url =
              input instanceof URL ? input.toString() : typeof input === "string" ? input : input.url;
          return fetch(url.replace("/openai/v1/", "/v1/"), init);
      }
    : undefined;

export const groq = new Groq({
    // For self-hosted vLLM set AI_API_KEY (must match --api-key passed to vLLM).
    // Falls back to GROQ_API_KEY when using Groq cloud directly.
    apiKey: process.env.AI_API_KEY || process.env.GROQ_API_KEY || "not-needed",
    baseURL: AI_BASE_URL || undefined,
    fetch: adaptedFetch,
    timeout: 120_000,
    maxRetries: 2,
});
