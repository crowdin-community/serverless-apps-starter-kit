import "./styles.css";
import {
  prepareOrganizationMenu,
  prepareProfileResourcesMenu,
} from "@crowdin/serverless-apps-sdk";
import dashboard from "./modules/dashboard";

prepareOrganizationMenu(dashboard);
prepareProfileResourcesMenu(dashboard);
