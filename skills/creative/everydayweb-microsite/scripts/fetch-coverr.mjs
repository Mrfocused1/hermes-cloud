#!/usr/bin/env node
/**
 * fetch-coverr.mjs — download a LANDSCAPE Coverr clip (+ poster) for a hero video.
 *
 * The microsite templates' PageHero accepts an optional `video` prop (with the
 * image as poster/fallback). Use this to grab a fitting clip, then pass its path
 * as that `video` prop. Only worth it for businesses Coverr actually covers well
 * (fitness, food, beauty, hospitality, property, lifestyle) — NOT product/trade
 * brands, where real photos read better (Coverr has no garment-printing footage).
 *
 * Node built-ins + fetch only. Env: COVERR_API_KEY.
 * Usage:
 *   node fetch-coverr.mjs --theme "boutique gym" \
 *     --out public/marketing/<key>/hero.mp4 [--poster public/marketing/<key>/hero-poster.jpg]
 */
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const a = process.argv.slice(2);
const args = {};
for (let i = 0; i < a.length; i += 2) args[a[i].replace(/^--/, "")] = a[i + 1];
const KEY = process.env.COVERR_API_KEY;

async function main() {
  if (!KEY) throw new Error("COVERR_API_KEY not set");
  if (!args.theme || !args.out) throw new Error("--theme and --out are required");

  const url = `https://api.coverr.co/videos?query=${encodeURIComponent(args.theme)}&page_size=15&urls=true`;
  const data = await fetch(url, { headers: { Authorization: `Bearer ${KEY}` } }).then((r) => r.json());
  const hit = (data.hits || []).find((h) => !h.is_vertical && h.urls?.mp4);
  if (!hit) throw new Error(`no landscape Coverr clip found for "${args.theme}"`);

  await mkdir(path.dirname(args.out), { recursive: true });
  const mp4 = await fetch(hit.urls.mp4);
  if (!mp4.ok) throw new Error(`mp4 download failed (${mp4.status})`);
  await writeFile(args.out, Buffer.from(await mp4.arrayBuffer()));

  if (args.poster && hit.poster) {
    try {
      const pr = await fetch(hit.poster);
      if (pr.ok) { await mkdir(path.dirname(args.poster), { recursive: true }); await writeFile(args.poster, Buffer.from(await pr.arrayBuffer())); }
    } catch { /* poster is optional */ }
  }

  console.log(JSON.stringify({ ok: true, title: hit.title, mp4: args.out, poster: args.poster || null, credit: `Video via Coverr — “${hit.title}”` }, null, 2));
}

main().catch((e) => { console.log(JSON.stringify({ ok: false, error: e.message })); process.exit(1); });
