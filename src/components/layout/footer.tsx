"use client";

import Link from "next/link";
import { Lock, Mail, MessageCircle, Phone, ShieldCheck } from "lucide-react";
import { CheaperflyLogo } from "@/components/brand";
import { CurrencyMenu } from "./currency-menu";
import { useFeatures, useSiteConfig } from "@/lib/site-config";

const isExternal = (href: string) => /^https:\/\//i.test(href);

export function Footer() {
  const site = useSiteConfig();
  const features = useFeatures();
  const { footer, contact, branding } = site;
  const social = Object.entries(contact.social).filter(([, url]) => url.trim());

  return (
    <footer className="no-print mt-20 bg-navy-950 text-slate-300">
      <div className="container-page grid gap-10 py-14 lg:grid-cols-[1.35fr_3fr]">
        <div>
          <CheaperflyLogo light />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-400">{footer.tagline}</p>
          <ul className="mt-6 space-y-3 text-sm">
            {features.telephony && contact.phone && (
              <li>
                <Link href="/help/contact" className="flex items-center gap-2.5 hover:text-white">
                  <Phone className="h-4 w-4 text-brand-300" aria-hidden /> {contact.phone}
                  {contact.phoneHours && <span className="text-xs text-slate-500">{contact.phoneHours}</span>}
                </Link>
              </li>
            )}
            {features.whatsappSupport && (
              <li>
                <Link href="/help/contact" className="flex items-center gap-2.5 hover:text-white">
                  <MessageCircle className="h-4 w-4 text-brand-300" aria-hidden /> WhatsApp support
                </Link>
              </li>
            )}
            {contact.email && (
              <li>
                <Link href="/help/contact" className="flex items-center gap-2.5 hover:text-white">
                  <Mail className="h-4 w-4 text-brand-300" aria-hidden /> {contact.email}
                </Link>
              </li>
            )}
          </ul>
          {social.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[13px]" aria-label="Social media">
              {social.map(([name, url]) => (
                <li key={name}>
                  <a href={url} target="_blank" rel="noreferrer noopener" className="capitalize text-slate-400 hover:text-white">
                    {name}
                  </a>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-6">
            <CurrencyMenu variant="footer" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-9 sm:grid-cols-3">
          {footer.columns
            .filter((col) => col.links.length > 0)
            .map((col) => (
              <nav key={col.id} aria-label={col.title}>
                <h2 className="mb-3.5 text-[13px] font-bold uppercase tracking-wider text-white">{col.title}</h2>
                <ul className="space-y-2.5 text-sm">
                  {col.links
                    .filter((l) => !(l.href === "/sign-up" && !features.customerSignup))
                    .map((l) => (
                      <li key={l.label + l.href}>
                        {isExternal(l.href) ? (
                          <a href={l.href} target="_blank" rel="noreferrer noopener" className="text-slate-400 transition-colors hover:text-white">
                            {l.label}
                          </a>
                        ) : (
                          <Link href={l.href} className="text-slate-400 transition-colors hover:text-white">
                            {l.label}
                          </Link>
                        )}
                      </li>
                    ))}
                </ul>
              </nav>
            ))}
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-4 py-6 text-[13px] text-slate-500 md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} {branding.displayName}. Prototype experience — all inventory, prices and payments are simulated.
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5" aria-hidden /> Secure checkout
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Price-match promise
            </span>
            {footer.showPaymentBadges && (
              <span className="flex gap-1.5" aria-label="Accepted payment methods">
                {["VISA", "MC", "AMEX", "Apple Pay", "G Pay"].map((b) => (
                  <span key={b} className="rounded border border-white/15 px-1.5 py-0.5 text-[10px] font-bold text-slate-400">
                    {b}
                  </span>
                ))}
              </span>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
