import { streamText } from "ai";
import { createLovableAiGatewayProvider } from "./gateway-helpers.ts";

const MODEL = "google/gemini-3-flash-preview";

export class AiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
  }
}

/** Streams a Gemini completion and parses the final JSON object. */
export type AiFile = { mimeType: string; base64: string; filename: string };

export async function generateJson<T>(system: string, prompt: string, files: AiFile[] = []): Promise<T> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new AiError("AI is not configured (missing key)", 401);
  const provider = createLovableAiGatewayProvider(key, undefined, { baseURL: "https://ai.gateway.lovable.dev/v1" });
  let failure: unknown = null;
  const result = streamText({
    model: provider.chatModel(MODEL),
    system: system + "\nRespond ONLY with a single valid JSON object, no markdown.",
    ...(files.length
      ? {
          messages: [
            {
              role: "user" as const,
              content: [
                { type: "text" as const, text: prompt },
                ...files.map((f) =>
                  f.mimeType.startsWith("image/")
                    ? { type: "image" as const, image: `data:${f.mimeType};base64,${f.base64}` }
                    : { type: "file" as const, data: f.base64, mediaType: f.mimeType, filename: f.filename },
                ),
              ],
            },
          ],
        }
      : { prompt }),
    onError: ({ error }) => {
      failure = error;
    },
  });
  let text = "";
  for await (const chunk of result.textStream) text += chunk;
  if (failure) {
    const e = failure as { statusCode?: number; message?: string };
    const status = e.statusCode;
    const msg =
      status === 429 ? "AI is rate limited, please try again in a minute." : status === 402 ? "AI credits exhausted for this workspace." : e.message || "AI request failed";
    throw new AiError(msg, status);
  }
  const cleaned = text.replace(/^```(json)?/m, "").replace(/```\s*$/m, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < 0) throw new AiError("AI returned no usable answer");
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as T;
  } catch {
    throw new AiError("AI returned malformed JSON");
  }
}
