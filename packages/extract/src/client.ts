import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set");
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

export function extractModel(): string {
  // Default to the most capable model. Extraction is high-volume and runs once
  // per (raw record × entity kind), so a cheaper model (e.g. claude-haiku-4-5)
  // is a reasonable cost lever for this structured-only workload — set
  // EXTRACT_MODEL to override.
  return process.env.EXTRACT_MODEL ?? "claude-opus-4-8";
}
