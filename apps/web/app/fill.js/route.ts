import { matchField, type ProfileKey, type SignupProfileDto } from "@hackops/shared";

/**
 * The sign-up bookmarklet's script. The bookmarklet is a one-line loader that injects this from the local web app,
 * so changes here reach it without re-installing. It fills fields for a person to review and never submits.
 */
export function GET() {
  const body = `(${fill})((${matchField}));`;
  return new Response(body, { headers: { "content-type": "text/javascript; charset=utf-8", "cache-control": "no-store" } });
}

/**
 * Runs on the registration page. Shipped as source text, so it may only use its arguments and browser globals.
 * Everything it shows goes through textContent: names and errors come from outside this page.
 */
function fill(match: (hints: string) => ProfileKey | null) {
  // The profile comes from the same HackOps address this script did, which passes it on to the API.
  const src = new URL((document.currentScript as HTMLScriptElement).src);
  const token = src.searchParams.get("t") ?? "";
  document.getElementById("hackops-fill")?.remove();

  const host = document.createElement("div");
  host.id = "hackops-fill";
  const root = host.attachShadow({ mode: "open" });
  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, text = "", parent: Node = panel) => {
    const e = document.createElement(tag);
    e.textContent = text;
    parent.appendChild(e);
    return e;
  };
  const panel = document.createElement("section");
  panel.setAttribute("aria-label", "HackOps fill");
  root.appendChild(panel);
  el("style").textContent = `
    :host { all: initial; }
    section { position: fixed; top: 16px; right: 16px; z-index: 2147483647; width: min(320px, calc(100vw - 32px)); box-sizing: border-box;
      background: #0e0e0c; color: #d4d4cc; border: 1px solid #2c2c28; border-radius: 10px; padding: 14px 16px 16px;
      font: 400 14px/1.45 Barlow, system-ui, sans-serif; }
    h2 { margin: 0 32px 6px 0; color: #f4c21b; font: 700 17px/1.2 "Barlow Condensed", "Arial Narrow", system-ui, sans-serif; letter-spacing: .05em; text-transform: uppercase; }
    p { margin: 0 0 10px; }
    .who { display: flex; flex-direction: column; gap: 6px; }
    button { font: 600 14px/1.2 Barlow, system-ui, sans-serif; min-height: 40px; border-radius: 6px; cursor: pointer; text-align: left; padding: 8px 12px;
      background: #1b1b18; color: #f4f4f1; border: 1px solid #2c2c28; }
    button:hover { background: #2c2c28; }
    button:focus-visible { outline: 2px solid #f4c21b; outline-offset: 2px; }
    .close { position: absolute; top: 8px; right: 8px; min-height: 32px; padding: 4px 8px; background: none; border: 0; color: #8f8f87; }
    .close:hover { color: #f4f4f1; background: none; }`;
  el("h2", "HackOps fill");
  const close = el("button", "Close");
  close.className = "close";
  close.type = "button";
  close.onclick = () => host.remove();
  const status = el("p", "Loading the team's sign-up profile…");
  status.setAttribute("role", "status");
  const who = el("div");
  who.className = "who";
  root.addEventListener("keydown", (e) => (e as KeyboardEvent).key === "Escape" && host.remove());
  document.documentElement.appendChild(host);

  fetch(`${src.origin}/signup-profile?token=${encodeURIComponent(token)}`)
    .then(async (res) => {
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.message ?? `HackOps answered ${res.status}.`);
      return body as SignupProfileDto;
    })
    .then((profile) => {
      status.textContent = "Who is filling this form?";
      for (const m of [profile.member, null]) {
        const b = el("button", m ? m.name : `Team only (${profile.team.name})`, who);
        b.type = "button";
        b.onclick = () => run(profile, m);
      }
      (who.firstElementChild as HTMLButtonElement | null)?.focus();
    })
    .catch((e: unknown) => {
      status.textContent = e instanceof TypeError
        ? "Can't reach HackOps on this computer. Start it with pnpm dev, and allow local network access if the browser asks."
        : (e as Error).message;
    });

  function run(profile: SignupProfileDto, m: SignupProfileDto["member"] | null) {
    const [first, ...rest] = (m?.name ?? "").trim().split(/\s+/);
    const values: Partial<Record<ProfileKey, string | null>> = { teamName: profile.team.name, pitch: profile.team.pitch };
    if (m) {
      // ponytail: first word is the first name, the rest the last name; the person fixes it in review if not.
      Object.assign(values, {
        fullName: m.name, firstName: first, lastName: rest.join(" ") || null, email: m.email, organisation: m.organisation,
        github: m.githubUrl, linkedin: m.linkedinUrl, portfolio: m.portfolioUrl, tshirt: m.tshirtSize, dietary: m.dietary,
      });
    }
    const text = (id: string) => document.getElementById(id)?.textContent ?? "";
    let filled = 0;
    for (const f of document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input, textarea, select")) {
      if (f instanceof HTMLInputElement && !["text", "email", "url", "tel"].includes(f.type)) continue;
      if (f.disabled || ("readOnly" in f && f.readOnly) || f.value !== "" || f.getClientRects().length === 0) continue;
      const hints = [
        f.name, f.id, f.getAttribute("autocomplete"), f.getAttribute("aria-label"), "placeholder" in f ? f.placeholder : "",
        ...[...(f.labels ?? [])].map((l) => l.textContent), ...(f.getAttribute("aria-labelledby") ?? "").split(/\s+/).map(text),
      ].join(" ");
      const key = match(hints);
      let value = key && values[key];
      if (!value) continue;
      if (f instanceof HTMLSelectElement) {
        const want = value.toLowerCase();
        // ponytail: exact option match only ("M", not "Medium"); unmatched selects stay for the person.
        const opt = [...f.options].find((o) => o.value.toLowerCase() === want || o.text.trim().toLowerCase() === want);
        if (!opt) continue;
        value = opt.value;
      } else if (f.maxLength > 0 && value.length > f.maxLength) continue; // never cut a pitch short silently
      // The prototype's setter, so React and Vue forms see the change.
      Object.getOwnPropertyDescriptor(Object.getPrototypeOf(f), "value")?.set?.call(f, value);
      f.dispatchEvent(new Event("input", { bubbles: true }));
      f.dispatchEvent(new Event("change", { bubbles: true }));
      f.style.setProperty("box-shadow", "0 0 0 2px #0e0e0c, 0 0 0 5px #f4c21b", "important");
      filled++;
    }
    status.textContent = filled
      ? `Filled ${filled} field${filled === 1 ? "" : "s"} for ${m?.name ?? profile.team.name}. Each one is outlined: check it, then submit on this site yourself and mark the hackathon Registered in HackOps.`
      : "Nothing on this page matched the profile. If the form sits inside a frame, open the form on its own tab and try again.";
  }
}
