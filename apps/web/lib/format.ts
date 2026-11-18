/** Prize amounts in their own currency, whole units ("RM 30,000", "US$50,000"). */
export const money = (amount: number, currency: string | null) => {
  try {
    return new Intl.NumberFormat("en-MY", { style: "currency", currency: currency ?? "USD", maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency ?? ""} ${amount.toLocaleString("en-MY")}`.trim();
  }
};

export const ROLE_LABEL = { lead: "Lead", developer: "Developer", designer: "Designer", pitch: "Pitch" } as const;

/** A project's five links, in the order they're shown. */
export const PROJECT_LINKS = [
  { key: "repoUrl", label: "Repository", hint: "https://github.com/…" },
  { key: "demoUrl", label: "Live demo", hint: "https://…" },
  { key: "videoUrl", label: "Demo video", hint: "https://youtu.be/…" },
  { key: "slidesUrl", label: "Slides", hint: "https://…" },
  { key: "devpostUrl", label: "Submission page", hint: "https://devpost.com/software/…" },
] as const;
