# Agent guide

`AGENTS.md` is a symlink to this file.

## What this app is

A hosted Crowdin app: a Cloudflare Worker built with `createCloudflareWorker` from `@crowdin/app-project-module/cloudflare` and run by Crowdin. There is no server to operate and no Cloudflare account to configure.

What the app does in Crowdin comes from SDK modules. Before adding or changing a module, read its page in the SDK documentation: <https://crowdin.github.io/app-project-module/modules/> lists the modules, and <https://crowdin.github.io/app-project-module/llms.txt> links the whole documentation as text.

## Commands

Node `^22.19 || ^24`, pnpm (`pnpm install` first).

```bash
pnpm dev          # runs the app locally with wrangler (see "Local run")
pnpm build        # bundles src/ into dist/
pnpm run publish  # builds, deploys and installs the app
pnpm logs         # shows what the deployed app logged
pnpm typecheck    # tsc --noEmit
pnpm exec crowdin-serverless-apps manifest validate  # checks `scopes` against the Crowdin API calls in src/
```

Run `publish` with the explicit `run`: plain `pnpm publish` triggers pnpm's built-in registry publish and never runs the script.

`build`, `publish` and `logs` are commands of `crowdin-serverless-apps`; each lists its options with `--help`. When one of them stops, it says why and what to do next: follow that message.

## Changing the app

A change is finished when the last step holds, not when the code compiles.

1. Edit `src/index.ts`. Done when `pnpm typecheck` passes.
2. Make `scopes` cover the Crowdin API calls of the code. Done when `manifest validate` reports no finding.
3. Run `pnpm run publish`. Done when it ends without an error and prints the app's address.
4. Open `/manifest.json` at that address. Done when it lists the modules and the scopes of this change.
5. Tell the person what to try in Crowdin, and pass on anything `publish` asked of them. Then run `pnpm logs`. Done when the requests of that try are in the logs without an error. A request can take a while to reach the logs, so look again before you conclude that it is missing.

Crowdin installs an app only when it has a module, so add at least one before the first publish.

## Scopes and the OAuth app

`scopes` in `src/index.ts` is a plain list of `Scope` values written in place, because the build reads it from this file.

The app has an OAuth app in Crowdin, created on the first publish with these scopes. Crowdin gives it only scopes that the publishing token has; when Crowdin refuses, `publish` prints the reason and the ways on. A scope that is added later is first added to the OAuth app in Crowdin, by the person.

**Tokens and secrets are the person's.** When a way on needs a token or a client secret, that run is the person's, in their own terminal. An agent never asks for a token or a secret in chat and never types one into a command or a file.

## Local run

`pnpm dev` reads `CROWDIN_CLIENT_ID` and `CROWDIN_CLIENT_SECRET` from `.dev.vars`, which is not committed, and answers with an error when they are missing. The placeholder value `local` for both is enough to read `/manifest.json` and see what the app declares. An agent writes only such placeholders there.

## Architecture

- `src/index.ts` is the whole app. `createCloudflareWorker` takes a function from the environment to the app configuration (`name`, `identifier`, `clientId`, `clientSecret`, `scopes` and the modules) and, as its second argument, options. Routes of your own go in the `setup` option, which receives the Express `app` and `crowdinApp`.
- `wrangler.jsonc` configures the build and the local run only. Hosted, Crowdin supplies what the file declares for local work (the database, the file storage, the assets, the variables) and the hostname, so the file has no `account_id`, `routes` or `triggers`.
- The app identifier reaches the code as the `APP_IDENTIFIER` variable, so keep `identifier: env.APP_IDENTIFIER`.
- Scheduled work goes through the SDK: call `crowdinApp.cron.schedule(expression, task)` in `setup`. Crowdin drives the schedule; the SDK documentation on background jobs has its limits on Workers.
- `public/` is the static assets directory. Keep its name and `assets.directory` in `wrangler.jsonc` as they are: the build expects them. `public/assets` holds the SDK's UI files; it is generated and not committed. The app logo is `public/logo.png`; without that file the SDK draws a letter logo from the app name.
- `.env` ties this folder to the deployed app. The CLI writes it and it is not committed, so keep it.
- Keep `package.json` dependencies to what the Worker imports. `wrangler` is a dev dependency of the project, so the build uses the version pinned here.

There are no tests.
