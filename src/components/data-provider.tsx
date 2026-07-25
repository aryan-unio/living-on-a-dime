import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { hydrateFromSupabase, resetCache, seedIfEmpty } from "@/lib/storage";
import type { User } from "@supabase/supabase-js";

interface AuthState {
  loading: boolean;
  user: User | null;
  ready: boolean; // data hydrated for this user
}

const listeners = new Set<(s: AuthState) => void>();
let state: AuthState = { loading: true, user: null, ready: false };

function setState(next: Partial<AuthState>) {
  state = { ...state, ...next };
  listeners.forEach((fn) => fn(state));
}

async function hydrate(user: User) {
  setState({ user, ready: false });
  await hydrateFromSupabase(user.id);
  await seedIfEmpty(user.id);
  setState({ ready: true });
}

let initialized = false;
function init() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  supabase.auth.getSession().then(async ({ data }) => {
    if (data.session?.user) {
      await hydrate(data.session.user);
      setState({ loading: false });
    } else {
      setState({ loading: false });
    }
  });

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT") {
      resetCache();
      setState({ user: null, ready: false });
      return;
    }
    if (session?.user && session.user.id !== state.user?.id) {
      hydrate(session.user);
    }
  });
}

export function useAuth() {
  const [s, setS] = useState<AuthState>(state);
  useEffect(() => {
    init();
    const fn = (n: AuthState) => setS(n);
    listeners.add(fn);
    setS(state);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return s;
}

export function DataProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    init();
  }, []);
  return <>{children}</>;
}
