import { Router, type IRouter } from "express";
import {
  buildGroundedAnswer,
  formatContextPackForLlm,
  retrieveGroundedContext,
} from "../lib/rag";
import { groqChatCompletion } from "../lib/groq";

const GROQ_SYSTEM = `You are a workout assistant for one user.

Rules (strict):
- You may ONLY use facts that appear in the CONTEXT block below. Treat CONTEXT as the entire universe of truth.
- If CONTEXT says no rows matched or is empty of useful facts, say clearly that the user's stored data does not contain an answer—do not guess.
- Never invent exercise names, weights, reps, dates, or plan details that are not explicitly in CONTEXT.
- Do not use general fitness knowledge beyond rephrasing or organizing what is in CONTEXT.
- Be concise. Use short paragraphs or bullet lists.`;

const router: IRouter = Router();

router.post("/query", async (req, res) => {
  const userId = req.authUserId!;
  const body = req.body as { question?: unknown };

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

  try {
    const ctx = await retrieveGroundedContext(userId, question);
    const { sources } = buildGroundedAnswer(question, ctx);

    const groqKey = process.env.GROQ_API_KEY?.trim();
    if (groqKey) {
      try {
        const contextPack = formatContextPackForLlm(ctx);
        const userPayload = `CONTEXT:\n${contextPack}\n\nUSER QUESTION:\n${question}`;
        const answer = await groqChatCompletion({
          apiKey: groqKey,
          system: GROQ_SYSTEM,
          user: userPayload,
        });
        res.json({
          answer,
          sources,
          mode: "groq",
          disclaimer:
            "Retrieval used only your exercise library, logs, and plans. The reply is phrased by Groq but must follow the CONTEXT sent to it—no web search. If Groq misstates something, check the Sources list.",
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
