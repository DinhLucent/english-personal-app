# SpeakFlow AI

Personal AI English coach built with Next.js, Supabase, and DeepSeek.

## Current scope

- Dashboard
- Daily lesson generator
- Correction agent
- Conversation agent
- Vocabulary agent
- Grammar agent
- Reflex training
- Assessment agent
- Progress page
- Supabase Auth helpers and RLS migration
- DeepSeek server-only API gateway with Zod validation

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Fill `.env.local` before testing real auth or AI:

```txt
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SECRET_KEY=
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
CRON_SECRET=
DAILY_LESSON_TIME_ZONE=Asia/Saigon
DAILY_LESSON_MAX_USERS=25
```

## Supabase setup

1. Create a Supabase project.
2. Run `supabase/migrations/202606220001_initial_schema.sql` in the SQL editor or Supabase CLI.
3. Copy the project URL and anon key into `.env.local`.
4. In Supabase Auth settings, add `http://localhost:3000/auth/callback`.
5. After Vercel deploy, add `https://YOUR_DOMAIN/auth/callback`.

## Development commands

```bash
npm run dev
npm run lint
npm run build
npm run check:env
npm run check:env:network
npm run check:supabase:schema
npm run verify:local
npm run smoke:ai
```

`check:env` verifies required local variables. `check:env:network` also calls Supabase and DeepSeek endpoints, so run it only after keys are filled.
`check:supabase:schema` verifies the migration tables are visible through Supabase REST.

## Vercel deployment

The project includes `vercel.json` with the Next.js framework and build command. Add these environment variables in Vercel Project Settings:

```txt
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SECRET_KEY
DEEPSEEK_API_KEY
DEEPSEEK_BASE_URL
DEEPSEEK_MODEL
CRON_SECRET
DAILY_LESSON_TIME_ZONE
DAILY_LESSON_MAX_USERS
```

After deployment, add the production callback URL in Supabase Auth:

```txt
https://YOUR_VERCEL_DOMAIN/auth/callback
```

`vercel.json` schedules `/api/cron/daily-lessons` at `0 22 * * *`, which is 05:00 in `Asia/Saigon`. The endpoint requires `Authorization: Bearer CRON_SECRET`.

## Architecture docs

- `docs/MASTER_PLAN.md`
- `docs/CODEX_BUILD_TASKS.md`
- `docs/architecture/ADR-001-core-architecture.md`
