import { Router, type IRouter } from "express";
import {
  buildGroundedAnswer,
  formatContextPackForLlm,
  mergeQuestionForRetrieval,
  retrieveGroundedContext,
  type RagChatTurn,
} from "../lib/rag";
import { groqChatCompletion, groqChatMultiTurn } from "../lib/groq";

const GROQ_SYSTEM = `You are a workout assistant for one user.

Rules (strict):
- You may ONLY use facts that appear in the DATABASE CONTEXT block in the latest user message. Treat that block as the entire universe of truth for facts.
- Earlier user/assistant messages are only for conversational continuity. If they conflict with DATABASE CONTEXT, always follow DATABASE CONTEXT.
- If DATABASE CONTEXT says no rows matched or is empty of useful facts, say clearly that the user's stored data does not contain an answer—do not guess.
- Never invent exercise names, weights, reps, dates, or plan details that are not explicitly in DATABASE CONTEXT.
- Do not use general fitness knowledge beyond rephrasing or organizing what is in DATABASE CONTEXT.
- Exercise rows may include \`media_urls=\` with full https URLs (images). When the user asks for links or pictures, list those URLs exactly as given in CONTEXT—do not invent or shorten URLs.
- Be concise. Use short paragraphs or bullet lists.`;

function parseConversation(raw: unknown): RagChatTurn[] | undefined {
  if (raw == null) return undefined;
  if (!Array.isArray(raw)) return undefined;
  const out: RagChatTurn[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const role = (item as { role?: unknown }).role;
    const content = (item as { content?: unknown }).content;
    if (role !== "user" && role !== "assistant") continue;
    if (typeof content !== "string" || !content.trim()) continue;
    out.push({
      role,
      content: content.trim().slice(0, 8000),
    });
  }
  return out.length ? out.slice(-16) : undefined;
}

const router: IRouter = Router();

router.post("/query", async (req, res) => {
  const userId = req.authUserId!;
  const body = req.body as { question?: unknown; conversation?: unknown };

  if (typeof body.question !== "string" || !body.question.trim()) {
    res.status(400).json({
      error: "invalid_body",
      message: 'Provide a non-empty "question" string',
    });
    return;
  }

  const question = body.question.trim();
  if (question.length > 2000) {
    res.status(400).json({
      error: "invalid_body",
      message: "Question is too long (max 2000 characters)",
    });
    return;
  }

  const conversation = parseConversation(body.conversation);

  try {
    const retrievalQuery = mergeQuestionForRetrieval(question, conversation);
    const ctx = await retrieveGroundedContext(userId, retrievalQuery);
    const { sources } = buildGroundedAnswer(question, ctx);

    const groqKey = process.env.GROQ_API_KEY?.trim();
    const contextPack = formatContextPackForLlm(ctx);
    const latestBlock = `DATABASE CONTEXT:\n${contextPack}\n\n---\nYour question:\n${question}`;

    if (groqKey) {
      try {
        const prior = conversation ?? [];
        const answer =
          prior.length > 0
            ? await groqChatMultiTurn({
                apiKey: groqKey,
                system: GROQ_SYSTEM,
                priorMessages: prior,
                latestUserContent: latestBlock,
              })
            : await groqChatCompletion({
                apiKey: groqKey,
                system: GROQ_SYSTEM,
                user: `DATABASE CONTEXT:\n${contextPack}\n\nUSER QUESTION:\n${question}`,
              });
        res.json({
          answer,
          sources,
          mode: "groq",
          disclaimer:
            "Retrieval used only your exercise library, logs, and plans. The reply is phrased by Groq but must follow the DATABASE CONTEXT—no web search.",
        });
        return;
      } catch (groqErr) {
        req.log.warn({ err: groqErr }, "Groq failed; falling back to template answer");
      }
    }

    const { answer } = buildGroundedAnswer(question, ctx);
    res.json({
      answer,
      sources,
      mode: "template",
      disclaimer:
        "This response is assembled only from exercises, your workout logs, and your plans in this database (template mode). Set GROQ_API_KEY for a natural-language summary with the same grounding.",
    });
  } catch (err) {
    req.log.error({ err }, "RAG query failed");
    res.status(500).json({ error: "internal_error", message: "Query failed" });
  }
});

export default router;
