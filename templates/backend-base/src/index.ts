import { Scope } from "@crowdin/app-project-module";
import { type CrowdinCloudflareEnv, createCloudflareWorker } from "@crowdin/app-project-module/cloudflare";

interface Env extends CrowdinCloudflareEnv {
  APP_IDENTIFIER: string;
}

export default createCloudflareWorker<Env>((env) => ({
  name: "__APP_NAME__",
  identifier: env.APP_IDENTIFIER,
  description: "A Crowdin backend app",
  clientId: env.CROWDIN_CLIENT_ID,
  clientSecret: env.CROWDIN_CLIENT_SECRET,
  // Keep this a plain list of Scope values: the build reads it from this file. Narrow it to what the code calls.
  // The app's OAuth app in Crowdin was created with this list, so a scope outside "project" is added there first.
  scopes: [Scope.PROJECTS],
  // A sample module: a page in the Tools of a project, with a form that the SDK draws and saves.
  // Keep it, or replace it with the modules your app needs (organizationMenu, customMT, webhooks, ...): see the Crowdin Apps SDK documentation.
  projectTools: [
    {
      formSchema: {
        title: "Settings",
        type: "object",
        properties: { greeting: { type: "string", title: "Greeting", default: "Hello" } },
      },
    },
  ],
}));
