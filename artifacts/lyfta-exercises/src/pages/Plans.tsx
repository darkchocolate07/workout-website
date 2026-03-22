import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  usePlans,
  usePlanDetail,
  useCreatePlan,
  useDeletePlan,
  useAddPlanItem,
  useDeletePlanItem,
} from "@/hooks/use-workout-data";
import { useListExercises } from "@/hooks/use-exercises";
import { Loader2, Trash2 } from "lucide-react";

const SPLITS = [
  { value: "push", label: "Push" },
  { value: "pull", label: "Pull" },
  { value: "legs", label: "Legs" },
  { value: "upper", label: "Upper" },
  { value: "lower", label: "Lower" },
  { value: "full", label: "Full body" },
  { value: "custom", label: "Custom" },
];

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function Plans() {
  const { data: plans, isLoading } = usePlans();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: detail } = usePlanDetail(selectedId);

  const [name, setName] = useState("");
  const [split, setSplit] = useState("custom");
  const createPlan = useCreatePlan();
  const deletePlan = useDeletePlan();

  const [exSearch, setExSearch] = useState("");
  const debouncedSearch = useDebounced(exSearch, 250);
  const { data: exData } = useListExercises({
    search: debouncedSearch,
    bodyPart: "",
    equipment: "",
    page: 1,
    limit: 12,
  });
  const [dayLabel, setDayLabel] = useState("Push day");
  const addItem = useAddPlanItem();
  const delItem = useDeletePlanItem();

  async function onCreatePlan(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const res = await createPlan.mutateAsync({
      name: name.trim(),
      splitType: split,
    });
    setName("");
    const plan = (res as { plan?: { id: string } }).plan;
    if (plan?.id) setSelectedId(plan.id);
  }

  return (
    <div className="min-h-screen flex flex-col relative">
      <div className="fixed inset-0 pointer-events-none z-0">
        <img
          src={`${import.meta.env.BASE_URL}images/hero-bg.png`}
          alt=""
          className="w-full h-full object-cover opacity-20 mix-blend-overlay"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/90 to-background" />
      </div>

      <div className="relative z-10 flex flex-col flex-1">
        <Navbar />

        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
          <h1 className="text-2xl md:text-3xl font-display font-bold">
            <span className="text-gradient">Training</span> plans
          </h1>

          <Card className="glass-panel border-white/10 bg-card/80">
            <CardHeader>
              <CardTitle className="font-display">New plan</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={onCreatePlan}
                className="flex flex-col sm:flex-row gap-3 sm:items-end"
              >
                <div className="flex-1 space-y-1">
                  <Label htmlFor="pname">Name</Label>
                  <Input
                    id="pname"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. PPL — Block"
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div className="w-full sm:w-48 space-y-1">
                  <Label>Split</Label>
                  <Select value={split} onValueChange={setSplit}>
                    <SelectTrigger className="bg-white/5 border-white/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SPLITS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" disabled={createPlan.isPending}>
                  {createPlan.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Create"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="grid gap-8 lg:grid-cols-2">
            <section>
              <h2 className="text-lg font-display font-semibold mb-3">Your plans</h2>
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              ) : !plans?.length ? (
                <p className="text-white/50">No plans yet.</p>
              ) : (
                <ul className="space-y-2">
                  {plans.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(p.id)}
                        className={`w-full text-left p-3 rounded-xl border transition-colors ${
                          selectedId === p.id
                            ? "border-primary bg-primary/10"
                            : "border-white/10 bg-white/5 hover:bg-white/10"
                        }`}
                      >
                        <span className="font-medium text-white">{p.name}</span>
                        <span className="block text-xs text-white/50 uppercase tracking-wide mt-0.5">
                          {p.splitType}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-display font-semibold">
                {detail?.plan ? detail.plan.name : "Select a plan"}
              </h2>
              {detail?.plan ? (
                <>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() =>
                        deletePlan.mutate(detail.plan.id, {
                          onSuccess: () => setSelectedId(null),
                        })
                      }
                      disabled={deletePlan.isPending}
                    >
                      Delete plan
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-white/70">Exercises</h3>
                    {!detail.items.length ? (
                      <p className="text-sm text-white/50">No exercises yet.</p>
                    ) : (
                      <ul className="space-y-2">
                        {detail.items.map((it) => (
                          <li
                            key={it.id}
                            className="flex items-start justify-between gap-2 p-2 rounded-lg border border-white/10 bg-white/5 text-sm"
                          >
                            <div>
                              <span className="text-white font-medium">
                                {it.exerciseName}
                              </span>
                              <span className="block text-white/50">
                                {it.dayLabel}
                                {it.targetSets != null
                                  ? ` · ${it.targetSets} sets`
                                  : ""}
                                {it.targetReps ? ` · ${it.targetReps} reps` : ""}
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="shrink-0 text-white/40 hover:text-destructive"
                              onClick={() =>
                                delItem.mutate({
                                  planId: detail.plan.id,
                                  itemId: it.id,
                                })
                              }
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="pt-2 border-t border-white/10 space-y-2">
                    <Label>Add exercise from library</Label>
                    <Input
                      value={exSearch}
                      onChange={(e) => setExSearch(e.target.value)}
                      placeholder="Search…"
                      className="bg-white/5 border-white/10"
                    />
                    <div className="flex flex-wrap gap-2">
                      {exData?.exercises.map((ex) => (
                        <Button
                          key={ex.id}
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="text-xs"
                          onClick={() =>
                            addItem.mutate({
                              planId: detail.plan.id,
                              exerciseId: ex.id,
                              dayLabel,
                            })
                          }
                          disabled={addItem.isPending}
                        >
                          + {ex.name}
                        </Button>
                      ))}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="dayLabel">Day label</Label>
                      <Input
                        id="dayLabel"
                        value={dayLabel}
                        onChange={(e) => setDayLabel(e.target.value)}
                        placeholder="Push day, Pull day, Leg day…"
                        className="bg-white/5 border-white/10"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-white/50 text-sm">
                  Create a plan and select it to add exercises (e.g. push / pull /
                  legs days).
                </p>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
