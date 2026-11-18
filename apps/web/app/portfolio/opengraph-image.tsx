import { ImageResponse } from "next/og";
import type { PortfolioDto } from "@hackops/shared";
import { api } from "@/lib/api";

export const alt = "The team's hackathon portfolio: projects, results and who built them";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Barlow Condensed for the card. next/og can't read next/font's woff2, so ask Google Fonts for a TTF.
 * ponytail: fetched per render with the default face as the offline fallback; ship a TTF in the repo if previews must work offline.
 */
async function condensed(): Promise<ArrayBuffer | null> {
  try {
    const css = await (await fetch("https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@800", { cache: "force-cache" })).text();
    const url = css.match(/src: url\((.+?)\) format\('(?:truetype|opentype)'\)/)?.[1];
    return url ? await (await fetch(url, { cache: "force-cache" })).arrayBuffer() : null;
  } catch {
    return null;
  }
}

export default async function Image() {
  const [font, data] = await Promise.all([condensed(), api<PortfolioDto>("/portfolio").catch(() => null)]);
  // Only real entries count toward the tally: sample (demo) results are never presented as real.
  const entries = (data?.entries ?? []).filter((e) => !e.sample);
  const count = (r: string) => entries.filter((e) => e.result === r).length;
  const projects = [...new Set(entries.map((e) => e.project?.name).filter(Boolean))].slice(0, 3) as string[];
  const tally = entries.length
    ? [`${entries.length} ${entries.length === 1 ? "entry" : "entries"}`, count("won") && `${count("won")} won`, count("finalist") && `${count("finalist")} finalist`]
        .filter(Boolean)
        .join("  ·  ")
    : data?.entries.length
      ? "Sample entries only: demo data"
      : "No entries yet";

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#0e0e0c", color: "#f4f4f1", padding: "64px 72px", fontFamily: font ? "Barlow Condensed" : undefined }}>
        <div style={{ display: "flex", fontSize: 34, fontWeight: 800, letterSpacing: "0.02em" }}>
          <span style={{ color: "#f4c21b" }}>HACK</span>OPS
        </div>
        <div style={{ display: "flex", marginTop: "auto", fontSize: 96, fontWeight: 800, lineHeight: 0.95 }}>{data?.team?.name ?? "Hackathon portfolio"}</div>
        <div style={{ display: "flex", marginTop: 18, fontSize: 40, fontWeight: 800, color: "#f4c21b" }}>{projects.join("  /  ") || "Projects, results and who built them"}</div>
        <div style={{ display: "flex", marginTop: 28, paddingTop: 22, borderTop: "2px solid #2c2c28", fontSize: 30, color: "#d4d4cc" }}>{tally}</div>
      </div>
    ),
    { ...size, fonts: font ? [{ name: "Barlow Condensed", data: font, weight: 800, style: "normal" }] : undefined },
  );
}
