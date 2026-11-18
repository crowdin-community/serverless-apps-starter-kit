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
  // Add modules here (projectTools, organizationMenu, customMT, ...): see the Crowdin Apps SDK documentation.
}));
