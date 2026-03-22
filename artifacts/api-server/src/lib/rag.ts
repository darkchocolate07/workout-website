import { db } from "@workspace/db";
import {
  exercisesTable,
  planExercisesTable,
  workoutLogsTable,
  workoutPlansTable,
} from "@workspace/db/schema";
import { and, asc, desc, eq, ilike, or } from "drizzle-orm";

export type RagSource = {
  kind: "exercise" | "log" | "plan";
  id: string;
  label: string;
  detail: string;
  /** Illustration URLs from the exercise row (gif + stills), when present. */
  urls?: string[];
};

/** Deduped media URLs stored for an exercise (gif first, then still images). */
export function exerciseMediaUrls(
  e: typeof exercisesTable.$inferSelect,
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const u of [e.gifUrl, ...e.images]) {
    const s = typeof u === "string" ? u.trim() : "";
    if (s && !seen.has(s)) {
      seen.add(s);
      out.push(s);
    }
  }
  return out;
}

function tokenizeQuestion(q: string): string[] {
  const terms = q
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 2)
    .slice(0, 12);
  if (terms.length > 0) return terms;
  const t = q.trim().toLowerCase();
  return t ? [t] : [];
}

/** Merge recent user turns with the latest question so short follow-ups still retrieve well ("what about legs?"). */
export type RagChatTurn = { role: "user" | "assistant"; content: string };

export function mergeQuestionForRetrieval(
  question: string,
  conversation: RagChatTurn[] | undefined,
): string {
  const q = question.trim();
  if (!conversation?.length) return q;
  const userMsgs = conversation
    .filter((m) => m.role === "user")
    .slice(-4)
    .map((m) => m.content.trim())
    .filter(Boolean);
  const merged = [...userMsgs, q].join(" ");
  return merged.slice(0, 3000);
}

export async function retrieveGroundedContext(userId: string, question: string) {
  const searchTerms = tokenizeQuestion(question);
  if (searchTerms.length === 0) {
    return {
      exercises: [] as (typeof exercisesTable.$inferSelect)[],
      logs: [] as Array<{
        log: typeof workoutLogsTable.$inferSelect;
        exerciseName: string;
      }>,
      plans: [] as Array<{
        plan: typeof workoutPlansTable.$inferSelect;
        items: Array<{ dayLabel: string; exerciseName: string; notes: string | null }>;
      }>,
    };
  }

  const exOrs = searchTerms.flatMap((t) => [
    ilike(exercisesTable.name, `%${t}%`),
    ilike(exercisesTable.bodyPart, `%${t}%`),
    ilike(exercisesTable.target, `%${t}%`),
  ]);

  const exercises = await db
    .select()
    .from(exercisesTable)
    .where(or(...exOrs))
    .limit(24);

  const logOrs = searchTerms.map((t) => ilike(exercisesTable.name, `%${t}%`));
  const logs = await db
    .select({
      log: workoutLogsTable,
      exerciseName: exercisesTable.name,
    })
    .from(workoutLogsTable)
    .innerJoin(
      exercisesTable,
      eq(workoutLogsTable.exerciseId, exercisesTable.id),
    )
    .where(and(eq(workoutLogsTable.userId, userId), or(...logOrs)))
    .orderBy(desc(workoutLogsTable.performedAt))
    .limit(40);

  const planOrs = searchTerms.flatMap((t) => [
    ilike(workoutPlansTable.name, `%${t}%`),
    ilike(planExercisesTable.dayLabel, `%${t}%`),
    ilike(exercisesTable.name, `%${t}%`),
  ]);

  const planFlat = await db
    .select({
      plan: workoutPlansTable,
      dayLabel: planExercisesTable.dayLabel,
      exerciseName: exercisesTable.name,
      notes: planExercisesTable.notes,
    })
    .from(workoutPlansTable)
    .innerJoin(
      planExercisesTable,
      eq(workoutPlansTable.id, planExercisesTable.planId),
    )
    .innerJoin(
      exercisesTable,
      eq(planExercisesTable.exerciseId, exercisesTable.id),
    )
    .where(and(eq(workoutPlansTable.userId, userId), or(...planOrs)))
    .orderBy(asc(workoutPlansTable.name), asc(planExercisesTable.sortOrder))
    .limit(80);

  const planMap = new Map<
    string,
    {
      plan: typeof workoutPlansTable.$inferSelect;
      items: Array<{ dayLabel: string; exerciseName: string; notes: string | null }>;
    }
  >();

  for (const row of planFlat) {
    const existing = planMap.get(row.plan.id);
    const item = {
      dayLabel: row.dayLabel,
      exerciseName: row.exerciseName,
      notes: row.notes,
    };
    if (!existing) {
      planMap.set(row.plan.id, { plan: row.plan, items: [item] });
    } else {
      existing.items.push(item);
    }
  }

  return {
    exercises,
    logs,
    plans: [...planMap.values()],
  };
}

export type RagContext = Awaited<ReturnType<typeof retrieveGroundedContext>>;

