# Éducation Futée · onboarding app

@AGENTS.md

Onboarding and membership dashboard for **Éducation Futée**, a French-language (Québec) tutoring business: Lecture, Écriture, Mathématiques, at 2e and 3e cycle, in two programs, **Tutorat** (small groups) and **Classes Futées**. Built for Atique (agency owner, Euqitech). All parent-facing and UI text is **French (Québec)**; code and comments are English.

**Status: ready for first real families.** Email goes out through Resend (`email_mode = reel`). SMS is never sent (no provider; messages are only stored). Every message is also stored in `messages` and can be previewed in Boîte d'envoi. The dashboard is behind a shared-password login. No real family has been enrolled yet.

## Where things live

- **Live site:** https://app.educationfutee.com (DNS CNAME in GoDaddy; `education-futee.vercel.app` also works). Vercel team `euqitech`, project `education-futee`, id `prj_pVIcxfgrpvvUgKtTyjHYEyUBVNey`). Every push to `main` deploys to production. Env var changes only apply to **new** deployments, so redeploy after changing one.
- **Database:** Supabase project **Éducation Futée**, ref `uaulnbilcewbjrhjvqik`, region ca-central-1, org Euqitech. Schema reference: `supabase/schema.sql`.
- **Daily reminders:** Vercel cron → `GET /api/relances` (see `vercel.json`), protected by `CRON_SECRET`.

## Environment

| Var | Notes |
|---|---|
| `SUPABASE_URL` | `https://uaulnbilcewbjrhjvqik.supabase.co` |
| `SUPABASE_SECRET_KEY` | Supabase secret key (`sb_secret_...`), **server-side only**. **Required**: the tables are locked to every other key. |
| `SUPABASE_KEY` | Supabase publishable key. Legacy fallback in `db()`; it cannot read or write any table now. |
| `APP_URL` | Public base URL for confirmation links and the email logo. Production: `https://app.educationfutee.com`. |
| `RESEND_API_KEY` | Resend key with sending access. Without it, test and real modes record an `echec`. |
| `ADMIN_PASSWORD` | The shared staff password for the dashboard login. |
| `AUTH_SECRET` | Random secret that signs the session cookie. Changing it logs everyone out. |
| `CRON_SECRET` | Protects `/api/relances`. |

Production env vars live in Vercel only (sensitive ones are unreadable there). Never print or commit them.

Local setup: `npm install`, then `vercel env pull .env.local` (or copy the values from the Supabase dashboard), then `npm run dev`. Check before pushing: `npx tsc --noEmit && npx eslint src && npm run build`.

## How the app works

