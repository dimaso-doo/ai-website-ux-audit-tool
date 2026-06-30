export async function generateAuditReport(prompt: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set.");
  }

  const model = process.env.OPENAI_MODEL || "gpt-5.4-mini";
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: prompt,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || "OpenAI request failed.");
  }

  const outputText =
    data.output_text ||
    data.output
      ?.flatMap((item: { content?: Array<{ text?: string }> }) => item.content || [])
      .map((content: { text?: string }) => content.text || "")
      .join("\n")
      .trim();

  if (!outputText) {
    throw new Error("OpenAI returned an empty report.");
  }

  return outputText;
}
