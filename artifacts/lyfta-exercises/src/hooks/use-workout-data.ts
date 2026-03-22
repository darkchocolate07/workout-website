import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAuthBearerHeaders } from "@/lib/auth-token";
import { resolveApiPath } from "@/lib/api-url";

export type WorkoutLogRow = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  bodyPart: string;
  performedAt: string;
  sets: number | null;
  reps: number | null;
  weightKg: number | null;
  notes: string | null;
};

export type PlanSummary = {
  id: string;
  userId: string;
  name: string;
  splitType: string;
  createdAt: string;
};

export type PlanItemRow = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  dayLabel: string;
  sortOrder: number;
  targetSets: number | null;
  targetReps: string | null;
  notes: string | null;
};

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

export function useWorkoutLogs() {
  return useQuery({
    queryKey: ["worklogs"],
    queryFn: async () => {
      const res = await fetch(resolveApiPath("/api/worklogs"), {
        headers: { ...getAuthBearerHeaders() },
      });
      if (!res.ok) throw new Error("Failed to load logs");
      const data = await parseJson<{ logs: WorkoutLogRow[] }>(res);
      return data.logs;
    },
  });
}

export function useCreateWorkoutLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      exerciseId: string;
      performedAt?: string;
      sets?: number;
      reps?: number;
      weightKg?: number;
      notes?: string;
    }) => {
      const res = await fetch(resolveApiPath("/api/worklogs"), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...getAuthBearerHeaders(),
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await parseJson<{ message?: string }>(res);
        throw new Error(err.message ?? "Failed to save log");
      }
      return parseJson<{ log: WorkoutLogRow }>(res);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["worklogs"] });
    },
  });
}

export function useDeleteWorkoutLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(resolveApiPath(`/api/worklogs/${id}`), {
        method: "DELETE",
        headers: { ...getAuthBearerHeaders() },
      });
      if (!res.ok) throw new Error("Failed to delete log");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["worklogs"] });
    },
  });
}

export function usePlans() {
  return useQuery({
    queryKey: ["plans"],
    queryFn: async () => {
      const res = await fetch(resolveApiPath("/api/plans"), {
        headers: { ...getAuthBearerHeaders() },
      });
      if (!res.ok) throw new Error("Failed to load plans");
      const data = await parseJson<{ plans: PlanSummary[] }>(res);
      return data.plans;
    },
  });
}

export function usePlanDetail(id: string | null) {
  return useQuery({
    queryKey: ["plans", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const res = await fetch(resolveApiPath(`/api/plans/${id}`), {
        headers: { ...getAuthBearerHeaders() },
      });
      if (!res.ok) throw new Error("Failed to load plan");
      return parseJson<{ plan: PlanSummary; items: PlanItemRow[] }>(res);
    },
  });
}

export function useCreatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      name: string;
      splitType: string;
      items?: Array<{
        exerciseId: string;
        dayLabel?: string;
        sortOrder?: number;
        targetSets?: number | null;
        targetReps?: string | null;
        notes?: string | null;
      }>;
    }) => {
      const res = await fetch(resolveApiPath("/api/plans"), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...getAuthBearerHeaders(),
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await parseJson<{ message?: string }>(res);
        throw new Error(err.message ?? "Failed to create plan");
      }
      return parseJson(res);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plans"] });
    },
  });
}

export function useDeletePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(resolveApiPath(`/api/plans/${id}`), {
        method: "DELETE",
        headers: { ...getAuthBearerHeaders() },
      });
      if (!res.ok) throw new Error("Failed to delete plan");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plans"] });
    },
  });
}

export function useAddPlanItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      planId: string;
      exerciseId: string;
      dayLabel?: string;
      sortOrder?: number;
      targetSets?: number | null;
      targetReps?: string | null;
      notes?: string | null;
    }) => {
      const { planId, ...body } = payload;
      const res = await fetch(resolveApiPath(`/api/plans/${planId}/items`), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...getAuthBearerHeaders(),
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await parseJson<{ message?: string }>(res);
        throw new Error(err.message ?? "Failed to add exercise");
      }
      return parseJson(res);
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["plans"] });
      qc.invalidateQueries({ queryKey: ["plans", v.planId] });
    },
  });
}

export function useDeletePlanItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { planId: string; itemId: string }) => {
      const res = await fetch(
        resolveApiPath(`/api/plans/${payload.planId}/items/${payload.itemId}`),
        {
          method: "DELETE",
          headers: { ...getAuthBearerHeaders() },
        },
      );
      if (!res.ok) throw new Error("Failed to remove exercise");
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["plans"] });
      qc.invalidateQueries({ queryKey: ["plans", v.planId] });
    },
  });
}

export function useRagQuery() {
  return useMutation({
    mutationFn: async (question: string) => {
      const res = await fetch(resolveApiPath("/api/rag/query"), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...getAuthBearerHeaders(),
        },
        body: JSON.stringify({ question }),
      });
      if (!res.ok) {
        const err = await parseJson<{ message?: string }>(res);
        throw new Error(err.message ?? "Query failed");
      }
      return parseJson<{
        answer: string;
        mode?: "groq" | "template";
        sources: Array<{
          kind: string;
          id: string;
          label: string;
          detail: string;
        }>;
        disclaimer: string;
      }>(res);
    },
  });
}
