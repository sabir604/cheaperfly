"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BedDouble,
  Bell,
  CalendarCheck,
  ChevronDown,
  CircleHelp,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Plane,
  Ticket,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import { CheaperflyLogo } from "@/components/brand";
import { Button, ButtonLink } from "@/components/ui/button";
import { Drawer, Popover, PopoverClose, PopoverContent, PopoverTrigger } from "@/components/ui/overlay";
import { toast } from "@/components/ui/toast";
import { CurrencyMenu } from "./currency-menu";
import { signOut } from "@/lib/engine/auth";
import { useFeature, useFeatures, useSiteConfig, type FeatureKey } from "@/lib/site-config";
import { useAccountStore } from "@/lib/stores/bookings";
import { useHydrated } from "@/lib/stores/hydration";
import { useSessionStore } from "@/lib/stores/session";
import { cn, initials } from "@/lib/utils";

const NAV_ICONS: Record<string, LucideIcon> = { flights: Plane, hotels: BedDouble, umrah: Moon, manage: CalendarCheck, help: CircleHelp };

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(href + "/");

function AccountMenu() {
  const hydrated = useHydrated();
  const user = useSessionStore((s) => s.user);
  const unread = useAccountStore((s) => s.notifications.filter((n) => !n.read).length);
  const router = useRouter();
  const signupEnabled = useFeature("customerSignup");

  if (!hydrated) return <div className="h-10 w-[104px]" aria-hidden />;
  if (!user)
    return (
      <div className="flex items-center gap-2">
        <ButtonLink href="/sign-in" variant={signupEnabled ? "ghost" : "navy"} size="md" className={signupEnabled ? "hidden sm:inline-flex" : undefined}>
          Sign in
        </ButtonLink>
        {signupEnabled && (
          <ButtonLink href="/sign-up" variant="navy" size="md">
            Register
          </ButtonLink>
        )}
      </div>
    );

  const links = [
    { href: "/account", label: "Overview", icon: LayoutDashboard },
    { href: "/account/bookings", label: "My bookings", icon: Ticket },
    { href: "/account/travellers", label: "Saved travellers", icon: Users },
    { href: "/account/notifications", label: "Notifications", icon: Bell, badge: unread },
    { href: "/account/profile", label: "Profile", icon: User },
  ];
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="flex h-10 items-center gap-2 rounded-lg pl-1 pr-2 hover:bg-slate-100" aria-label={`Account menu for ${user.firstName} ${user.lastName}`}>
          <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-navy-900 text-xs font-bold text-white">
            {initials(`${user.firstName} ${user.lastName}`)}
            {unread > 0 && <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-red-500" aria-label={`${unread} unread notifications`} />}
          </span>
          <span className="hidden text-sm font-semibold text-navy-900 md:block">{user.firstName}</span>
          <ChevronDown className="hidden h-3.5 w-3.5 text-slate-400 md:block" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-1.5">
        <div className="border-b border-slate-100 px-3 py-2.5">
          <p className="text-sm font-bold text-navy-900">
            {user.firstName} {user.lastName}
          </p>
          <p className="truncate text-xs text-slate-500">{user.email}</p>
        </div>
        <div className="py-1">
          {links.map((l) => (
            <PopoverClose asChild key={l.href}>
              <Link href={l.href} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                <l.icon className="h-4 w-4 text-slate-400" aria-hidden />
                <span className="flex-1">{l.label}</span>
                {l.badge ? <span className="rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white">{l.badge}</span> : null}
              </Link>
            </PopoverClose>
          ))}
        </div>
        <div className="border-t border-slate-100 pt-1">
          <PopoverClose asChild>
            <button
              type="button"
              onClick={() => {
                signOut();
                toast.info("You've been signed out");
                router.push("/");
              }}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <LogOut className="h-4 w-4 text-slate-400" aria-hidden />
              Sign out
            </button>
          </PopoverClose>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const user = useSessionStore((s) => s.user);
  const hydrated = useHydrated();
  const router = useRouter();
  const site = useSiteConfig();
  const features = useFeatures();
  const signupEnabled = useFeature("customerSignup");

  const items = useMemo(
    () =>
      site.navigation.items
        .filter((i) => i.visible && (!("feature" in i) || !i.feature || features[i.feature as FeatureKey]))
        .map((i) => ({ href: i.href, label: i.label, icon: NAV_ICONS[i.id] ?? Ticket })),
    [site, features],
  );

  // Close the mobile menu after navigating (adjusting state during render, not in an effect).
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setMenuOpen(false);
  }

  return (
    <header className="no-print sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="container-page flex h-16 items-center gap-4 lg:gap-8">
        <button type="button" className="-ml-2 rounded-lg p-2 text-navy-900 hover:bg-slate-100 lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Open menu">
          <Menu className="h-6 w-6" />
        </button>
        <Link href="/" aria-label="Cheaperfly home" className="shrink-0">
          <CheaperflyLogo />
        </Link>
        <nav aria-label="Primary" className="hidden flex-1 items-center gap-1 lg:flex">
          {items.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative rounded-lg px-3.5 py-2 text-[14px] font-semibold transition-colors",
                  active ? "text-brand-600" : "text-slate-700 hover:bg-slate-100 hover:text-navy-900",
                  item.href === "/umrah" && !active && "hover:text-umrah-800",
                )}
              >
                {item.label}
                {active && <span className="absolute inset-x-3.5 -bottom-[13px] h-0.5 rounded bg-brand-500" aria-hidden />}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-1 sm:gap-2 lg:ml-0">
          <CurrencyMenu className="hidden sm:flex" />
          <AccountMenu />
        </div>
      </div>

      <Drawer open={menuOpen} onOpenChange={setMenuOpen} title="Menu" side="left">
        <nav aria-label="Mobile primary" className="p-2">
          {items.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-3.5 text-[15px] font-semibold",
                  active ? "bg-brand-50 text-brand-700" : "text-slate-800 hover:bg-slate-50",
                )}
              >
                <item.icon className="h-5 w-5 text-slate-400" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-200 p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Currency</p>
          <CurrencyMenu className="-ml-2.5" />
        </div>
        <div className="border-t border-slate-200 p-4">
          {hydrated && user ? (
            <div className="flex flex-col gap-2">
              <ButtonLink href="/account" variant="navy" block>
                My account
              </ButtonLink>
              <Button
                variant="outline"
                block
                onClick={() => {
                  signOut();
                  setMenuOpen(false);
                  router.push("/");
                }}
              >
                Sign out
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <ButtonLink href="/sign-in" variant="navy" block>
                Sign in
              </ButtonLink>
              {signupEnabled && (
                <ButtonLink href="/sign-up" variant="outline" block>
                  Create an account
                </ButtonLink>
              )}
            </div>
          )}
        </div>
      </Drawer>
    </header>
  );
}
