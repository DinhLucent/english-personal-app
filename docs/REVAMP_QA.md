# SpeakFlow AI Revamp QA

Last verified: 2026-06-26

## Verification Run - 2026-06-26

Result: PASS.

Commands run against the current worktree:

```bash
npm run check:env
npm run check:speaking-curriculum
npm run lint
npm audit --omit=dev
npm run build
npm run check:supabase:schema
LOCAL_APP_URL=http://localhost:3002 npm run smoke:local
LOCAL_APP_URL=http://localhost:3002 npm run smoke:ai
INTERACTION_QA_BASE_URL=http://localhost:3002 npm run interaction:qa
ACCESSIBILITY_SMOKE_BASE_URL=http://localhost:3002 npm run accessibility:smoke
VISUAL_QA_BASE_URL=http://localhost:3002 npm run visual:qa
```

Current evidence:

- Static/build gates passed: env, curriculum, lint, audit, production build.
- Supabase schema check passed for all core and speaking-coach tables.
- Local smoke passed for app routes, review API guards, speaking mission guard, health, history, and cron authorization guard.
- Real AI smoke passed for daily lesson, conversation, vocabulary, grammar, reflex, assessment, speaking roleplay, speaking feedback, and speaking retry feedback.
- Interaction QA passed 5 journeys.
- Accessibility smoke passed 24 page/profile checks.
- Visual QA passed 56 page/profile checks.
- Browser QA reports show `failures=0` for interaction, accessibility, and visual reports.

## Scope Verified

- Workplace Speaking Coach positioning is reflected in README and operations docs.
- Dashboard, Speaking Studio, Review, Progress, and 30-day mission path build successfully.
- 30-day mission curriculum has continuous days 1-30, required milestones, complete chunks, vocabulary, questions, and rubric keys.
- Supabase live project has the speaking schema tables and 30 workplace mission rows.
- Speaking Studio AI feedback and retry feedback validate through Zod and persist mission attempts, speaking attempts, and review items.

## Commands Run

```bash
npm run check:env
npm run check:env:network
npm run check:speaking-curriculum
npm run check:supabase:schema
npm run lint
npm run build
npm run smoke:local
npm run smoke:ai
npm audit --omit=dev
```

## Live Supabase Checks

- Project: `yqwlocqdapyycwebqojv`
- Applied migrations:
  - `add_speaking_mission_schema`
  - `seed_workplace_speaking_missions_30_compact`
  - `add_speaking_attempts_mission_id_index`
- Workplace mission rows: 30, from day 1 to day 30.
- Smoke AI persistence evidence after speaking smoke:
  - `mission_attempts`: 1
  - `speaking_attempts`: 2
  - `review_items`: 9

## Supabase Advisor Notes

- Security advisor still reports Supabase Auth leaked password protection disabled. This is a dashboard setting, not an app code change.
  Remediation: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- Performance advisor reports only unused-index info for new or low-traffic indexes after adding the missing `speaking_attempts_mission_id_idx`.
  Remediation reference: https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index

## Manual Smoke Path

1. Open `/dashboard` and confirm Today's Mission plus 30-day path appear.
2. Open `/speaking` and complete roleplay, feedback, retry, and review.
3. Open `/review` and confirm generated review items appear.
4. Open `/progress` and confirm rubric-based progress/adaptive recommendation appears after scored speaking attempts.
5. Confirm old tools still load: correction, conversation, vocabulary, grammar, reflex, assessment.
