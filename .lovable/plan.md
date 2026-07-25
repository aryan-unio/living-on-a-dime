## Unio Invoice — Supabase migration + per-user auth

### Scope
Move all persistence from `localStorage` to Lovable Cloud (Supabase). Add email/password auth with a profiles table. Every row is scoped to the signed-in user via `user_id` + RLS. All existing pages keep working with the same shapes.

### 1. Backend (single migration)
Enable Lovable Cloud, then create:

- `profiles` (id uuid PK = auth.users.id, display_name, avatar_url, created_at)
  - trigger `handle_new_user()` inserts a profile row on signup
- `companies`, `customers`, `invoices`, `quotes`, `expenses`, `items`, `projects`, `settings` — schemas from the spec, **plus `user_id uuid not null references auth.users`** on each
- Enable RLS on all tables + GRANTs to `authenticated` and `service_role`
- Policies: `using (auth.uid() = user_id) with check (auth.uid() = user_id)` — one policy per table, covers all CRUD
- Indexes on `user_id` for every table

No permissive `using (true)` — that would leak data across accounts.

### 2. Auth surface
- `/auth` — public route with Sign In / Sign Up tabs (email + password). Uses `supabase.auth.signUp` with `emailRedirectTo: window.location.origin`. Session listener in `__root.tsx`.
- Managed `_authenticated/route.tsx` layout gates the app. Move all existing routes (`dashboard`, `invoices`, `customers`, `quotes`, `expenses`, `items`, `reports`, `settings`, `recurring`, `timesheet`) under `src/routes/_authenticated/`.
- `/` redirects to `/dashboard` if signed in, else `/auth`.
- Sidebar shows the signed-in user's email + Sign Out (with proper cache teardown).

### 3. Data layer
Replace `src/lib/storage.ts` + `src/hooks/use-store.ts` with per-entity hooks in `src/hooks/`:

- `useCompany`, `useCustomers`, `useInvoices`, `useQuotes`, `useExpenses`, `useItems`, `useProjects`, `useSettings`
- Each returns `{ data, loading, error, refetch }` and exposes `upsert`/`delete` helpers
- Reads use TanStack Query (already installed). Writes invalidate the relevant query key. `user_id` auto-filled from `supabase.auth.getUser()` on insert.
- Loading → skeleton; error → toast + retry button.

Only the browser Supabase client is used (`@/integrations/supabase/client`) — no server functions needed for v1, since RLS enforces per-user access.

### 4. Seed data
On first sign-in, if `companies` returns 0 rows for this user, insert the existing seed (1 company, 5 customers, 8 invoices, 3 quotes, 4 expenses, 5 items) — all stamped with the current `user_id`. Runs client-side once per new account.

### 5. Cleanup
- Delete `src/lib/storage.ts`, `src/lib/seed.ts` (moved to a client seed helper), `ensureSeed` calls, `unio:data-changed` events.
- Every call site of `store.getX()` / `store.upsertX()` swapped to the new hook.
- Settings page: replace the "stored locally" banner with a green "securely stored in Lovable Cloud" note. Keep Export (JSON download) as a nice-to-have; drop Import / Clear.

### 6. Verification
- `tsgo --noEmit` clean
- Sign up two accounts in two browsers → each sees only its own seed data
- CRUD works across invoices, customers, quotes, expenses, items
- Refresh on `/invoices/INV-0001` still loads

### Technical notes
- `id text primary key` for user-facing entities (kept for compatibility with existing UID strings like `inv_xxx`, `cust_xxx`).
- No real-time subscriptions in v1 — TanStack Query invalidation covers the same UX. Easy to add later.
- Recurring invoices, timesheet stay as list-view stubs reading from the new hooks where relevant.
- Company logo remains base64 in the `logo` text column (matches current shape). No storage bucket yet.

This is a large migration touching ~30 files. I'll do it in one pass and typecheck at the end.
