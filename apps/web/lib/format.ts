/** Prize amounts in their own currency, whole units ("RM 30,000", "US$50,000"). */
export const money = (amount: number, currency: string | null) => {
  try {
    return new Intl.NumberFormat("en-MY", { style: "currency", currency: currency ?? "USD", maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency ?? ""} ${amount.toLocaleString("en-MY")}`.trim();
  }
};

export const ROLE_LABEL = { lead: "Lead", developer: "Developer", designer: "Designer", pitch: "Pitch" } as const;
