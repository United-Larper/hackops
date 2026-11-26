import { describe, expect, it } from "vitest";
import { matchField, type ProfileKey } from "./field-match";

// Hints as fill.js builds them: name, id, autocomplete, label, placeholder. Modelled on each platform's markup.
const samples: Record<string, [string, ProfileKey | null][]> = {
  devpost: [
    ["user[first_name] user_first_name given-name First name", "firstName"],
    ["user[last_name] user_last_name family-name Last name", "lastName"],
    ["user[email] user_email email Email", "email"],
    ["team[name] team_name Team name", "teamName"],
    ["user[github_url] GitHub profile https://github.com/username", "github"],
    ["user[password] Password", null],
    ["project[name] Project name", null],
  ],
  devfolio: [
    ["firstName First Name", "firstName"],
    ["lastName Last Name", "lastName"],
    ["linkedinProfile LinkedIn", "linkedin"],
    ["educationInstitution College or University", "organisation"],
    ["tShirtSize T-shirt size", "tshirt"],
    ["userName Username", null],
  ],
  luma: [
    ["name name Name", "fullName"],
    ["email email Email Address", "email"],
    ["Company / Organization", "organisation"],
    ["Dietary restrictions? Vegetarian, vegan, halal…", "dietary"],
    ["Emergency contact name", null],
  ],
  googleForm: [
    ["entry.1022 Full Name * Your answer", "fullName"],
    ["entry.1023 Email address * Your answer", "email"],
    ["entry.1024 Name of your university * Your answer", "organisation"],
    ["entry.1025 Tell us about your team (elevator pitch) Your answer", "pitch"],
    ["entry.1026 Any food allergies? Your answer", "dietary"],
    ["entry.1027 How did you hear about us? Your answer", null],
  ],
};

describe("matchField", () => {
  for (const [platform, cases] of Object.entries(samples)) {
    it(`matches ${platform} registration fields`, () => {
      for (const [hints, want] of cases) expect([hints, matchField(hints)]).toEqual([hints, want]);
    });
  }

  it("still works from its source text alone, as fill.js ships it", () => {
    const shipped = new Function(`return (${matchField.toString()})`)() as typeof matchField;
    expect(shipped("Team name")).toBe("teamName");
  });
});
