"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ButtonLink } from "@/components/ui/button";
import { StateView } from "@/components/ui/feedback";
import { Skeleton } from "@/components/ui/primitives";
import { serverBookings } from "@/lib/engine/server-bookings";
import type { BookingDocument } from "@cheaperfly/api-contracts/bookings";
import { useHydrated } from "@/lib/stores/hydration";
import { useSessionStore } from "@/lib/stores/session";
import type { Booking } from "@/lib/types/booking";

type Access = "loading" | "ok" | "signin" | "forbidden" | "notfound";

function GateSkeleton() {
  return (
    <div className="space-y-4" aria-busy>
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-40 w-full rounded-xl" />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Skeleton className="h-96 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    </div>
  );
}

function Denied({ access, mode }: { access: Exclude<Access, "loading" | "ok">; mode: "guest" | "account" | "document" }) {
  if (access === "signin")
    return (
      <StateView
        title="Sign in to view this booking"
        description="Bookings are private to your account. Sign in with the email you booked with."
        actions={
          <>
            <ButtonLink href="/sign-in">Sign in</ButtonLink>
            <ButtonLink href="/manage-booking" variant="outline">
              Find with reference
            </ButtonLink>
          </>
        }
      />
    );
  if (access === "forbidden")
    return (
      <StateView
        tone="warning"
        title="We couldn't open this booking"
        description={
          mode === "account"
            ? "This booking isn't linked to your account. If you booked as a guest, use Manage Booking with your reference and last name."
            : "For your security, please confirm your booking reference and last name first."
        }
        actions={
          <>
            <ButtonLink href="/manage-booking">Manage booking</ButtonLink>
            <ButtonLink href="/help/contact" variant="outline">
              Contact support
            </ButtonLink>
          </>
        }
      />
    );
  return (
    <StateView
      tone="warning"
      title="Booking not found"
      description="We couldn't find a booking with that reference with those details. Check the reference or look it up with your last name."
      actions={
        <>
          <ButtonLink href="/manage-booking">Manage booking</ButtonLink>
          <ButtonLink href="/account/bookings" variant="outline">
            My bookings
          </ButtonLink>
        </>
      }
    />
  );
}

/**
 * Renders a booking only for someone allowed to see it: the account that owns it, or (in guest
 * or document mode) a browser that made it or unlocked it via Manage Booking lookup.
 */
export function BookingGate({ reference, mode, documentKind, children }: { documentKind?: BookingDocument['kind']; reference: string; mode: "guest" | "account" | "document"; children: (b: Booking) => ReactNode }) {
  const hydrated = useHydrated();
  const user = useSessionStore((s) => s.user);
  const [result,setResult]=useState<{key:string;booking:Booking|null;access:Access}>({key:'',booking:null,access:'loading'});
  const key=`${reference}:${mode}:${documentKind ?? ''}:${user?.id ?? ''}`;
  useEffect(()=>{
    if(!hydrated)return;
    let active=true;
    const load=()=>{
      setResult(previous=>previous.key===key&&previous.access==='ok'?previous:{key,booking:null,access:'loading'});
      if(mode==='account'&&!user){setResult({key,booking:null,access:'signin'});return;}
      serverBookings.read(reference,mode==='account',documentKind).then(booking=>{if(active)setResult({key,booking,access:'ok'});}).catch(()=>{if(active)setResult({key,booking:null,access:'forbidden'});});
    };
    load(); window.addEventListener('focus',load);window.addEventListener('booking-updated',load);
    const timer=setInterval(load,60000);
    return ()=>{active=false;clearInterval(timer);window.removeEventListener('focus',load);window.removeEventListener('booking-updated',load);};
  },[hydrated,key,reference,mode,documentKind,user]);
  const {booking,access}=result.key===key?result:{booking:null,access:'loading' as Access};
  if (access === "loading") return <GateSkeleton />;
  if (access === "ok" && booking) return <>{children(booking)}</>;
  return <Denied access={access === "ok" ? "notfound" : access} mode={mode} />;
}
