# SpeakFlow AI - Browser-First Voice Coach Phase

## Current Behavior

SpeakFlow AI now treats voice practice as a daily speaking habit loop:

```txt
Listen -> shadow -> speak -> edit transcript -> feedback -> retry -> review
```

The app uses browser SpeechRecognition and browser text-to-speech. It does not store audio files. DeepSeek remains the server-side text AI provider.

## Delivery Signals

Voice attempts can include lightweight delivery metadata:

- `inputMode`: `typed` or `voice`
- `recordingMs`
- `wordCount`
- `wordsPerMinute`
- `transcriptEdited`
- `attemptLengthSignal`: `too_short`, `focused`, or `long`

These signals are not pronunciation scoring. They help the coach comment on answer length, pacing, transcript editing, and the next voice practice action.

## Persistence

`speaking_attempts.delivery_json` stores nullable delivery metadata for roleplay feedback and retry attempts. The app falls back gracefully if a live database has not applied the migration yet, but the migration should be applied before relying on voice progress analytics.

## QA Coverage

The browser QA suite includes:

- Voice transcript/edit/retry path in interaction QA with mocked SpeechRecognition.
- Voice-rich Speaking Studio visual fixture.
- Unsupported SpeechRecognition visual fixture.
- Progress voice consistency rendering through the rich progress fixture.

Run the full gate before release:

```bash
npm run check:env
npm run check:speaking-curriculum
npm run check:supabase:schema
npm run lint
npm run build
npm run smoke:local
npm run smoke:ai
npm run interaction:qa
npm run accessibility:smoke
npm run visual:qa
```

## Future Upgrade Path

Cloud STT, pronunciation scoring, realtime voice, and audio storage are intentionally out of this phase. Add them only after the browser-first loop proves useful for daily practice.
