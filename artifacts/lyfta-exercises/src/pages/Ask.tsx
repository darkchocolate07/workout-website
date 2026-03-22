import { useEffect, useRef, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRagQuery, type RagChatTurn } from "@/hooks/use-workout-data";
import { Loader2, Sparkles, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

type RagSourceRow = {
  kind: string;
  id: string;
  label: string;
  detail: string;
  urls?: string[];
};

type ChatLine =
  | { id: string; role: "user"; content: string }
  | {
      id: string;
      role: "assistant";
      content: string;
      sources?: RagSourceRow[];
      mode?: "groq" | "template";
    };

export default function Ask() {
  const [messages, setMessages] = useState<ChatLine[]>([]);
  const [input, setInput] = useState("");
  const [lastDisclaimer, setLastDisclaimer] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const rag = useRagQuery();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, rag.isPending]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || rag.isPending) return;

    const conversation: RagChatTurn[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const userLine: ChatLine = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };
    setMessages((m) => [...m, userLine]);
    setInput("");

    try {
      const data = await rag.mutateAsync({
        question: text,
        conversation: conversation.length ? conversation : undefined,
      });
      setLastDisclaimer(data.disclaimer ?? null);
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.answer,
          sources: data.sources,
          mode: data.mode,
        },
      ]);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Request failed. Try again.";
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: msg,
        },
      ]);
    }
  }

  function clearChat() {
    setMessages([]);
    setLastDisclaimer(null);
    rag.reset();
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

      <div className="relative z-10 flex flex-col flex-1 min-h-0">
        <Navbar />

        <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col min-h-0">
          <div className="flex items-start justify-between gap-4 mb-4 shrink-0">
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-2">
                <Sparkles className="w-7 h-7 text-primary" />
                <span className="text-gradient">Ask</span> your data
              </h1>
              <p className="text-white/60 mt-1 text-sm leading-relaxed max-w-xl">
                Chat with your library, logs, and plans. Follow-ups use earlier
                messages for context. Answers stay grounded on your stored data.
              </p>
            </div>
            {messages.length > 0 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearChat}
                className="shrink-0 border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
              >
                <Trash2 className="w-4 h-4 sm:mr-1" />
                <span className="hidden sm:inline">Clear chat</span>
              </Button>
            ) : null}
          </div>

          <Card className="glass-panel border-white/10 bg-card/80 flex flex-col flex-1 min-h-[420px] max-h-[calc(100vh-12rem)]">
            <CardHeader className="shrink-0 pb-2">
              <CardTitle className="font-display text-lg">Conversation</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col flex-1 min-h-0 pt-0">
              <div className="flex-1 overflow-y-auto rounded-lg border border-white/5 bg-black/20 px-3 py-4 space-y-4 mb-3">
                {messages.length === 0 ? (
                  <p className="text-sm text-white/45 text-center py-12 px-2">
                    Ask anything about exercises you’ve saved, workouts you’ve
                    logged, or plans you’ve built. You can keep the thread going
                    with follow-up questions.
                  </p>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={cn(
                        "flex",
                        m.role === "user" ? "justify-end" : "justify-start",
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[92%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                          m.role === "user"
                            ? "bg-primary/25 text-white border border-primary/30"
                            : "bg-white/8 text-white/90 border border-white/10",
                        )}
                      >
                        {m.role === "assistant" ? (
                          <div className="space-y-3">
                            <pre className="whitespace-pre-wrap font-sans">{m.content}</pre>
                            {m.sources && m.sources.length > 0 ? (
                              <div className="border-t border-white/10 pt-3 space-y-2">
                                <p className="text-[10px] uppercase tracking-wider text-white/40">
                                  Sources
                                </p>
                                <ul className="space-y-2 text-xs">
                                  {m.sources.map((s, i) => (
                                    <li
                                      key={`${s.kind}-${s.id}-${i}`}
                                      className="border-l-2 border-primary/35 pl-2"
                                    >
                                      <span className="text-white/45 uppercase">
                                        {s.kind}
                                      </span>
                                      <p className="text-white/90 font-medium">{s.label}</p>
                                      <p className="text-white/55">{s.detail}</p>
                                      {s.urls && s.urls.length > 0 ? (
                                        <ul className="mt-1.5 space-y-1">
                                          {s.urls.map((u) => (
                                            <li key={u}>
                                              <a
                                                href={u}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-primary underline break-all"
                                              >
                                                {u}
                                              </a>
                                            </li>
                                          ))}
                                        </ul>
                                      ) : null}
                                    </li>
                                  ))}
                                </ul>
                                {m.mode ? (
                                  <p className="text-[10px] text-white/35">
                                    Mode:{" "}
                                    {m.mode === "groq"
                                      ? "Groq (grounded)"
                                      : "Template"}
                                  </p>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap">{m.content}</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
                {rag.isPending ? (
                  <div className="flex justify-start">
                    <div className="rounded-2xl px-4 py-3 bg-white/8 border border-white/10 flex items-center gap-2 text-white/70 text-sm">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Searching your data…
                    </div>
                  </div>
                ) : null}
                <div ref={bottomRef} />
              </div>

              <form onSubmit={onSubmit} className="space-y-2 shrink-0">
                <Label htmlFor="chat-input" className="text-white/70">
                  Message
                </Label>
                <textarea
                  id="chat-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  rows={3}
                  placeholder="Ask a question, then follow up in the same thread…"
                  disabled={rag.isPending}
                  className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
                />
                <Button type="submit" disabled={rag.isPending || !input.trim()}>
                  {rag.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Sending…
                    </>
                  ) : (
                    "Send"
                  )}
                </Button>
              </form>

              {lastDisclaimer ? (
                <p className="text-[11px] text-white/40 mt-3 leading-snug border-t border-white/10 pt-3">
                  {lastDisclaimer}
                </p>
              ) : null}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
