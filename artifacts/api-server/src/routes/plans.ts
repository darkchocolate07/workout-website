import { Router, type IRouter } from "express";
import { randomUUID } from "node:crypto";
import { db } from "@workspace/db";
import {
  exercisesTable,
  planExercisesTable,
  workoutPlansTable,
} from "@workspace/db/schema";
import { and, asc, eq } from "drizzle-orm";

const SPLIT_TYPES = new Set([
  "push",
  "pull",
  "legs",
  "upper",
  "lower",
  "full",
  "custom",
]);

const router: IRouter = Router();

router.get("/", async (req, res) => {
  const userId = req.authUserId!;
  try {
    const plans = await db
      .select()
      .from(workoutPlansTable)
      .where(eq(workoutPlansTable.userId, userId))
      .orderBy(asc(workoutPlansTable.createdAt));

    res.json({ plans });
  } catch (err) {
    req.log.error({ err }, "Failed to list plans");
    res.status(500).json({ error: "internal_error", message: "Failed to list plans" });
  }
});

router.get("/:id", async (req, res) => {
  const userId = req.authUserId!;
  const { id } = req.params;

  try {
    const [plan] = await db
      .select()
      .from(workoutPlansTable)
      .where(
        and(eq(workoutPlansTable.id, id), eq(workoutPlansTable.userId, userId)),
      )
      .limit(1);

    if (!plan) {
      res.status(404).json({ error: "not_found", message: "Plan not found" });
      return;
    }

    const items = await db
      .select({
        id: planExercisesTable.id,
        exerciseId: planExercisesTable.exerciseId,
        exerciseName: exercisesTable.name,
        dayLabel: planExercisesTable.dayLabel,
        sortOrder: planExercisesTable.sortOrder,
        targetSets: planExercisesTable.targetSets,
        targetReps: planExercisesTable.targetReps,
        notes: planExercisesTable.notes,
      })
      .from(planExercisesTable)
      .innerJoin(
        exercisesTable,
        eq(planExercisesTable.exerciseId, exercisesTable.id),
      )
      .where(eq(planExercisesTable.planId, id))
      .orderBy(asc(planExercisesTable.sortOrder), asc(planExercisesTable.dayLabel));

    res.json({ plan, items });
  } catch (err) {
    req.log.error({ err }, "Failed to get plan");
    res.status(500).json({ error: "internal_error", message: "Failed to get plan" });
  }
});

router.post("/", async (req, res) => {
  const userId = req.authUserId!;
  const body = req.body as {
    name?: unknown;
    splitType?: unknown;
    items?: unknown;
  };

  if (typeof body.name !== "string" || !body.name.trim()) {
    res.status(400).json({ error: "invalid_body", message: "name is required" });
    return;
  }

  const splitType =
    typeof body.splitType === "string" && SPLIT_TYPES.has(body.splitType)
      ? body.splitType
      : "custom";

  const planId = randomUUID();

  type ItemIn = {
    exerciseId: string;
    dayLabel?: string;
    sortOrder?: number;
    targetSets?: number | null;
    targetReps?: string | null;
    notes?: string | null;
  };

  const rawItems = Array.isArray(body.items) ? body.items : [];
  const items: ItemIn[] = [];
  for (const row of rawItems) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    if (typeof r.exerciseId !== "string" || !r.exerciseId.trim()) continue;
    items.push({
      exerciseId: r.exerciseId.trim(),
      dayLabel: typeof r.dayLabel === "string" ? r.dayLabel : "Day",
      sortOrder: typeof r.sortOrder === "number" ? r.sortOrder : 0,
      targetSets:
        typeof r.targetSets === "number" && Number.isFinite(r.targetSets)
          ? Math.floor(r.targetSets)
          : null,
      targetReps: typeof r.targetReps === "string" ? r.targetReps : null,
      notes: typeof r.notes === "string" ? r.notes : null,
    });
  }

  try {
    await db.insert(workoutPlansTable).values({
      id: planId,
      userId,
      name: body.name.trim(),
      splitType,
    });

    for (let i = 0; i < items.length; i++) {
      const it = items[i]!;
      const [ex] = await db
        .select({ id: exercisesTable.id })
        .from(exercisesTable)
        .where(eq(exercisesTable.id, it.exerciseId))
        .limit(1);
      if (!ex) {
        await db.delete(workoutPlansTable).where(eq(workoutPlansTable.id, planId));
        res.status(400).json({
          error: "invalid_exercise",
          message: `Unknown exercise id: ${it.exerciseId}`,
        });
        return;
      }

      await db.insert(planExercisesTable).values({
        id: randomUUID(),
        planId,
        exerciseId: it.exerciseId,
        dayLabel: it.dayLabel ?? "Day",
        sortOrder: it.sortOrder ?? i,
        targetSets: it.targetSets,
        targetReps: it.targetReps,
        notes: it.notes,
      });
    }

    const [plan] = await db
      .select()
      .from(workoutPlansTable)
      .where(eq(workoutPlansTable.id, planId))
      .limit(1);

    const detailItems = await db
      .select({
        id: planExercisesTable.id,
        exerciseId: planExercisesTable.exerciseId,
        exerciseName: exercisesTable.name,
        dayLabel: planExercisesTable.dayLabel,
        sortOrder: planExercisesTable.sortOrder,
        targetSets: planExercisesTable.targetSets,
        targetReps: planExercisesTable.targetReps,
        notes: planExercisesTable.notes,
      })
      .from(planExercisesTable)
      .innerJoin(
        exercisesTable,
        eq(planExercisesTable.exerciseId, exercisesTable.id),
      )
      .where(eq(planExercisesTable.planId, planId))
      .orderBy(asc(planExercisesTable.sortOrder));

    res.status(201).json({ plan, items: detailItems });
  } catch (err) {
    req.log.error({ err }, "Failed to create plan");
    res.status(500).json({ error: "internal_error", message: "Failed to create plan" });
  }
});

