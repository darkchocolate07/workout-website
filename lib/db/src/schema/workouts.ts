import { pgTable, text, integer, real, timestamp } from "drizzle-orm/pg-core";
import { exercisesTable } from "./exercises";

export const workoutPlansTable = pgTable("workout_plans", {
  id: text("id").primaryKey().notNull(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  /** e.g. push | pull | legs | upper | lower | full | custom */
  splitType: text("split_type").notNull().default("custom"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const planExercisesTable = pgTable("plan_exercises", {
  id: text("id").primaryKey().notNull(),
  planId: text("plan_id")
    .notNull()
    .references(() => workoutPlansTable.id, { onDelete: "cascade" }),
  exerciseId: text("exercise_id")
    .notNull()
    .references(() => exercisesTable.id),
  dayLabel: text("day_label").notNull().default("Day"),
  sortOrder: integer("sort_order").notNull().default(0),
  targetSets: integer("target_sets"),
  targetReps: text("target_reps"),
  notes: text("notes"),
});

export const workoutLogsTable = pgTable("workout_logs", {
  id: text("id").primaryKey().notNull(),
  userId: text("user_id").notNull(),
  exerciseId: text("exercise_id")
    .notNull()
    .references(() => exercisesTable.id),
  performedAt: timestamp("performed_at", { withTimezone: true }).notNull().defaultNow(),
  sets: integer("sets"),
  reps: integer("reps"),
  weightKg: real("weight_kg"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
