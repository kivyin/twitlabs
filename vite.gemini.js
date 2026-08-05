/**
 * Shared Google Gemini helpers for receipt scan and Training AI Coach.
 */

export const GEMINI_DEFAULT_MODEL = "gemini-3.1-flash-lite";

export function requireGeminiApiKey(featureLabel = "AI") {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      `${featureLabel} is not configured. Add GEMINI_API_KEY to your .env file and restart the server.`
    );
  }
  return apiKey;
}

/**
 * Call Gemini and parse a JSON object response.
 * @param {object} options
 * @param {string} options.prompt
 * @param {number} [options.temperature]
 * @param {string} [options.model]
 * @param {Array<{ mimeType: string, data: string }>} [options.inlineImages]
 * @param {string} [options.emptyError]
 * @param {string} [options.parseError]
 */
export async function callGeminiJson({
  prompt,
  temperature = 0.2,
  model = GEMINI_DEFAULT_MODEL,
  inlineImages = [],
  emptyError = "Gemini returned an empty response.",
  parseError = "Could not parse JSON from Gemini.",
} = {}) {
  const apiKey = requireGeminiApiKey("AI");
  const parts = [{ text: String(prompt || "") }];
  for (const image of inlineImages) {
    if (!image?.data) continue;
    parts.push({
      inline_data: {
        mime_type: image.mimeType || "image/jpeg",
        data: image.data,
      },
    });
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: {
        temperature,
        responseMimeType: "application/json",
      },
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      payload?.error?.message ||
      payload?.error?.status ||
      `Gemini request failed (${response.status}).`;
    throw new Error(message);
  }

  const text =
    payload?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") || "";
  if (!text.trim()) {
    throw new Error(emptyError);
  }

  try {
    return JSON.parse(text);
  } catch {
    const fenced = text.match(/\{[\s\S]*\}/);
    if (!fenced) {
      throw new Error(parseError);
    }
    return JSON.parse(fenced[0]);
  }
}
