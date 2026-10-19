import { describe, expect, it } from "vitest";
import { endpoints } from "@cheaperfly/api-contracts";
import {
  API_ENDPOINTS,
  API_PREFIX,
  backendApiUrl,
  backendBaseUrl,
  browserApiPrefix,
} from "@/config/URL_Config";

describe("URL_Config", () => {
  it("lists exactly the contract endpoints, with the same methods", () => {
    const configured = Object.entries(API_ENDPOINTS)
      .flatMap(([scope, list]) =>
        Object.values(list).map((e) => `${scope} ${e.path} ${e.methods.join(",")}`),
      )
      .sort();
    const contract = endpoints
      .map((e) => `${e.scope} ${e.path} ${e.methods.join(",")}`)
      .sort();
    expect(configured).toEqual(contract);
  });

  it("builds backend and browser URLs", () => {
    expect(
      backendBaseUrl({ NODE_ENV: "development", CHEAPERFLY_BACKEND_URL: "http://localhost:3001" }),
    ).toBe("http://localhost:3001");
    expect(backendBaseUrl({ NODE_ENV: "development" })).toBeUndefined();
    expect(
      backendBaseUrl({ NODE_ENV: "production", CHEAPERFLY_BACKEND_URL: "https://api.example.test" }),
    ).toBe("https://api.example.test");
    expect(backendBaseUrl({ NODE_ENV: "production" })).toBeUndefined();
    expect(backendApiUrl("http://localhost:3001", "public", "flights/search")).toBe(
      `http://localhost:3001${API_PREFIX}/public/flights/search`,
    );
    expect(backendApiUrl("http://localhost:3001", "customer", "bookings", "?page=2")).toBe(
      "http://localhost:3001/api/website/v1/customer/bookings?page=2",
    );
    expect(browserApiPrefix("customer")).toBe("/api/customer/v1");
  });
});
