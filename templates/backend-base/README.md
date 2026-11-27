# Crowdin backend app

A Crowdin backend app: an app with server-side code that Crowdin runs for you. The app is a [Cloudflare Worker](https://developers.cloudflare.com/workers/) built with `createCloudflareWorker` from [`@crowdin/app-project-module`](https://www.npmjs.com/package/@crowdin/app-project-module), so there is no server to run and no Cloudflare account to set up.

Scaffolded from the `backend-base` template of the [serverless apps starter kit](https://github.com/crowdin-community/serverless-apps-starter-kit). `create` deployed it and installed it in Crowdin with one sample module, a page in the **Tools** of a project with a settings form: run `pnpm exec crowdin-serverless-apps preview` to open it. Replace the sample with the modules your app needs in `src/index.ts`.

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
| `pnpm build` | Build the app and pack it into its app file, `dist/<name>.crowdinapp` |
| `pnpm run publish` | Build and deploy a new version of the app |
| `pnpm logs` | Show what the deployed app logged |
| `pnpm typecheck` | Type-check with `tsc --noEmit` |

Note the explicit `run` in `pnpm run publish`: plain `pnpm publish` invokes pnpm's built-in registry publish and never reaches the script.

`build`, `publish` and `logs` are commands of [`@crowdin/serverless-apps-cli`](https://www.npmjs.com/package/@crowdin/serverless-apps-cli), a dev dependency of the app; the [CLI reference](https://crowdin.github.io/serverless-apps/reference/cli-commands/) describes them in full. Options go after the command, and `--help` lists them, as in `pnpm logs --help`.

The app has an OAuth app in Crowdin, which `create` made with the scope `project`. A scope outside `project`, such as `tm` or `glossary`, is first selected in that OAuth app in Crowdin; then apply the update in the app's settings. When Crowdin refuses, `publish` prints the reason and the ways on: follow them.

If a way on needs a token or a client secret, set it in your own terminal and run the publish yourself. Never paste one into a chat with an AI agent.

In a fresh clone of the app, `.env` is missing: run `pnpm exec crowdin-serverless-apps link` once and pick the app, then publish as usual.

To give the app to another Crowdin account, send its app file from `dist/`. An admin there installs it with `crowdin-serverless-apps install <file>`; see [share an app](https://crowdin.github.io/serverless-apps/development/sharing/).

## Changing the modules

Modules are properties of the configuration returned in `src/index.ts`, for example `projectTools`, `organizationMenu` or `customMT`. The template's `projectTools` entry is a sample: an app of another type replaces it. The [Crowdin Apps documentation](https://crowdin.github.io/app-project-module/) describes every module and its options. Routes of your own go in the `setup` option of `createCloudflareWorker`.

## Project layout

```
src/
  index.ts           # the app: configuration and modules
public/              # static files; add logo.png for the app logo
  assets/            # SDK UI files, generated (not committed)
wrangler.jsonc       # build and local-dev configuration
.env                 # ties this folder to the deployed app; written by create or link (not committed)
```
