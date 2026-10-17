# vidik-augment-cron

Scheduled Cloudflare Worker. Cron triggers are declared in `wrangler.jsonc`.

## Continuous deployment

[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) deploys this Worker on every push to `main` and when the workflow is started by hand (`workflow_dispatch`). Manual runs also publish `main` only. Runs share the `vidik-augment-cron-deploy` concurrency group, so a second deploy waits until the one already running finishes.

The job uses Node.js 22 and pnpm 9.15.9. `package.json` has no `engines` or `packageManager` field; the lockfile is version 9.0, which pnpm 9 installs with `--frozen-lockfile`. It runs `pnpm test`, then `pnpm run deploy` (`wrangler deploy`). The deploy does not override cron triggers, so the live schedules stay exactly as listed in `wrangler.jsonc` on `main`:

- `*/10 * * * *`
- `0 15 2 * *`

`pnpm test` is the existing Vitest script. There are no test files yet, so CI passes `--passWithNoTests`. A failing test still blocks the deploy.

### Secrets

Add these repository Actions secrets (Settings → Secrets and variables → Actions) before the first run:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

The API token needs **Workers Scripts: Edit** on that Cloudflare account.
