import { formatter } from "@lingui/format-po";

export default {
  locales: ["en-US", "ja-JP"],
  sourceLocale: "en-US",
  catalogs: [{ path: "locales/{locale}", include: ["src"] }],
  format: formatter({ origins: false }),
};
