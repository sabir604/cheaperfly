/** Shared plumbing for the mock services: simulated latency and typed errors. */

export class ServiceError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

/** QA scenarios, switchable from the Demo & QA panel (stored in `cf.ui.scenario`). */
export type Scenario = "ok" | "empty" | "error" | "expired" | "price-changed";

export interface ServiceOptions {
  scenario?: Scenario;
}

let latencyEnabled = true;

/** Tests turn simulated network latency off. */
export function setSimulatedLatency(enabled: boolean) {
  latencyEnabled = enabled;
}

export function sleep(ms: number): Promise<void> {
  if (!latencyEnabled) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}
