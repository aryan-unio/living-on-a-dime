import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tiny Counter — Made with 0.2 Credits" },
      { name: "description", content: "A tiny counter app built with just 0.2 Lovable credits." },
      { property: "og:title", content: "Tiny Counter" },
      { property: "og:description", content: "A tiny counter app built with just 0.2 Lovable credits." },
    ],
  }),
  component: Index,
});

function Index() {
  const [count, setCount] = useState(0);
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background text-foreground">
      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Built with 0.2 credits</p>
      <h1 className="text-6xl font-bold tabular-nums">{count}</h1>
      <div className="flex gap-3">
        <button
          onClick={() => setCount((c) => c - 1)}
          className="rounded-md border border-border px-5 py-2 text-sm font-medium hover:bg-accent"
        >
          −
        </button>
        <button
          onClick={() => setCount(0)}
          className="rounded-md border border-border px-5 py-2 text-sm font-medium hover:bg-accent"
        >
          reset
        </button>
        <button
          onClick={() => setCount((c) => c + 1)}
          className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          +
        </button>
      </div>
    </main>
  );
}
