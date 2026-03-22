const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";

const DEFAULT_MODEL = "llama-3.1-8b-instant";

type GroqChatResponse = {
  choices?: Array<{ message?: { content?: string | null } }>;
  error?: { message?: string };
};

/**
 * Chat completion via Groq (OpenAI-compatible). Caller supplies API key from env only.
 */
export async function groqChatCompletion(options: {
  apiKey: string;
  system: string;
  user: string;
  model?: string;
}): Promise<string> {
  const model =
    options.model?.trim() ||
    process.env.GROQ_MODEL?.trim() ||
    DEFAULT_MODEL;

  const res = await fetch(GROQ_CHAT_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${options.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: options.system },
        { role: "user", content: options.user },
      ],
      temperature: 0.2,
      max_tokens: 1200,
    }),
  });

  const raw = await res.text();
  let data: GroqChatResponse;
  try {
    data = JSON.parse(raw) as GroqChatResponse;
  } catch {
    throw new Error(`Groq returned non-JSON (${res.status}): ${raw.slice(0, 200)}`);
  }

  if (!res.ok) {
    const msg = data.error?.message ?? raw.slice(0, 300);
    throw new Error(`Groq API ${res.status}: ${msg}`);
  }

  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error("Groq returned an empty message");
  }
  return text;
}

type ChatRole = "user" | "assistant";

/**
 * Multi-turn chat: system + prior user/assistant turns + final user message (usually CONTEXT + question).
 */
export async function groqChatMultiTurn(options: {
  apiKey: string;
  system: string;
  priorMessages: Array<{ role: ChatRole; content: string }>;
  latestUserContent: string;
  model?: string;
}): Promise<string> {
  const model =
    options.model?.trim() ||
    process.env.GROQ_MODEL?.trim() ||
    DEFAULT_MODEL;

  const messages: Array<{ role: "system" | ChatRole; content: string }> = [
    { role: "system", content: options.system },
    ...options.priorMessages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    { role: "user", content: options.latestUserContent },
  ];

  const res = await fetch(GROQ_CHAT_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${options.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
      max_tokens: 1400,
    }),
  });

  const raw = await res.text();
  let data: GroqChatResponse;
  try {
    data = JSON.parse(raw) as GroqChatResponse;
  } catch {
    throw new Error(`Groq returned non-JSON (${res.status}): ${raw.slice(0, 200)}`);
  }

  if (!res.ok) {
    const msg = data.error?.message ?? raw.slice(0, 300);
    throw new Error(`Groq API ${res.status}: ${msg}`);
  }

  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error("Groq returned an empty message");
  }
  return text;
}
