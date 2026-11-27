# Agent guide

`AGENTS.md` is a symlink to this file.

## What this repository is

Starter templates for Crowdin apps, consumed by `crowdin-serverless-apps create --template <name>` from [`@crowdin/serverless-apps-cli`](https://github.com/crowdin/serverless-apps). There is no root `package.json`: each directory under `templates/` is an independent pnpm project. Lockfiles are deliberately left out of git, so a template pins no dependency tree.

Each template has its own `README.md` and `CLAUDE.md`. Both are copied into every app made from the template, so each stands alone and is written for the developer of that app. How a template's app works (commands, entry points, SDK surface, toolchain) is in that template's `CLAUDE.md`: read it before changing the template, and keep it true in the same change.

There are no tests. Check a change with the template's own scripts, in its folder.

## Frontend templates

`projects-dashboard-cli` and `projects-dashboard-standalone` are frontend apps: they run in an iframe inside Crowdin and Crowdin Enterprise. They are the **same app** (a projects dashboard) and differ only in who owns the toolchain:

- `templates/projects-dashboard-cli` contains app code only. The `crowdin-serverless-apps` CLI owns Vite, Lingui, Biome and the base tsconfig (`extends: @crowdin/serverless-apps-cli/tsconfig.base.json`). This template stays free of toolchain config files (`vite.config`, `lingui.config`, `biome.json`): their absence is the point.
- `templates/projects-dashboard-standalone` owns its full toolchain: `vite.config.ts`, `lingui.config.mjs`, `biome.json` and `scripts/{dev,build,compile-i18n}.mjs`, built on `@crowdin/serverless-apps-sdk` alone.

**Invariant: `src/` and `locales/` are byte-identical between the two.** Apply a change to app code or catalogs to both. It is done when `diff -r` of the two `src` folders and of the two `locales` folders prints nothing. Only toolchain files differ.

The two guides share their passages on the app and the SDK: change a shared passage in both.

Both manifests keep the `bundle` field for `create` of CLI versions that register an app from the manifest alone: there it is what puts the app into development mode. Newer versions and Crowdin ignore it.

## Backend template

`templates/backend-base` is a Crowdin app with a backend: a Cloudflare Worker built with `createCloudflareWorker` from `@crowdin/app-project-module/cloudflare`, which Crowdin runs. It declares one sample module, a project tool with a settings form, so the app works in Crowdin from the start: the developer replaces it or adds others in `src/index.ts`. It shares nothing with the frontend templates.

The CLI creates, builds and publishes the apps made from this template, and relies on its shape. Keep these parts as they are, or change them together with the CLI:

- no `manifest.json`, and `@crowdin/app-project-module` in `dependencies`;
- the placeholders `__APP_NAME__` and `__APP_IDENTIFIER__`, and the files they are in;
- `identifier: env.APP_IDENTIFIER` in `src/index.ts`;
- `scopes` in `src/index.ts` as a plain list written in place;
- `public` as the assets folder;
- `wrangler` as a dev dependency pinned to an exact version.

In the template folder only `pnpm typecheck` runs, once the dependencies are installed: Wrangler refuses the placeholder name in `wrangler.jsonc`, so `dev` and the build need an app that `create` scaffolded.
