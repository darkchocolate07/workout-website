import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRagQuery } from "@/hooks/use-workout-data";
import { Loader2, Sparkles } from "lucide-react";

export default function Ask() {
  const [q, setQ] = useState("");
  const rag = useRagQuery();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    await rag.mutateAsync(q.trim());
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

        <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-2">
              <Sparkles className="w-7 h-7 text-primary" />
              <span className="text-gradient">Ask</span> your data
            </h1>
            <p className="text-white/60 mt-2 text-sm leading-relaxed">
              Answers are built only from exercises in the library, your workout
              logs, and your saved plans. Nothing is pulled from the open web or a
              general AI model—retrieval is limited to what you have stored here.
            </p>
          </div>

          <Card className="glass-panel border-white/10 bg-card/80">
            <CardHeader>
              <CardTitle className="font-display text-lg">Question</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="q">What do you want to know?</Label>
                  <textarea
                    id="q"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    rows={4}
                    placeholder='e.g. "What did I log for chest?" or "What’s on my push plan?"'
                    className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>
                <Button type="submit" disabled={rag.isPending || !q.trim()}>
                  {rag.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Searching your data…
                    </>
                  ) : (
                    "Ask"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {rag.isError ? (
            <p className="text-destructive text-sm">
              {rag.error instanceof Error ? rag.error.message : "Request failed"}
            </p>
          ) : null}

          {rag.data ? (
            <div className="space-y-4">
              <Card className="border-white/10 bg-card/60">
                <CardHeader>
                  <CardTitle className="text-base font-display">Answer</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="whitespace-pre-wrap text-sm text-white/85 font-sans leading-relaxed">
                    {rag.data.answer}
                  </pre>
                  {rag.data.mode ? (
                    <p className="text-[10px] uppercase tracking-wider text-white/35 mt-2">
                      Mode: {rag.data.mode === "groq" ? "Groq (grounded)" : "Template"}
                    </p>
                  ) : null}
                  <p className="text-xs text-white/45 mt-4 border-t border-white/10 pt-3">
                    {rag.data.disclaimer}
                  </p>
                </CardContent>
              </Card>

              {rag.data.sources.length > 0 ? (
                <Card className="border-white/10 bg-card/40">
                  <CardHeader>
                    <CardTitle className="text-base font-display">Sources</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      {rag.data.sources.map((s, i) => (
                        <li
                          key={`${s.kind}-${s.id}-${i}`}
                          className="border-l-2 border-primary/40 pl-3"
                        >
                          <span className="text-white/50 uppercase text-xs">
                            {s.kind}
                          </span>
                          <p className="text-white font-medium">{s.label}</p>
                          <p className="text-white/60 text-xs">{s.detail}</p>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ) : null}
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
