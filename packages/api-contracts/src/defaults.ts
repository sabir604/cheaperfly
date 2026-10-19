// Initial content used until an enabled brand publishes a persisted revision.
import content from "./default-site.json";
import features from "./default-features.json";
export const bootstrapConfiguration = {
  source: "bootstrap" as const,
  version: 1,
  content,
  features,
};
