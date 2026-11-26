"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Icon } from "@/components/icon";
import { newFillToken } from "@/lib/actions";

/**
 * The one-line loader that injects /fill.js from this app. Google Forms enforces Trusted Types, so the script URL
 * goes through a policy that allows this one URL and nothing else.
 */
const loader = (src: string) =>
  `javascript:((u,d,t)=>{let s=d.createElement('script'),p;try{p=t&&t.createPolicy('hackops'+Date.now(),{createScriptURL:x=>x===u?x:''})}catch(e){}s.src=p?p.createScriptURL(u):u;d.documentElement.appendChild(s)})(${JSON.stringify(src).replace(/"/g, "'")},document,window.trustedTypes)`;

export function Bookmarklet({ origin, token }: { origin: string; token: string | null }) {
  const link = useRef<HTMLAnchorElement>(null);
  const [status, setStatus] = useState<{ text: string; error?: boolean } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const code = token ? loader(`${origin}/fill.js?t=${token}`) : null;

  // React blocks javascript: URLs in href, so the bookmark's address is set on the element directly.
  useEffect(() => {
    if (code) link.current?.setAttribute("href", code);
  }, [code]);

  function make() {
    setConfirming(false);
    start(async () => {
      const r = await newFillToken();
      setStatus(r.error ? { text: r.error, error: true } : { text: token ? "New bookmarklet ready. Replace the old bookmark with it." : "Bookmarklet ready." });
    });
  }

  async function copy() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setStatus({ text: "Copied. Add a bookmark named HackOps fill and paste this as its URL." });
    } catch {
      setStatus({ text: "Copy didn't work in this browser. Drag the button instead.", error: true });
    }
  }

  const statusLine = (
    <p role="status" aria-live="polite" className="flex items-center gap-1.5 text-sm text-muted">
      {status?.error && <Icon name="warning-circle" size={16} className="text-text" />}
      <span className={status?.error ? "font-medium text-text" : ""}>{status?.text}</span>
    </p>
  );

  if (!code) {
    return (
      <div className="flex flex-col gap-3 rounded-[10px] border border-line bg-panel px-5 py-5">
        <p className="max-w-[62ch] text-[15px] leading-relaxed text-muted">Your bookmarklet carries a secret of your own, so it only ever fills your details and the team's. Make it once; make a new one if the bookmark ever leaks.</p>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={make} disabled={pending} className="min-h-10 rounded-md bg-rail px-4 text-sm font-semibold text-gold transition-colors hover:bg-rail-2 disabled:opacity-50">
            {pending ? "Making" : "Make the bookmarklet"}
          </button>
          {statusLine}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 rounded-[10px] border border-line bg-panel px-5 py-5">
      <div className="flex flex-wrap items-center gap-3">
        <a
          ref={link}
          onClick={(e) => {
            e.preventDefault();
            setStatus({ text: "Drag this button to the bookmarks bar; clicking it here does nothing." });
          }}
          draggable
          className="inline-flex min-h-11 cursor-grab items-center rounded-md border border-rail-line bg-rail px-4 font-display text-[17px] font-bold tracking-[0.05em] text-gold uppercase active:cursor-grabbing"
        >
          HackOps fill
        </a>
        <button type="button" onClick={copy} className="min-h-10 rounded-md border border-line px-3.5 text-sm font-semibold hover:border-line-strong">
          Copy bookmarklet
        </button>
      </div>

      <ol className="flex max-w-[62ch] list-decimal flex-col gap-1.5 pl-5 text-[15px] leading-relaxed marker:font-display marker:font-bold">
        <li>Drag <span className="font-semibold">HackOps fill</span> to the bookmarks bar, or copy it and paste it as a new bookmark's URL.</li>
        <li>On a registration page, click the bookmark and pick yourself, or team only.</li>
        <li>Check every outlined field, submit on the site yourself, then mark the hackathon Registered here.</li>
      </ol>

      <p className="max-w-[62ch] text-[13px] leading-relaxed text-muted">
        It fills name, email, organisation, GitHub, LinkedIn, T-shirt, dietary needs, team name and pitch, and never presses submit. HackOps has to be running on this computer, and the browser may ask to allow access to devices on your local network. Forms embedded in a frame from another site can&apos;t be reached: open the form on its own tab.
      </p>

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
        {confirming && (
          <button type="button" onClick={() => setConfirming(false)} className="min-h-10 rounded-md px-3 text-sm font-semibold text-muted hover:bg-panel-2 hover:text-text">
            Keep
          </button>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={() => (confirming ? make() : setConfirming(true))}
          className="min-h-10 rounded-md border border-line px-3.5 text-sm font-semibold hover:border-line-strong disabled:opacity-50"
        >
          {pending ? "Making" : confirming ? "Make a new one" : "New secret"}
        </button>
        {confirming ? <p className="text-[13px] text-muted">The bookmark you have now stops working.</p> : statusLine}
      </div>
    </div>
  );
}
