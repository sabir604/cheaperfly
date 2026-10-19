import "server-only";
import { cache } from "react";
import type { Hotel } from "@cheaperfly/api-contracts/hotels";
import { proxyWebsiteApi } from "./api-transport";
/** Public catalogue reads use the same fixed-origin allowlisted adapter as browser requests. */
export const readHotel = cache(
  async (id: string): Promise<{ status: number; hotel?: Hotel }> => {
    const response = await proxyWebsiteApi(
      new Request(
        "http://website-adapter.internal/api/public/v1/hotels/" +
          encodeURIComponent(id),
      ),
      "public",
      ["hotels", id],
    );
    return response.ok
      ? {
          status: response.status,
          hotel: (await response.json()).data as Hotel,
        }
      : { status: response.status };
  },
);
