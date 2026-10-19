"use client";

import { replySupportCase } from "@/lib/engine/bookings/requests";
import { useState } from "react";
import { MessageSquare, Send } from "lucide-react";
import { SupportContactOptions, SupportForm, openWhatsAppCase } from "@/components/support/support";
import { Button } from "@/components/ui/button";
import { Accordion } from "@/components/ui/disclosure";
import { StateView } from "@/components/ui/feedback";
import { Textarea } from "@/components/ui/form";
import { Badge } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { formatDateTimeMed } from "@/lib/engine/dates";
import { useAccountStore } from "@/lib/stores/bookings";
import type { SupportCase } from "@/lib/types/booking";
import { cn } from "@/lib/utils";
import { PageTitle } from "./account-shell";



function CaseThread({ c }: { c: SupportCase }) {
  const [sending,setSending]=useState(false);
  const [reply, setReply] = useState("");

  async function send() {
    const text=reply.trim();if(text.length<2||sending)return;
    setSending(true);
    try{await replySupportCase(c.id,text);setReply('');toast.success('Reply saved to your case');}
    catch{toast.error('Could not save your reply. Please try again.');}
    finally{setSending(false);}
  }

  return (
    <li className="rounded-xl border border-slate-200 bg-white px-5">
      <Accordion
        title={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-mono text-sm font-extrabold text-navy-900">{c.id}</span>
            <span className="text-[15px]">{c.subject}</span>
          </span>
        }
        meta={<Badge tone={c.status === "resolved" ? "success" : "brand"}>{c.status.replace("_", " ")}</Badge>}
      >
        <p className="mb-3 text-xs text-slate-500">
          {c.topic} · {c.channel} · opened {formatDateTimeMed(c.createdAt)}
          {c.bookingRef ? ` · booking ${c.bookingRef}` : ""}
        </p>
        <ul className="space-y-3">
          {c.messages.map((m, i) => (
            <li key={i} className={cn("max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm", m.from === "customer" ? "ml-auto bg-brand-500 text-white" : "bg-slate-100 text-slate-800")}>
              <p>{m.text}</p>
              <p className={cn("mt-1 text-[10px]", m.from === "customer" ? "text-brand-100" : "text-slate-400")}>
                {m.from === "customer" ? "You" : "Cheaperfly"} · {formatDateTimeMed(m.at)}
              </p>
            </li>
          ))}
        </ul>
        {c.status !== "resolved" && (
          <div className="mt-4 flex gap-2">
            <label htmlFor={`rep-${c.id}`} className="sr-only">
              Reply to case {c.id}
            </label>
            <Textarea id={`rep-${c.id}`} rows={2} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Write a reply…" className="min-h-0" />
            <Button onClick={send} disabled={sending || reply.trim().length < 2} leftIcon={<Send className="h-4 w-4" />} className="self-end">
              Send
            </Button>
          </div>
        )}
      </Accordion>
    </li>
  );
}

export function AccountSupportPage() {
  const cases = useAccountStore((s) => s.cases);
  return (
    <div>
      <PageTitle title="Support" subtitle="Message our team, or pick the channel that suits you." />
      <div className="mb-8">
        <SupportContactOptions onWhatsApp={() => openWhatsAppCase("")} />
      </div>
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <section aria-labelledby="new-case">
          <h2 id="new-case" className="mb-3 text-lg font-bold">
            Message support
          </h2>
          <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
            <SupportForm compact />
          </div>
        </section>
        <section aria-labelledby="cases-h">
          <h2 id="cases-h" className="mb-3 text-lg font-bold">
            Your cases ({cases.length})
          </h2>
          {cases.length === 0 ? (
            <StateView compact icon={<MessageSquare className="h-7 w-7" />} title="No support cases yet" description="When you contact us, your conversation is saved here." />
          ) : (
            <ul className="space-y-3">
              {cases.map((c) => (
                <CaseThread key={c.id} c={c} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
