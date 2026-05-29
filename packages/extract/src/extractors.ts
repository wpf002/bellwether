import { z } from "zod";
import type { ExtractionPrompt } from "@bellwether/core";
import { getAnthropic, extractModel } from "./client.js";

/**
 * HARD INVARIANT (from the Vantage playbook):
 * The LLM is used in EXACTLY one role across this platform — turning
 * unstructured text into STRUCTURED DATA. It never scores, ranks, decides, or
 * predicts. Magnitudes/KPIs are computed downstream by counting provenance and
 * applying declarative aggregations. If you ever find yourself asking the model
 * "how important is X" or "which is better", stop: that belongs in code.
 */

const STRUCTURED_ONLY_GUARDRAIL = [
  "You are a data extraction function, not an analyst.",
  "Return ONLY valid JSON matching the requested shape. No prose, no markdown fences.",
  "Do NOT score, rank, rate, predict, or express opinions. Extract what is stated.",
  "If a field is not present in the text, use null. Never invent values.",
].join(" ");

export interface ExtractInput {
  prompt: ExtractionPrompt;
  /** The raw text to extract from (already de-HTML'd upstream where relevant). */
  text: string;
  /** Zod schema describing the expected structured output. */
  schema: z.ZodTypeAny;
}

export async function extractStructured<T>(input: ExtractInput): Promise<T> {
  const client = getAnthropic();
  const res = await client.messages.create({
    model: extractModel(),
    max_tokens: 1024,
    system: `${STRUCTURED_ONLY_GUARDRAIL}\n\n${input.prompt.system}`,
    messages: [{ role: "user", content: input.text }],
  });

  const block = res.content.find((b) => b.type === "text");
  const jsonText = block && block.type === "text" ? block.text : "";
  const cleaned = jsonText.replace(/```json|```/g, "").trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("extractStructured: model did not return valid JSON");
  }
  // Validate against the caller's schema — extraction is only trusted if typed.
  return input.schema.parse(parsed) as T;
}
