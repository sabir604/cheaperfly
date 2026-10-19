import "server-only";
import { cache } from "react";
import type { UmrahPackage } from "@cheaperfly/api-contracts/umrah-types";
import { proxyWebsiteApi } from "./api-transport";
export const readUmrahPackage = cache(
  async (id: string): Promise<{ status: number; pkg?: UmrahPackage }> => {
    const response = await proxyWebsiteApi(
      new Request(
        "http://website-adapter.internal/api/public/v1/umrah/packages/" +
          encodeURIComponent(id),
      ),
      "public",
      ["umrah", "packages", id],
    );
    return response.ok
      ? {
          status: response.status,
          pkg: (await response.json()).data as UmrahPackage,
        }
      : { status: response.status };
  },
);
