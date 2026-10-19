"use client";

import { useEffect, type ReactNode } from "react";
import { useServerBookings,loadServerBookings } from "@/lib/engine/server-bookings";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, CalendarRange, FileText, Headset, LayoutDashboard, LogOut, Receipt, Settings, Ticket, User, Users } from "lucide-react";
import { StateView } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { useAccountData,loadAccountData } from "@/lib/engine/account";
import { Skeleton } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { signOut } from "@/lib/engine/auth";
import { formatDateMed } from "@/lib/engine/dates";
import { useAccountStore } from "@/lib/stores/bookings";
import { useHydrated } from "@/lib/stores/hydration";
import { useSessionStore } from "@/lib/stores/session";
import { cn, initials } from "@/lib/utils";

const NAV = [
  { href: "/account", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/account/trips", label: "My Trips", icon: CalendarRange },
  { href: "/account/bookings", label: "My Bookings", icon: Ticket },
  { href: "/account/travellers", label: "Saved Travellers", icon: Users },
  { href: "/account/refunds", label: "Refund Requests", icon: Receipt },
  { href: "/account/documents", label: "Documents", icon: FileText },
  { href: "/account/profile", label: "Profile", icon: User },
  { href: "/account/preferences", label: "Preferences", icon: Settings },
  { href: "/account/notifications", label: "Notifications", icon: Bell },
  { href: "/account/support", label: "Support", icon: Headset },
];

/** Account frame: sidebar on desktop, scrolling tab strip on mobile. Signed-out visitors are sent to sign-in and brought back. */
export function AccountShell({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  const bookingStatus=useServerBookings(s=>s.status);
  const bookingOwner=useServerBookings(s=>s.owner);

  const accountStatus = useAccountData((s)=>s.status);
  const accountError = useAccountData((s)=>s.error);
  const user = useSessionStore((s) => s.user);
  const unread = useAccountStore((s) => s.notifications.filter((n) => !n.read).length);
  const pathname = usePathname() ?? "/account";
  const router = useRouter();
  useEffect(()=>{if(hydrated && user)void loadServerBookings(user.id);},[hydrated,user,pathname]);

  useEffect(() => {
    if (hydrated && !user) router.replace(`/sign-in?next=${encodeURIComponent(pathname)}`);
  }, [hydrated, user, pathname, router]);

  if (hydrated && user && (accountStatus === "error" || bookingStatus === "error"))
    return (
      <StateView
        tone="error"
        title="Could not load your account"
        description={accountError ?? undefined}
        actions={<Button onClick={() => void Promise.all([loadAccountData(),loadServerBookings(user!.id)])}>Try again</Button>}
      />
    );

  if (!hydrated || !user || accountStatus !== "ready" || bookingStatus !== "ready" || bookingOwner !== user.id)
    return (
      <div className="container-page py-8" aria-busy>
        <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
          <Skeleton className="hidden h-96 rounded-xl lg:block" />
          <div className="space-y-4">
            <Skeleton className="h-10 w-72" />
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        </div>
      </div>
    );

  const isActive = (item: (typeof NAV)[number]) => (item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/"));

  return (
    <div className="container-page py-6 lg:py-8">
      <nav aria-label="Account" className="scrollbar-none -mx-4 mb-6 flex gap-1.5 overflow-x-auto px-4 pb-1 lg:hidden">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive(item) ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-lg border px-3.5 py-2 text-[13px] font-semibold",
              isActive(item) ? "border-navy-900 bg-navy-900 text-white" : "border-slate-200 bg-white text-slate-700",
            )}
          >
            <item.icon className="h-4 w-4" aria-hidden />
            {item.label}
            {item.href === "/account/notifications" && unread > 0 && <span className="rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">{unread}</span>}
          </Link>
        ))}
      </nav>
      <div className="grid gap-8 lg:grid-cols-[264px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-24 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center gap-3 border-b border-slate-100 p-5">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-navy-900 text-base font-bold text-white">{initials(`${user.firstName} ${user.lastName}`)}</span>
              <div className="min-w-0">
                <p className="truncate text-[15px] font-bold text-navy-900">
                  {user.firstName} {user.lastName}
                </p>
                <p className="truncate text-xs text-slate-500">{user.email}</p>
                <p className="text-[11px] text-slate-400">Member since {formatDateMed(user.memberSince)}</p>
              </div>
            </div>
            <nav aria-label="Account" className="p-2">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive(item) ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-semibold transition-colors",
                    isActive(item) ? "bg-brand-50 text-brand-700" : "text-slate-700 hover:bg-slate-50",
                  )}
                >
                  <item.icon className={cn("h-[18px] w-[18px]", isActive(item) ? "text-brand-600" : "text-slate-400")} aria-hidden />
                  <span className="flex-1">{item.label}</span>
                  {item.href === "/account/notifications" && unread > 0 && (
                    <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">{unread}</span>
                  )}
                </Link>
              ))}
              <button
                type="button"
                onClick={async () => {
                  if (!(await signOut())) return toast.error("Could not sign out. Please try again.");
                  toast.info("You've been signed out");
                  router.push("/");
                }}
                className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-semibold text-slate-700 hover:bg-slate-50"
              >
                <LogOut className="h-[18px] w-[18px] text-slate-400" aria-hidden /> Sign out
              </button>
            </nav>
          </div>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

export function PageTitle({ title, subtitle, action }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold sm:text-[28px]">{title}</h1>
        {subtitle && <p className="mt-1 text-[15px] text-slate-600">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
