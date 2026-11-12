import { type CrowdinCloudflareEnv, createCloudflareWorker } from "@crowdin/app-project-module/cloudflare";

export default createCloudflareWorker<CrowdinCloudflareEnv>((env) => ({
  name: "__APP_NAME__",
  identifier: "__APP_IDENTIFIER__",
  description: "A Crowdin app hosted on Crowdin",
  clientId: env.CROWDIN_CLIENT_ID,
  clientSecret: env.CROWDIN_CLIENT_SECRET,
  // Add modules here (projectTools, organizationMenu, customMT, ...): see the Crowdin Apps SDK documentation.
}));