/** Plain-text facts for LLM grounding (no prose — model must not invent beyond this). */
export function formatContextPackForLlm(ctx: RagContext): string {
  const lines: string[] = [];
  for (const e of ctx.exercises) {
    const media = exerciseMediaUrls(e);
    const mediaPart =
      media.length > 0 ? ` | media_urls=${media.join(" ; ")}` : "";
    lines.push(
      `[EXERCISE] id=${e.id} | name=${e.name} | bodyPart=${e.bodyPart} | equipment=${e.equipment} | target=${e.target}${mediaPart}`,
    );
  }
  for (const { log, exerciseName } of ctx.logs) {
    const when =
      log.performedAt instanceof Date
        ? log.performedAt.toISOString()
        : String(log.performedAt);
    lines.push(
      `[LOG] id=${log.id} | exercise=${exerciseName} | performedAt=${when} | sets=${log.sets ?? "n/a"} | reps=${log.reps ?? "n/a"} | weightKg=${log.weightKg ?? "n/a"} | notes=${log.notes ?? ""}`,
    );
  }
  for (const { plan, items } of ctx.plans) {
    lines.push(
      `[PLAN] id=${plan.id} | name=${plan.name} | splitType=${plan.splitType}`,
    );
    for (const i of items) {
      lines.push(
        `  | day=${i.dayLabel} | exercise=${i.exerciseName} | notes=${i.notes ?? ""}`,
      );
    }
  }
  return lines.length > 0
    ? lines.join("\n")
    : "(No database rows matched the question keywords. Say clearly that nothing relevant was found in the user's stored data.)";
}

export function buildGroundedAnswer(
  question: string,
  ctx: Awaited<ReturnType<typeof retrieveGroundedContext>>,
): { answer: string; sources: RagSource[] } {
  const sources: RagSource[] = [];

  for (const e of ctx.exercises) {
    const urls = exerciseMediaUrls(e);
    sources.push({
      kind: "exercise",
      id: e.id,
      label: e.name,
      detail: `${e.bodyPart} · ${e.equipment} · target: ${e.target}`,
      ...(urls.length > 0 ? { urls } : {}),
    });
  }

  for (const { log, exerciseName } of ctx.logs) {
    const when = log.performedAt.toISOString?.() ?? String(log.performedAt);
    const parts = [
      exerciseName,
      when,
      log.sets != null ? `${log.sets} sets` : null,
      log.reps != null ? `${log.reps} reps` : null,
      log.weightKg != null ? `${log.weightKg} kg` : null,
      log.notes,
    ].filter(Boolean);
    sources.push({
      kind: "log",
      id: log.id,
      label: exerciseName,
      detail: parts.join(" · "),
    });
  }

  for (const { plan, items } of ctx.plans) {
    const lines = items.map(
      (i) =>
        `${i.dayLabel}: ${i.exerciseName}${i.notes ? ` (${i.notes})` : ""}`,
    );
    sources.push({
      kind: "plan",
      id: plan.id,
      label: plan.name,
      detail: `[${plan.splitType}] ${lines.join("; ")}`,
    });
  }

  if (sources.length === 0) {
    return {
      answer:
        "No matching information was found in your database for this question. " +
        "Try different keywords, or add workout logs and plans first. " +
        "Answers are limited strictly to exercises, your logs, and your plans in this app.",
      sources: [],
    };
  }

  const lines: string[] = [
    "The following is assembled only from your exercise library, your workout logs, and your saved plans (nothing is invented beyond this data).",
    "",
    `Your question: “${question.trim()}”`,
    "",
  ];

  if (ctx.exercises.length > 0) {
    lines.push("**From the exercise library**");
    for (const e of ctx.exercises.slice(0, 10)) {
      const media = exerciseMediaUrls(e);
      const urlBit =
        media.length > 0
          ? ` — image URLs: ${media.slice(0, 4).join(" | ")}${media.length > 4 ? ` (+${media.length - 4} more)` : ""}`
          : "";
      lines.push(
        `- ${e.name} (${e.bodyPart}, ${e.equipment}) — target: ${e.target}${urlBit}`,
      );
    }
    if (ctx.exercises.length > 10) {
      lines.push(`…and ${ctx.exercises.length - 10} more matching exercises.`);
    }
    lines.push("");
  }

  if (ctx.logs.length > 0) {
    lines.push("**From your workout logs**");
    for (const { log, exerciseName } of ctx.logs.slice(0, 15)) {
      const when = log.performedAt.toISOString?.() ?? String(log.performedAt);
      const stats = [
        log.sets != null ? `${log.sets}×` : null,
        log.reps != null ? `${log.reps}` : null,
        log.weightKg != null ? `@ ${log.weightKg} kg` : null,
      ]
        .filter(Boolean)
        .join(" ");
      lines.push(
        `- ${exerciseName} on ${when}${stats ? ` — ${stats}` : ""}${log.notes ? ` — ${log.notes}` : ""}`,
      );
    }
    if (ctx.logs.length > 15) {
      lines.push(`…and ${ctx.logs.length - 15} more log entries.`);
    }
    lines.push("");
  }

  if (ctx.plans.length > 0) {
    lines.push("**From your plans**");
    for (const { plan, items } of ctx.plans.slice(0, 8)) {
      lines.push(`- Plan “${plan.name}” (${plan.splitType})`);
      for (const i of items.slice(0, 12)) {
        lines.push(`  · ${i.dayLabel}: ${i.exerciseName}`);
      }
      if (items.length > 12) lines.push(`  · …${items.length - 12} more lines`);
    }
    lines.push("");
  }

  lines.push(
    "If you need a narrower answer, ask about a specific exercise name, body part, or plan name.",
  );

  return {
    answer: lines.join("\n"),
    sources: sources.slice(0, 50),
  };
}
