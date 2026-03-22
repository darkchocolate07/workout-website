import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useWorkoutLogs,
  useCreateWorkoutLog,
  useDeleteWorkoutLog,
} from "@/hooks/use-workout-data";
import { useListExercises } from "@/hooks/use-exercises";
import { Loader2, Trash2 } from "lucide-react";
import type { Exercise } from "@workspace/api-client-react";

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function Log() {
  const [search, setSearch] = useState("");
  const debounced = useDebounced(search, 250);
  const { data: exercisesData, isLoading: loadingEx } = useListExercises({
    search: debounced,
    bodyPart: "",
    equipment: "",
    page: 1,
    limit: 16,
  });
  const [picked, setPicked] = useState<Exercise | null>(null);
  const [performedAt, setPerformedAt] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  const [sets, setSets] = useState("");
  const [reps, setReps] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [notes, setNotes] = useState("");

  const { data: logs, isLoading: loadingLogs } = useWorkoutLogs();
  const createLog = useCreateWorkoutLog();
  const deleteLog = useDeleteWorkoutLog();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!picked) return;
    await createLog.mutateAsync({
      exerciseId: picked.id,
      performedAt: new Date(performedAt).toISOString(),
      sets: sets ? Number(sets) : undefined,
      reps: reps ? Number(reps) : undefined,
      weightKg: weightKg ? Number(weightKg) : undefined,
      notes: notes || undefined,
    });
    setSets("");
    setReps("");
    setWeightKg("");
    setNotes("");
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
            <span className="text-gradient">Log</span> workouts
          </h1>

          <Card className="glass-panel border-white/10 bg-card/80">
            <CardHeader>
              <CardTitle className="font-display">Add a set / session</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-white/80">Find exercise</Label>
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search library…"
                  className="mt-1 bg-white/5 border-white/10"
                />
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {loadingEx ? (
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  ) : (
                    exercisesData?.exercises.map((ex) => (
                      <button
                        key={ex.id}
                        type="button"
                        onClick={() => setPicked(ex)}
                        className={`text-left text-sm p-2 rounded-lg border transition-colors ${
                          picked?.id === ex.id
                            ? "border-primary bg-primary/10"
                            : "border-white/10 bg-white/5 hover:bg-white/10"
                        }`}
                      >
                        {ex.name}
                        <span className="block text-xs text-white/50">
                          {ex.bodyPart} · {ex.equipment}
                        </span>
                      </button>
                    ))
                  )}
                </div>
                {picked ? (
                  <p className="mt-2 text-sm text-primary font-medium">
                    Selected: {picked.name}
                  </p>
                ) : null}
              </div>

              <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="when">When</Label>
                  <Input
                    id="when"
                    type="datetime-local"
                    value={performedAt}
                    onChange={(e) => setPerformedAt(e.target.value)}
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="sets">Sets</Label>
                  <Input
                    id="sets"
                    inputMode="numeric"
                    value={sets}
                    onChange={(e) => setSets(e.target.value)}
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="reps">Reps</Label>
                  <Input
                    id="reps"
                    inputMode="numeric"
                    value={reps}
                    onChange={(e) => setReps(e.target.value)}
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    inputMode="decimal"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Button
                    type="submit"
                    disabled={!picked || createLog.isPending}
                  >
                    {createLog.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Saving…
                      </>
                    ) : (
                      "Save log"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <section>
            <h2 className="text-lg font-display font-semibold mb-4">History</h2>
            {loadingLogs ? (
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            ) : !logs?.length ? (
              <p className="text-white/50">No logs yet.</p>
            ) : (
              <ul className="space-y-2">
                {logs.map((log) => (
                  <li
                    key={log.id}
                    className="flex items-start justify-between gap-3 p-3 rounded-xl border border-white/10 bg-white/5"
                  >
                    <div>
                      <p className="font-medium text-white">{log.exerciseName}</p>
                      <p className="text-sm text-white/60">
                        {new Date(log.performedAt).toLocaleString()} ·{" "}
                        {log.bodyPart}
                      </p>
                      <p className="text-sm text-white/70 mt-1">
                        {[
                          log.sets != null ? `${log.sets} sets` : null,
                          log.reps != null ? `${log.reps} reps` : null,
                          log.weightKg != null ? `${log.weightKg} kg` : null,
                          log.notes,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-white/50 hover:text-destructive shrink-0"
                      onClick={() => deleteLog.mutate(log.id)}
                      disabled={deleteLog.isPending}
                      aria-label="Delete log"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
