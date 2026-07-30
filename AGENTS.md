# Repository Agent Guide

## Product

This repository contains the «Мастер рядом» marketplace MVP. The working brand candidate is «МастераТут», but changing the product name is a separate product decision. The primary roles are:

- client — creates a household job, compares up to three offers, selects a master, accepts the result and leaves a verified review;
- master — configures categories and service areas, sends an offer and advances the assigned order;
- administrator — verifies masters and operates users, orders, categories, complaints and disputes.

The core product contract is a transparent order lifecycle. Exact client address data must remain hidden until a master is selected and confirms the assignment. Reviews must remain tied to completed orders.

## Current architecture

- Next.js App Router, React, TypeScript strict mode and Server Actions.
- The active runtime repository is `better-sqlite3` in `src/lib/db.ts` and related repositories.
- Prisma and PostgreSQL scaffolding exists, but the production cutover is not complete. Do not describe PostgreSQL as the active canonical runtime until every active entity and test has migrated.
- Uploaded media is currently stored by the MVP data layer. Treat identity documents and customer media as sensitive.

Never introduce permanent SQLite/PostgreSQL dual-write. The cutover must use one canonical schema, a rehearsed migration and an explicit rollback procedure.

## Product truthfulness

Do not present a visual prototype as a working service:

- `/maps/master-en-route.png` is a demo asset, not live geolocation;
- chat buttons are not a chat until messages persist and access is enforced server-side;
- the passport warranty counter is not a warranty contract until warranty records and claims exist;
- payments are external until a PSP-backed reserve, ledger, refund and dispute hold are implemented.

UI copy, README and release notes must clearly distinguish implemented behavior from planned behavior.

## Development workflow

Install dependencies and run the local MVP:

```bash
npm install
npm run seed
npm run dev
```

Required checks before every push:

```bash
npm run lint
npm run typecheck
npm test
npm run build
git diff --check
```

For order changes, preserve server-side ownership checks, role isolation, allowed lifecycle transitions and address privacy. Add domain tests for happy paths, unauthorized actors, stale requests and invalid status transitions.

## Git conventions

- Branches: `codex/<type>-<topic>`, for example `codex/feat-order-transparency`.
- Commits follow Conventional Commits: `feat(scope): ...`, `fix(scope): ...`, `docs(scope): ...`, `test(scope): ...`, `chore(scope): ...`.
- Keep commits focused and stage explicit paths when the worktree contains unrelated changes.
- Never force-push `main` or rewrite shared history.
- Do not commit `.env`, runtime databases, build output, local screenshots outside documented QA folders or scratch reports.

## Current P0 order

1. Change order with explicit client approval of the new total.
2. Mandatory before/after evidence and optional process evidence.
3. Order-scoped mini-chat with system events.
4. Master-backed warranty records in the home passport.
5. Privacy-safe product funnel analytics.
6. PSP payments, real live location and final PostgreSQL cutover after their legal and technical gates.

The decision-complete contracts are maintained in `docs/product/07-p0-specifications.md`.
