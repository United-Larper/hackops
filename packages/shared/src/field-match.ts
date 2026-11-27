/** A sign-up profile value a registration form field can ask for. */
export type ProfileKey =
  | "teamName" | "pitch" | "email" | "github" | "linkedin" | "portfolio" | "tshirt" | "dietary"
  | "organisation" | "firstName" | "lastName" | "fullName";

/**
 * Which profile value a form field asks for, judged from its hints (name, id, autocomplete, label text,
 * placeholder, joined into one string), or null when nothing fits.
 *
 * Keep it self-contained: the web app ships this function's source text inside fill.js, so the body may not
 * reference anything declared outside it.
 * ponytail: keyword rules in a fixed order, first match wins; the person reviews every outlined field before submitting.
 */
export function matchField(hints: string): ProfileKey | null {
  const h = hints.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase().replace(/[\s_\-.:[\]*?]+/g, " ");
  // Fields that mention a name or email but want someone else's, or nothing from the profile.
  if (/\b(emergency|parent|guardian|referr|reference|password|captcha|search|promo|coupon|project|hackathon)/.test(h)) return null;
  const rules: [ProfileKey | null, RegExp][] = [
    ["teamName", /\bteam ?name\b|\bname of (your|the) team\b/],
    ["pitch", /\bpitch\b|\bteam (description|bio)\b|\b(about|describe) (your|the) team\b/],
    ["email", /\be ?mail\b/],
    ["github", /\bgit ?hub\b/],
    ["linkedin", /\blinked ?in\b/],
    ["portfolio", /\bportfolio\b|\bpersonal (web ?site|site|page)\b/],
    ["tshirt", /\bt ?shirt|\bshirt\b|\btee size\b/],
    ["dietary", /\bdiet|\bfood\b|\ballerg|\bmeal/],
    ["organisation", /universit|college|\bschool|institut|organi[sz]ation|\borg\b|company|employer|affiliation|workplace/],
    ["firstName", /\bfirst ?name\b|\bgiven ?name\b|\bfname\b|\bforename/],
    ["lastName", /\blast ?name\b|\bfamily ?name\b|\bsurname\b|\blname\b/],
    [null, /\buser ?name\b|\bnick ?name\b/], // a handle, not the person's name
    ["fullName", /\bname\b/],
  ];
  for (const [key, re] of rules) if (re.test(h)) return key;
  return null;
}