router.delete("/:id", async (req, res) => {
  const userId = req.authUserId!;
  const { id } = req.params;

  try {
    const removed = await db
      .delete(workoutPlansTable)
      .where(
        and(eq(workoutPlansTable.id, id), eq(workoutPlansTable.userId, userId)),
      )
      .returning({ id: workoutPlansTable.id });

    if (removed.length === 0) {
      res.status(404).json({ error: "not_found", message: "Plan not found" });
      return;
    }

    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete plan");
    res.status(500).json({ error: "internal_error", message: "Failed to delete plan" });
  }
});

router.post("/:id/items", async (req, res) => {
  const userId = req.authUserId!;
  const { id: planId } = req.params;
  const body = req.body as {
    exerciseId?: unknown;
    dayLabel?: unknown;
    sortOrder?: unknown;
    targetSets?: unknown;
    targetReps?: unknown;
    notes?: unknown;
  };

  if (typeof body.exerciseId !== "string" || !body.exerciseId.trim()) {
    res.status(400).json({ error: "invalid_body", message: "exerciseId is required" });
    return;
  }

  try {
    const [plan] = await db
      .select()
      .from(workoutPlansTable)
      .where(
        and(
          eq(workoutPlansTable.id, planId),
          eq(workoutPlansTable.userId, userId),
        ),
      )
      .limit(1);

    if (!plan) {
      res.status(404).json({ error: "not_found", message: "Plan not found" });
      return;
    }

    const [ex] = await db
      .select()
      .from(exercisesTable)
      .where(eq(exercisesTable.id, body.exerciseId.trim()))
      .limit(1);

    if (!ex) {
      res.status(404).json({ error: "not_found", message: "Exercise not found" });
      return;
    }

    const itemId = randomUUID();
    const sortOrder =
      typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)
        ? Math.floor(body.sortOrder)
        : 0;

    await db.insert(planExercisesTable).values({
      id: itemId,
      planId,
      exerciseId: body.exerciseId.trim(),
      dayLabel:
        typeof body.dayLabel === "string" && body.dayLabel.trim()
          ? body.dayLabel.trim()
          : "Day",
      sortOrder,
      targetSets:
        typeof body.targetSets === "number" && Number.isFinite(body.targetSets)
          ? Math.floor(body.targetSets)
          : null,
      targetReps:
        typeof body.targetReps === "string" ? body.targetReps : null,
      notes: typeof body.notes === "string" ? body.notes : null,
    });

    const [item] = await db
      .select({
        id: planExercisesTable.id,
        exerciseId: planExercisesTable.exerciseId,
        exerciseName: exercisesTable.name,
        dayLabel: planExercisesTable.dayLabel,
        sortOrder: planExercisesTable.sortOrder,
        targetSets: planExercisesTable.targetSets,
        targetReps: planExercisesTable.targetReps,
        notes: planExercisesTable.notes,
      })
      .from(planExercisesTable)
      .innerJoin(
        exercisesTable,
        eq(planExercisesTable.exerciseId, exercisesTable.id),
      )
      .where(eq(planExercisesTable.id, itemId))
      .limit(1);

    res.status(201).json({ item });
  } catch (err) {
    req.log.error({ err }, "Failed to add plan item");
    res.status(500).json({ error: "internal_error", message: "Failed to add item" });
  }
});

router.delete("/:id/items/:itemId", async (req, res) => {
  const userId = req.authUserId!;
  const { id: planId, itemId } = req.params;

  try {
    const [plan] = await db
      .select()
      .from(workoutPlansTable)
      .where(
        and(
          eq(workoutPlansTable.id, planId),
          eq(workoutPlansTable.userId, userId),
        ),
      )
      .limit(1);

    if (!plan) {
      res.status(404).json({ error: "not_found", message: "Plan not found" });
      return;
    }

    const removed = await db
      .delete(planExercisesTable)
      .where(
        and(
          eq(planExercisesTable.id, itemId),
          eq(planExercisesTable.planId, planId),
        ),
      )
      .returning({ id: planExercisesTable.id });

    if (removed.length === 0) {
      res.status(404).json({ error: "not_found", message: "Item not found" });
      return;
    }

    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete plan item");
    res
      .status(500)
      .json({ error: "internal_error", message: "Failed to delete item" });
  }
});

export default router;
