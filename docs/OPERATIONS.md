# SpeakFlow AI - Operations Checklist

## Local verification

```bash
npm install
npm run check:env
npm run check:env:network
npm run check:supabase:schema
npm run lint
npm run build
npm run verify:local
npm run dev
```

## Supabase checklist

1. Create a Supabase project.
2. Run `supabase/migrations/202606220001_initial_schema.sql`.
3. Enable email magic link auth.
4. Add redirect URLs:
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3001/auth/callback`
   - Vercel production callback URL after deployment.
5. Add env vars to `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SECRET_KEY`

## Supabase Auth email limits

The default Supabase email sender is only for testing and can return `email rate limit exceeded` during repeated magic-link attempts. For production:

1. Configure a custom SMTP provider in Supabase Dashboard > Authentication > SMTP.
2. Adjust email/OTP limits in Supabase Dashboard > Authentication > Rate Limits.
3. Keep the login cooldown in the app enabled so accidental repeat clicks do not burn the OTP quota.

## DeepSeek checklist

1. Add `DEEPSEEK_API_KEY` to `.env.local`.
2. Keep `DEEPSEEK_MODEL=deepseek-v4-flash` unless a stronger model is needed.
3. Run `npm run check:env:network`.

## Vercel checklist

1. Import or deploy this project to Vercel.
2. Add the same environment variables in Vercel Project Settings.
3. Set Supabase auth callback URL for the Vercel domain.
4. Run Vercel production build.
5. Run a production smoke test:
   - Login.
   - Generate daily lesson.
   - Complete lesson.
   - Run correction.
   - Run conversation summary.
   - Confirm progress updates.
6. Confirm Vercel Cron `/api/cron/daily-lessons` is listed and protected by `CRON_SECRET`.

## Completion criteria

The app is complete only when:

- Local lint/build pass.
- Supabase migration has run.
- `npm run check:env:network` passes.
- DeepSeek agents return real structured output.
- Supabase stores lesson, correction, vocabulary, assessment, conversation, and progress data.
- Vercel deployment works with production env vars.