1. A closer fills **Nouvel élève** (`src/app/(admin)/eleves/nouveau`): parent, child, cycle, program, **one group per subject** (1 to 3), dates. The same parent email reuses one `families` row (siblings).
2. `createStudent()` in `src/lib/onboarding.ts` validates the input (group cycle must match the student, one group per subject, at least one group), creates `enrollments`, and sends **one welcome email per enrollment**.
3. Each welcome email has a **"Je confirme la réception"** button → `/confirmer/[token]` (a two-step page: the parent sees it, then clicks to confirm, so link scanners can't confirm by accident).
4. `processDue()` runs the follow-ups: after **24 h** without confirmation, **one reminder email per child** covering all unconfirmed subjects (+ a short SMS **only if `settings.sms_enabled`**, off by default). After another **24 h**, enrollments move to `a_appeler` (call list) and the VA (Karine) gets an alert email.
5. On confirmation, a thank-you email goes out and follow-ups stop for that subject. Follow-ups skip students whose membership isn't `actif`.

**Demo clock:** `settings.demo_offset_hours` shifts "now" (`demoNow()`). The "Avancer de 24 h" button adds 24 h and runs `processDue()`. Use `demoNow()`, not `new Date()`, for anything time-based. **Keep the offset at 0 in real mode**, or reminders to real parents fire early. Resetting the demo (Paramètres) puts it back to 0.

**Email modes** (`settings.email_mode`, set on Paramètres, banner at the top shows the current one): `simule` (nothing sent), `test` (sent only to `settings.test_recipients`, subject prefixed `[TEST]`, including Karine's alert), `reel` (sent to the real recipients).

### Key files

- `src/lib/onboarding.ts`: all business logic (enroll, send, confirm, follow-ups, reset). `recordMessage()` is the single place every email and SMS goes through: it sends email via `sendEmail()` and stores the result (`status`: `simule`, `envoye`, `envoye_test`, `echec`, plus `provider_id` and `error`). A failed send never breaks enrollment. An SMS provider would plug in here too.
- `src/lib/mailer.ts`: Resend over `fetch` (no SDK), idempotency key per message, test-mode redirect.
- `src/proxy.ts`, `src/lib/session.ts`, `src/lib/auth.ts`, `src/app/login/*`: staff login. Proxy redirects everything to `/login` except `/login`, `/confirmer/*`, `/api/relances` and static assets (the email logos must stay public). Every server action in `actions.ts` also calls `requireAuth()`; do the same in any new action. Fails closed if `ADMIN_PASSWORD` or `AUTH_SECRET` is missing.
- `src/lib/emails.ts`: email templates as typed blocks, rendered to simple table-based HTML **plus a plain-text part**. Bold only for headings and key lines. The logo comes from `/logo-email.png`.
- `src/lib/labels.ts`: French labels, group-code parsing, date formatting (America/Toronto), French grammar helpers (`deSubject`, `coursPhrase`: "d'écriture", not "de écriture").
- `src/app/actions.ts`: server actions. `src/app/(admin)/*`: dashboard pages. `src/app/confirmer/[token]`: public parent page.

## Group codes

`[cycle][CF?]-[L|E|M]-[NN]`, e.g. `3CF-E-01` = 3e cycle, Classes Futées, Écriture, groupe 01. No `CF` means Tutorat. **Each time slot with a given teacher gets its own code** (same course + same teacher + other day/time = new number). `parseGroupCode()` derives program, cycle and subject. Groups are switched off with `active=false`, **never deleted**, because enrollments reference them.

Group data (teachers, days, Zoom links) was loaded from the client's sheet "Fichier de numéros de groupes et liens zoom" (Nov 2026). The sheet has days but **no times**; times come from the client's original email documents. Open questions are recorded in `groups.notes` and shown on the Groupes page.

## Emails

Source: the client's two Word templates (Tutorat, Classes Futées), reproduced in `emails.ts` with group fields filled in. Subject lines come from the templates: "🎉 Bienvenue au tutorat Éducation Futée!" and "🎉 Bienvenue dans les Classes Futées!". The Tutorat email shows the Zoom link, ID and password; the Classes Futées email shows only the time slot (parents find the link on the platform). The reminder, thank-you, VA-alert and SMS texts are drafts written by Claude, pending the client's own wording.

**Sending:** Resend, verified subdomain `onboarding.educationfutee.com` (DNS in GoDaddy). Sender `sandra@onboarding.educationfutee.com` (any address on that subdomain works, no mailbox needed), reply-to `info@educationfutee.com` (must be a real inbox). Sender, reply-to, Karine's address and mode are editable on Paramètres. Resend free plan: 100 emails per day, 1 domain.

**SMS rule:** SMS is off by default (cost). If enabled, it is sent only with the reminder, never with the welcome email, and must fit **one 160-character GSM-7 segment** (plain ASCII, no accents). `reminderSms()` enforces this.

## Conventions

- Next.js 16 App Router with Turbopack. **Read `node_modules/next/dist/docs/` before using unfamiliar APIs** (see AGENTS.md). `params`/`searchParams` are Promises. `cacheComponents` is intentionally **off** (every page is live data); don't add `export const dynamic` to new routes in a way that conflicts.
- Tailwind v4 with a brand palette in `globals.css` (logo orange `#c4600b`/`#e87817`, yellow `#f5c400`). Self-hosted Figtree font.
- Data access only on the server, through `db()` and `must()` from `src/lib/db.ts`.
- Schema changes: apply a migration in Supabase, then update `supabase/schema.sql`.
- When writing to Atique, don't use em dashes.

## Not done yet / next steps

- Client's **codes and scenarios** (naming convention for emails/scenarios) still to come from Atique.
- **Supabase access:** done. The app connects with `SUPABASE_SECRET_KEY` (bypasses RLS). All tables have RLS on with **no policies**, and `anon`/`authenticated` have no grants on `public`, so the publishable key can read and write nothing. Never add a permissive policy for `anon`. `SUPABASE_KEY` stays only as a fallback and no longer works for data access.
- Login is one shared password, no individual accounts or roles.
- SMS provider (SMS is only stored, never sent).
- First real enrollment still to test end to end, and `info@educationfutee.com` must be a monitored inbox.
- Group follow-ups: times for 3-L-05 and 2CF-M-02 (day changed), Zoom password for 3-L-02, and 3-L-05/3-E-03 sharing a Zoom link.
