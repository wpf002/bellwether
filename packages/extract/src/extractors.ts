import { z } from "zod/v4";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
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
  "Do NOT score, rank, rate, predict, or express opinions. Extract only what is stated in the text.",
  "If a field is not present in the text, use null (or an empty array). Never invent values.",
].join(" ");

export interface ExtractInput<S extends z.ZodType = z.ZodType> {
  prompt: ExtractionPrompt;
  /** The raw text to extract from (already de-HTML'd upstream where relevant). */
  text: string;
  /** Zod schema describing the expected structured output. */
  schema: S;
}

/**
 * Turns unstructured text into a typed object using structured outputs: the
 * model is constrained to the provided schema server-side, and the SDK validates
 * the response before returning it. The LLM's job — extract, never decide — is
 * enforced by both the guardrail prompt and the schema.
 *
 * Throws if the model returns no parseable output (e.g. a safety refusal), so a
 * caller never persists an unvalidated "signal".
 */
export async function extractStructured<S extends z.ZodType>(
  input: ExtractInput<S>,
): Promise<z.infer<S>> {
  const client = getAnthropic();
  const message = await client.messages.parse({
    model: extractModel(),
    max_tokens: 2048,
    system: `${STRUCTURED_ONLY_GUARDRAIL}\n\n${input.prompt.system}`,
    messages: [{ role: "user", content: input.text }],
    output_config: { format: zodOutputFormat(input.schema) },
  });

  if (message.parsed_output == null) {
    const reason = message.stop_reason === "refusal" ? "safety refusal" : "no parseable output";
    throw new Error(`extractStructured: model returned ${reason}`);
  }
  return message.parsed_output as z.infer<S>;
}
