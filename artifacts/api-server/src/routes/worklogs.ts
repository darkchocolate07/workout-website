import { Router, type IRouter } from "express";
import { randomUUID } from "node:crypto";
import { db } from "@workspace/db";
import { exercisesTable, workoutLogsTable } from "@workspace/db/schema";
import { and, desc, eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  const userId = req.authUserId!;
  try {
    const rows = await db
      .select({
        id: workoutLogsTable.id,
        exerciseId: workoutLogsTable.exerciseId,
        exerciseName: exercisesTable.name,
        bodyPart: exercisesTable.bodyPart,
        performedAt: workoutLogsTable.performedAt,
        sets: workoutLogsTable.sets,
        reps: workoutLogsTable.reps,
        weightKg: workoutLogsTable.weightKg,
        notes: workoutLogsTable.notes,
      })
      .from(workoutLogsTable)
      .innerJoin(
        exercisesTable,
        eq(workoutLogsTable.exerciseId, exercisesTable.id),
      )
      .where(eq(workoutLogsTable.userId, userId))
      .orderBy(desc(workoutLogsTable.performedAt))
      .limit(500);

    res.json({ logs: rows });
  } catch (err) {
    req.log.error({ err }, "Failed to list workout logs");
    res.status(500).json({ error: "internal_error", message: "Failed to list logs" });
  }
});

router.post("/", async (req, res) => {
  const userId = req.authUserId!;
  const body = req.body as {
    exerciseId?: unknown;
    performedAt?: unknown;
    sets?: unknown;
    reps?: unknown;
    weightKg?: unknown;
    notes?: unknown;
  };

  if (typeof body.exerciseId !== "string" || !body.exerciseId.trim()) {
    res.status(400).json({ error: "invalid_body", message: "exerciseId is required" });
    return;
  }

  try {
    const [ex] = await db
      .select({ id: exercisesTable.id })
      .from(exercisesTable)
      .where(eq(exercisesTable.id, body.exerciseId.trim()))
      .limit(1);

    if (!ex) {
      res.status(404).json({ error: "not_found", message: "Exercise not found" });
      return;
    }

    const id = randomUUID();
    let performedAt = new Date();
    if (typeof body.performedAt === "string" && body.performedAt) {
      const d = new Date(body.performedAt);
      if (!Number.isNaN(d.getTime())) performedAt = d;
    }

    const sets =
      typeof body.sets === "number" && Number.isFinite(body.sets)
        ? Math.max(0, Math.floor(body.sets))
        : null;
    const reps =
      typeof body.reps === "number" && Number.isFinite(body.reps)
        ? Math.max(0, Math.floor(body.reps))
        : null;
    const weightKg =
      typeof body.weightKg === "number" && Number.isFinite(body.weightKg)
        ? body.weightKg
        : null;
    const notes =
      typeof body.notes === "string" && body.notes.trim()
        ? body.notes.trim()
        : null;

    await db.insert(workoutLogsTable).values({
      id,
      userId,
      exerciseId: body.exerciseId.trim(),
      performedAt,
      sets,
      reps,
      weightKg,
      notes,
    });

    const [row] = await db
      .select({
        id: workoutLogsTable.id,
        exerciseId: workoutLogsTable.exerciseId,
        exerciseName: exercisesTable.name,
        bodyPart: exercisesTable.bodyPart,
        performedAt: workoutLogsTable.performedAt,
        sets: workoutLogsTable.sets,
        reps: workoutLogsTable.reps,
        weightKg: workoutLogsTable.weightKg,
        notes: workoutLogsTable.notes,
      })
      .from(workoutLogsTable)
      .innerJoin(
        exercisesTable,
        eq(workoutLogsTable.exerciseId, exercisesTable.id),
      )
      .where(eq(workoutLogsTable.id, id))
      .limit(1);

    res.status(201).json({ log: row });
  } catch (err) {
    req.log.error({ err }, "Failed to create workout log");
    res.status(500).json({ error: "internal_error", message: "Failed to create log" });
  }
});

router.delete("/:id", async (req, res) => {
  const userId = req.authUserId!;
  const { id } = req.params;
  if (!id) {
    res.status(400).json({ error: "invalid_params", message: "Missing id" });
    return;
  }

  try {
    const removed = await db
      .delete(workoutLogsTable)
      .where(
        and(eq(workoutLogsTable.id, id), eq(workoutLogsTable.userId, userId)),
      )
      .returning({ id: workoutLogsTable.id });

    if (removed.length === 0) {
      res.status(404).json({ error: "not_found", message: "Log not found" });
      return;
    }

    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete workout log");
    res.status(500).json({ error: "internal_error", message: "Failed to delete log" });
  }
});

export default router;
