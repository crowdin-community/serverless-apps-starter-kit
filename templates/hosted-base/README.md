# Hosted Crowdin app

A Crowdin app that Crowdin hosts for you. The app is a [Cloudflare Worker](https://developers.cloudflare.com/workers/) built with `createCloudflareWorker` from [`@crowdin/app-project-module`](https://www.npmjs.com/package/@crowdin/app-project-module), so there is no server to run and no Cloudflare account to set up.

Scaffolded from the `hosted-base` template of the [serverless apps starter kit](https://github.com/crowdin-community/serverless-apps-starter-kit). It declares no modules yet: add the ones your app needs in `src/index.ts`.

## Requirements

- Node.js `^22.19 || ^24`
- [pnpm](https://pnpm.io)
- A Crowdin or Crowdin Enterprise account

## Getting started

```bash
pnpm install
pnpm dev        # runs the app locally with wrangler
```

`pnpm dev` reads the app's OAuth client from a `.dev.vars` file, which is not committed. Without it the app answers with an error. Create the file before the first run:

```txt
CROWDIN_CLIENT_ID=local
CROWDIN_CLIENT_SECRET=local
```

These placeholder values are enough to look at the app: while `pnpm dev` runs, open the address it prints followed by `/manifest.json` to see what the app declares to Crowdin.

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Run the app locally with `wrangler dev` |
| `pnpm build` | Bundle `src/` into `dist/` |
| `pnpm run publish` | Build and deploy the app, and install it in Crowdin |
| `pnpm logs` | Show what the deployed app logged |
| `pnpm typecheck` | Type-check with `tsc --noEmit` |

Note the explicit `run` in `pnpm run publish`: plain `pnpm publish` invokes pnpm's built-in registry publish and never reaches the script.

`build`, `publish` and `logs` are commands of [`@crowdin/serverless-apps-cli`](https://www.npmjs.com/package/@crowdin/serverless-apps-cli), a dev dependency of the app; its documentation describes them in full. Options go after the command, and `--help` lists them, as in `pnpm logs --help`.

The first publish also creates the app's OAuth app in Crowdin, with the scopes that `scopes` in `src/index.ts` lists. Crowdin gives an OAuth app only scopes that your token has. When Crowdin refuses, `publish` prints the reason and the ways on: follow them.

If a way on needs a token or a client secret, set it in your own terminal and run the publish yourself. Never paste one into a chat with an AI agent.

## Adding modules

Modules are properties of the configuration returned in `src/index.ts`, for example `projectTools`, `organizationMenu` or `customMT`. The [Crowdin Apps documentation](https://crowdin.github.io/app-project-module/) describes every module and its options. Routes of your own go in the `setup` option of `createCloudflareWorker`.

## Project layout

```
src/
  index.ts           # the app: configuration and modules
public/              # static files; add logo.png for the app logo
  assets/            # SDK UI files, generated (not committed)
wrangler.jsonc       # build and local-dev configuration
.env                 # ties this folder to the deployed app; written by the CLI (not committed)
```
