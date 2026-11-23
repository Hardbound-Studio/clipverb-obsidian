# clipverb-obsidian

The Obsidian community plugin for Clipverb. It sends a video link from Obsidian to the Clipverb
desktop app on the same computer, over the app's local connection. The app fetches the captions
and files the note. The plugin fetches nothing, holds no key, and talks only to 127.0.0.1.

## Rules

1. Only `127.0.0.1` on ports 47800 to 47809: `GET /hello` to find the app, then `POST /link`
   with `Authorization: Bearer <pairing code>`, body `{url, mode}` (mode `captions` or `distill`).
   Refusal reasons the app sends: `not_bought`, `bad_link`, `no_model`, `consent`, `starting`.
2. Use Obsidian's `requestUrl`, never `fetch` (the app sends no CORS header, on purpose).
3. Obsidian's directory rules: no telemetry, no remote code, no self-update, no `fundingUrl`,
   the id `clipverb` (never containing "obsidian"), a README that discloses the paid app and the
   local-only network use.
4. Strings in English first; Arabic, Spanish and French come only from the studio's translation
   chain, never hand-written.

## State

Plugin 0.1.0 on main (PR 1): `src/client.ts` (the app conversation, tested under plain Node), `src/main.ts` (commands, ribbon, modal, settings tab), `src/i18n/`. Tests: `npm test`. Needs Clipverb 0.5.3 or later,
which adds `POST /link`.

## Read ladder

1. This card. 2. `src/` once it exists. 3. Obsidian's developer docs for any API or policy question.

## Secrets

None. The plugin holds no key; the pairing code a user pastes lives in the plugin's `data.json` in
their own vault, which `.gitignore` keeps out of the repo.
