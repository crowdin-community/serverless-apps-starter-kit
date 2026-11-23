import { type CrowdinCloudflareEnv, createCloudflareWorker } from "@crowdin/app-project-module/cloudflare";

interface Env extends CrowdinCloudflareEnv {
  APP_IDENTIFIER: string;
}

export default createCloudflareWorker<Env>((env) => ({
  name: "__APP_NAME__",
  identifier: env.APP_IDENTIFIER,
  description: "A Crowdin app hosted on Crowdin",
  clientId: env.CROWDIN_CLIENT_ID,
  clientSecret: env.CROWDIN_CLIENT_SECRET,
  // Keep this a plain list of Scope values from "@crowdin/app-project-module": the build reads it from this file. Without the line the SDK asks for "project".
  scopes: [],
  // Add modules here (projectTools, organizationMenu, customMT, ...): see the Crowdin Apps SDK documentation.
}));
