/**
 * Loads the ORIGINAL production modules (recovered from cheaperfly.vercel.app) through the Turbopack shim,
 * so parity tests can compare our port against the real thing on identical inputs.
 * Requires the archive at ../archive and the shim at ../tools/archiver/turbo-shim.js.
 */
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { vi } from "vitest";

const shimPath = fileURLToPath(new URL("../../../tools/archiver/turbo-shim.js", import.meta.url));
export const archiveAvailable = existsSync(shimPath);

type Shim = { findByExport(name: string): Record<string, unknown> };
let shim: Shim | undefined;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function original<T = any>(name: string): T {
  shim ??= createRequire(import.meta.url)(shimPath) as Shim;
  return shim.findByExport(name)[name] as T;
}

/** The archive was captured on this day; fixtures and the original's relative dates assume it. */
export const CAPTURE_NOW = new Date("2026-09-25T12:00:00");

export function freezeClock(at: Date = CAPTURE_NOW) {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(at);
}

/** JSON round-trip: drops `undefined` fields and functions, which is how both sides persist data. */
export const plain = <T>(v: T): T => JSON.parse(JSON.stringify(v));
