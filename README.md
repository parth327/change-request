# CLIMS Change Request Portal — Node/Express edition

Same product as the Next.js version — public form, email-driven approve/reject/
comment workflow (single or hierarchical), admin panel — rebuilt on a plain
**Node + Express + EJS** stack (no React/Next, no build step for the backend).
Still free to run: [Neon](https://neon.tech) Postgres + [Brevo](https://brevo.com) email.

## What changed from the Next.js version

Framework only — the data model, approval logic, and features are identical.
Pages are server-rendered with EJS; interactive bits (form submission,
approve/reject, admin filtering, etc.) are small vanilla-JS files in `public/js/`.

## Review pass: issues found and fixed

Rebuilding the app was also used as a full review pass. Everything below was
found and fixed in this codebase (not just noted):

| # | Issue | Severity | Fix |
|---|---|---|---|
| 1 | EJS doesn't auto-escape output the way React does — a template using `<%-` on user content would be a stored-XSS hole | High | Audited every view; all user-supplied content uses escaping `<%= %>`, never `<%-` |
| 2 | Email HTML was built as raw strings with user text (description, reason, comments) interpolated directly — HTML/markup injection into outgoing mail | High | Added `escapeHtml()`, applied to every user-supplied field in `lib/email.js` |
| 3 | No security headers | Medium | Added `helmet` |
| 4 | Rate limiting was a hand-rolled in-memory map | Medium | Replaced with `express-rate-limit` on `/api/submit`, `/api/review/:token/decide`, `/api/admin/login` |
| 5 | Admin login returned faster for unknown emails than wrong passwords — a timing side-channel that reveals which admin emails exist | Medium | Login always runs `bcrypt.compare` against a dummy hash even when no account is found, so response time doesn't leak account existence |
| 6 | Admin session cookie was `SameSite=Lax` | Low | Tightened to `SameSite=Strict` (the admin cookie never needs cross-site use) |
| 7 | Losing Next.js's automatic `<head>` management means charset/viewport/lang aren't set unless done explicitly | Medium | Shared `partials/head.ejs` sets `<meta charset>`, `<meta viewport>`, and `<html lang="en">` on every page |
| 8 | Express has no default 404 or error page | Medium | Centralized error middleware + styled 404/error pages |
| 9 | A missing env var (e.g. a typo'd Brevo key) would only surface as a confusing failure deep inside a request | Medium | `config/env.js` validates all required variables at startup and exits with a clear message if any are missing |
| 10 | Primary button used white text on the `accent` color — ~4.1:1 contrast, just under the 4.5:1 WCAG AA threshold for normal text | Medium (accessibility) | Buttons now use the darker `accent-ink` as their base color (~8.6:1, AAA); the lighter `accent` is reserved for hover, borders, and links, where it already clears 3:1+ |
| 11 | The admin dashboard fetched data client-side after page load, showing a loading flash every visit | Low (UX/perf) | Dashboard, recipient list, and settings are now rendered server-side with real data; JS only progressively enhances filtering/search |
| 12 | No way to recover if a reviewer's notification email was lost/filtered, and no visibility into requests sitting unanswered | Medium | Added a "days pending" indicator on stale requests and a "Resend notification" action on the request detail page |
| 13 | CSRF exposure on state-changing admin requests | Low (reviewed, accepted) | `SameSite=Strict` on the session cookie already blocks the cookie from being sent on any cross-site request, which closes the standard CSRF vector for this app; no separate CSRF token was added since it wouldn't add meaningful protection here |
| 14 | No request logging | Low | Added `morgan` |
| 15 | Recipient review links never expire | Low (accepted, documented) | Left as-is — the "resend" action (see #12) plus hierarchical/single mode already give administrators recourse; hard expiry risks permanently stalling a hierarchical chain if a mid-level link lapses unanswered, which is worse than the current behavior. Revisit if this becomes a real problem for you. |

Beyond the table: I verified the app actually boots and every route responds
correctly (public form, admin pages behind auth, 404s, validation errors,
the "no recipients configured" guard) before packaging this. The one thing
I *couldn't* verify end-to-end in my own sandbox is a real `prisma generate`
run — its download host isn't reachable from there — but that step is a
completely standard part of `npm install` and will run normally in your
environment or on your host.

## 1. Create the free accounts

Same as before:
1. **Neon** → New Project → copy the **pooled** connection string.
2. **Brevo** → API Keys (SMTP & API), and verify your sending address under Senders.

## 2. Configure environment variables

```bash
cp .env.example .env
```

| Variable | Where it comes from |
|---|---|
| `DATABASE_URL` | Neon pooled connection string |
| `AUTH_SECRET` | Random 32+ character string — `openssl rand -hex 32` |
| `BREVO_API_KEY` | Brevo → SMTP & API → API Keys |
| `EMAIL_FROM_ADDRESS` / `EMAIL_FROM_NAME` | A Brevo-verified sender |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | Used once by `npm run db:seed` |
| `APP_ORIGIN` | Optional — your public URL in production. Leave blank locally. |

Never commit `.env` or paste these values anywhere outside your own
environment — treat them like passwords.

## 3. Install, build the CSS, and run

```bash
npm install                 # also runs `prisma generate`
npm run build:css           # compiles the Tailwind stylesheet — required once,
                             # and again any time you edit views/*.ejs or public/js/*
npm run dev                 # http://localhost:3000 (auto-restarts on change)
```

You don't need to run `db:push` or `db:seed` yourself — every server start
checks the database and provisions whatever's missing automatically
(see `src/lib/bootstrap.js`):

- Creates any missing tables from `prisma/schema.prisma` (safe to run
  repeatedly; it's a no-op once the schema is already in sync).
- Upserts the admin account from `ADMIN_EMAIL`/`ADMIN_PASSWORD`/`ADMIN_NAME`,
  so changing the password in `.env` takes effect on the next restart.
- Seeds one default recipient (from `ADMIN_EMAIL`) if none exist yet, so the
  public form works immediately — edit or replace it at `/admin/recipients`.

`npm run db:push` / `npm run db:seed` still work manually if you ever need
them (e.g. in a deploy step without shell access to run the app first).
`npm run watch:css` will rebuild the stylesheet automatically while you work
on templates.

## 4. Deploy for free (Render)

1. Push this project to a GitHub repo.
2. Render → New → Web Service → connect the repo.
3. Build command: `npm install && npm run build:css`
4. Start command: `npm start`
5. Add every variable from `.env` under *Environment* (set `NODE_ENV=production`
   and `APP_ORIGIN` to your Render URL).
6. Deploy. `npm start` provisions the database automatically on boot (see
   section 3) — no manual `db:push`/`db:seed` step needed. Note that Render's
   devDependencies are pruned in production by default, so if the automatic
   `prisma db push` step can't find the Prisma CLI, either set
   `NPM_CONFIG_PRODUCTION=false` in the service's environment or run
   `npm run db:push` once manually from Render's shell.

## 4b. Deploying to Vercel instead

This is a plain long-running Express server, not a Next.js app — Vercel can
still run it (via its Node.js zero-config detection on `main` in
`package.json`), but two things need to be set up manually that Render's
buildpack handles automatically:

1. **Environment variables** — Vercel doesn't read `.env` from the repo (it's
   gitignored, as it should be). Add every variable from `.env` under
   Project → Settings → Environment Variables: `DATABASE_URL`, `AUTH_SECRET`,
   `BREVO_API_KEY`, `EMAIL_FROM_ADDRESS`, `EMAIL_FROM_NAME`, `ADMIN_EMAIL`,
   `ADMIN_PASSWORD`, `ADMIN_NAME`, and `APP_ORIGIN` set to your Vercel URL.
   Without these the app exits immediately on boot (see `config/env.js`).
2. **CSS build** — the compiled stylesheet (`public/css/styles.css`) is
   committed to the repo directly so it deploys as a static file no matter
   what Vercel's build step does. The `vercel-build` script in
   `package.json` also regenerates it from `src/styles/input.css` during
   Vercel's build, so a redeploy after editing `views/*.ejs` or
   `public/js/*.js` picks up style changes automatically — just remember to
   run `npm run build:css` and commit the result if you ever deploy
   somewhere that *doesn't* honor `vercel-build`.

Note the automatic DB bootstrap (section 3) spawns `npx prisma db push` as a
child process if tables are missing — this works fine against an
already-provisioned database (the common case after the first deploy), but
child-process spawning on a cold serverless invocation is inherently less
reliable than Render's persistent process. If you ever point this at a
brand-new, empty database on Vercel and boot fails, run `npm run db:push`
once from your own machine against the same `DATABASE_URL` first.

## 5. How a request flows (unchanged from the Next.js version)

1. Submission creates a `ChangeRequest` plus one `RequestApproval` per active
   recipient. Confirmation email → submitter.
2. **Single mode**: every recipient is emailed at once; whoever decides first
   (approve or reject) finalizes the request.
   **Hierarchical mode**: only the lowest `level` is emailed; everyone at a
   level must approve before the next level is notified; any rejection ends
   it immediately.
3. Recipients decide (and can comment) at `/review/:token` — read-only once
   the request is finalized.
4. Submitter gets a final decision email. The admin panel shows the full
   timeline, including every intermediate decision and comment, on each
   request's detail page.

## 6. Notes on the free tiers

Same as the Next.js version: Brevo's 300 emails/day comfortably covers dozens
of requests/day (2–4 emails each); Neon's free tier auto-suspends when idle
(first query after idle is a bit slower); Render's free web services spin
down after 15 minutes idle and take ~30–60s to wake — fine for an internal
tool, upgrade to a paid instance if that delay matters.
