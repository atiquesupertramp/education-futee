# Éducation Futée · onboarding app

@AGENTS.md

Onboarding and membership dashboard for **Éducation Futée**, a French-language (Québec) tutoring business: Lecture, Écriture, Mathématiques, at 2e and 3e cycle, in two programs, **Tutorat** (small groups) and **Classes Futées**. Built for Atique (agency owner, Euqitech). All parent-facing and UI text is **French (Québec)**; code and comments are English.

**Status: demo / test phase.** Nothing is really sent. Every email and SMS is rendered and stored in `messages` so it can be previewed in the app (Boîte d'envoi). Not live with real parents yet.

## Where things live

- **Live site:** https://education-futee.vercel.app (Vercel team `euqitech`, project `education-futee`, id `prj_pVIcxfgrpvvUgKtTyjHYEyUBVNey`). Every push to `main` deploys to production.
- **Database:** Supabase project **Éducation Futée**, ref `uaulnbilcewbjrhjvqik`, region ca-central-1, org Euqitech. Schema reference: `supabase/schema.sql`.
- **Daily reminders:** Vercel cron → `GET /api/relances` (see `vercel.json`), protected by `CRON_SECRET`.

## Environment

| Var | Notes |
|---|---|
| `SUPABASE_URL` | `https://uaulnbilcewbjrhjvqik.supabase.co` |
| `SUPABASE_KEY` | Supabase publishable key, used **server-side only** (`src/lib/db.ts`, `server-only`). Never expose to the browser. |
| `APP_URL` | Optional. Public base URL for confirmation links and the email logo. Falls back to Vercel's production URL. |
| `CRON_SECRET` | Set in Vercel only. |

Local setup: `npm install`, then `vercel env pull .env.local` (or copy the values from the Supabase dashboard), then `npm run dev`. Check before pushing: `npx tsc --noEmit && npx eslint src && npm run build`.

## How the app works

1. A closer fills **Nouvel élève** (`src/app/(admin)/eleves/nouveau`): parent, child, cycle, program, **one group per subject** (1 to 3), dates. The same parent email reuses one `families` row (siblings).
2. `createStudent()` in `src/lib/onboarding.ts` validates the input (group cycle must match the student, one group per subject, at least one group), creates `enrollments`, and sends **one welcome email per enrollment**.
3. Each welcome email has a **"Je confirme la réception"** button → `/confirmer/[token]` (a two-step page: the parent sees it, then clicks to confirm, so link scanners can't confirm by accident).
4. `processDue()` runs the follow-ups: after **24 h** without confirmation, **one reminder email per child** covering all unconfirmed subjects (+ a short SMS **only if `settings.sms_enabled`**, off by default). After another **24 h**, enrollments move to `a_appeler` (call list) and the VA (Karine) gets an alert email.
5. On confirmation, a thank-you email goes out and follow-ups stop for that subject. Follow-ups skip students whose membership isn't `actif`.

**Demo clock:** `settings.demo_offset_hours` shifts "now" (`demoNow()`). The "Avancer de 24 h" button adds 24 h and runs `processDue()`. Use `demoNow()`, not `new Date()`, for anything time-based.

### Key files

- `src/lib/onboarding.ts`: all business logic (enroll, send, confirm, follow-ups, reset). `recordMessage()` is the single place where a real email or SMS provider gets plugged in.
- `src/lib/emails.ts`: email templates as typed blocks, rendered to simple table-based HTML **plus a plain-text part**. Bold only for headings and key lines. The logo comes from `/logo-email.png`.
- `src/lib/labels.ts`: French labels, group-code parsing, date formatting (America/Toronto), French grammar helpers (`deSubject`, `coursPhrase`: "d'écriture", not "de écriture").
- `src/app/actions.ts`: server actions. `src/app/(admin)/*`: dashboard pages. `src/app/confirmer/[token]`: public parent page.

## Group codes

`[cycle][CF?]-[L|E|M]-[NN]`, e.g. `3CF-E-01` = 3e cycle, Classes Futées, Écriture, groupe 01. No `CF` means Tutorat. **Each time slot with a given teacher gets its own code** (same course + same teacher + other day/time = new number). `parseGroupCode()` derives program, cycle and subject. Groups are switched off with `active=false`, **never deleted**, because enrollments reference them.

Group data (teachers, days, Zoom links) was loaded from the client's sheet "Fichier de numéros de groupes et liens zoom" (Nov 2026). The sheet has days but **no times**; times come from the client's original email documents. Open questions are recorded in `groups.notes` and shown on the Groupes page.

## Emails

Source: the client's two Word templates (Tutorat, Classes Futées), reproduced in `emails.ts` with group fields filled in. Subject lines come from the templates: "🎉 Bienvenue au tutorat Éducation Futée!" and "🎉 Bienvenue dans les Classes Futées!". The Tutorat email shows the Zoom link, ID and password; the Classes Futées email shows only the time slot (parents find the link on the platform). The reminder, thank-you, VA-alert and SMS texts are drafts written by Claude, pending the client's own wording.

**SMS rule:** SMS is off by default (cost). If enabled, it is sent only with the reminder, never with the welcome email, and must fit **one 160-character GSM-7 segment** (plain ASCII, no accents). `reminderSms()` enforces this.

## Conventions

- Next.js 16 App Router with Turbopack. **Read `node_modules/next/dist/docs/` before using unfamiliar APIs** (see AGENTS.md). `params`/`searchParams` are Promises. `cacheComponents` is intentionally **off** (every page is live data); don't add `export const dynamic` to new routes in a way that conflicts.
- Tailwind v4 with a brand palette in `globals.css` (logo orange `#c4600b`/`#e87817`, yellow `#f5c400`). Self-hosted Figtree font.
- Data access only on the server, through `db()` and `must()` from `src/lib/db.ts`.
- Schema changes: apply a migration in Supabase, then update `supabase/schema.sql`.
- When writing to Atique, don't use em dashes.

## Not done yet / next steps

- Client's **codes and scenarios** (naming convention for emails/scenarios) still to come from Atique.
- Real sending (email provider + verified sender domain; SMS provider) once out of demo.
- **No login:** anyone with the URL can open the dashboard. Add auth and tighten RLS (service key + restrictive policies) before real parent data.
- Group follow-ups: times for 3-L-05 and 2CF-M-02 (day changed), Zoom password for 3-L-02, and 3-L-05/3-E-03 sharing a Zoom link.
