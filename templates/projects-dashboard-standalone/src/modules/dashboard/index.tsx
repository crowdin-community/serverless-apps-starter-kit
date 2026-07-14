import "@crowdin/serverless-apps-sdk/ui/styles.css";
import type { ModuleContract } from "@crowdin/serverless-apps-sdk";
import { AppI18nProvider } from "@crowdin/serverless-apps-sdk/i18n";
import { AppUiProvider } from "@crowdin/serverless-apps-sdk/ui";
import { createRoot } from "react-dom/client";
import { App } from "./app";

async function render() {
  const root = createRoot(document.getElementById("root") as Element);
  root.render(
    <AppI18nProvider>
      <AppUiProvider>
        <App />
      </AppUiProvider>
    </AppI18nProvider>,
  );
}

const dashboard: ModuleContract = { render };
export default dashboard;

if (import.meta.hot) {
  import.meta.hot.accept("./app", () => {
    void render();
  });
}
