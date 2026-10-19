"use client";
import { apiRequest } from "@/lib/api/client";
import { useAccountStore } from "@/lib/stores/bookings";
import { useSessionStore } from "@/lib/stores/session";
import type { ServiceRequest, SupportCase } from "@/lib/types/booking";
async function all<T>(path:string){const values:T[]=[];for(let page=1;;page++){const response=await apiRequest<T[]>('customer',path,{query:{page,perPage:20}});values.push(...response.data);if(!response.pagination||page>=response.pagination.totalPages)break;}return values;}
export async function loadServicingData(owner: string) {
  const [requests, cases] = await Promise.all([
    all<ServiceRequest>("requests"),
    all<SupportCase>("support"),
  ]);
  if (useSessionStore.getState().user?.id === owner)
    useAccountStore.setState({ requests, cases });
}
/** Retain an opaque retry key across reloads; no posted amount or decision is authoritative. */
export async function serviceMutation<T>(
  path: string,
  body: Record<string, unknown>,
  method = "POST",
): Promise<T> {
  const owner = useSessionStore.getState().user?.id;
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify({ owner, path, body })),
  );
  const slot =
    "cf.service.retry." +
    Array.from(new Uint8Array(bytes))
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("");
  let idempotencyKey = crypto.randomUUID();
  try {
    const saved = sessionStorage.getItem(slot);
    if (saved)
      idempotencyKey =
        saved as `${string}-${string}-${string}-${string}-${string}`;
    else sessionStorage.setItem(slot, idempotencyKey);
  } catch {
    /* Storage may be disabled. */
  }
  return (
    await apiRequest<T>(owner ? "customer" : "public", path, {
      method,
      body: JSON.stringify({
        ...body,
        ...(method === "POST" ? { idempotencyKey } : {}),
      }),
    })
  ).data;
}
