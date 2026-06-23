#!/usr/bin/env node
/**
 * clone-rebrand.mjs — deterministic everydayweb.site microsite builder.
 *
 * Clones an existing route from the everydaywebsite repo, rebrands it for a new
 * business (palette/fonts/copy/contacts/images via GLM, structure untouched),
 * fills every image slot, registers the route, and pushes to the default branch
 * (= live, via Vercel's own build). It deliberately does NOT build locally —
 * Vercel is the build gate — so it stays light enough for a small box.
 *
 * Node built-ins + fetch only (no npm deps). The agent runs this, then does the
 * screenshot QA + fix loop itself (see SKILL.md).
 *
 * Usage:
 *   node clone-rebrand.mjs --name "Joe's Barbers" --brief "<facts>" \
 *     [--slug joes-barbers] [--template industry-branding] \
 *     [--photos a.jpg,b.jpg] [--logo logo.png]
 *
 * Env: GLM_API_KEY (req), GLM_BASE_URL, GLM_MODEL, GITHUB_OWNER, TARGET_REPO,
 *      TARGET_BRANCH, GITHUB_TOKEN (optional), PEXELS_API_KEY (optional),
 *      HERMES_WORKDIR, SITE_BASE_URL, GIT_AUTHOR_NAME, GIT_AUTHOR_EMAIL.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, readFile, writeFile, cp, readdir, rename } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

const run = promisify(execFile);

const ENV = {
  glmKey: process.env.GLM_API_KEY,
  glmBase: process.env.GLM_BASE_URL || "https://api.z.ai/api/paas/v4",
  glmModel: process.env.GLM_MODEL || "glm-4.6",
  owner: process.env.GITHUB_OWNER || "Mrfocused1",
  repo: process.env.TARGET_REPO || "everydaywebsite",
  branch: process.env.TARGET_BRANCH || "main",
  token: process.env.GITHUB_TOKEN || "",
  pexels: process.env.PEXELS_API_KEY || "",
  workdir: process.env.HERMES_WORKDIR || path.join(homedir(), ".hermes", "cache", "everydayweb"),
  siteBase: (process.env.SITE_BASE_URL || "https://everydayweb.site").replace(/\/$/, ""),
  gitName: process.env.GIT_AUTHOR_NAME || "Mrfocused1",
  gitEmail: process.env.GIT_AUTHOR_EMAIL || "Mrfocused1@users.noreply.github.com",
};

const TEMPLATES = [
  {
    id: "industry-branding",
    vibe: "Bold and loud: Anton display + Inter, near-black #0e0e10 dark header, uppercase kinetic headlines, full-bleed image heroes, a vivid multi-colour accent bar, square markers (no pill badges), horizontal card-scroll on mobile.",
    keywords: ["print", "dtf", "garment", "t-shirt", "tshirt", "tee", "clothing", "apparel", "merch", "workwear", "uniform", "embroidery", "streetwear", "trade", "builder", "construction", "electrical", "plumbing", "scaffolding", "barber", "gym", "bold", "urban"],
    stockThemes: ["screen printing", "folded t-shirts", "clothing rack", "apparel workshop"],
  },
  {
    id: "connect-care",
    vibe: "Calm and premium: Fraunces serif + Inter, light/warm cream palette, a soft rainbow accent motif, rounded cards, chamfered image corners, an image-led hero with a gentle scrim, and a winding scroll-drawn 'storyline' connector.",
    keywords: ["care", "health", "clinic", "cqc", "consultancy", "consultant", "advisory", "professional", "services", "finance", "accountant", "legal", "law", "solicitor", "wellbeing", "therapy", "coaching", "education", "training", "nursery", "charity", "calm", "premium"],
    stockThemes: ["bright office meeting", "professional handshake", "modern clinic interior"],
  },
];

const HOUSE_STYLE = [
  "HOUSE STYLE — hard rules for everydayweb.site microsites:",
  "1. Heroes are image-led: every hero shows a real full-bleed image with the headline on a dark scrim — never a flat colour slab, never text-only, and visible on MOBILE.",
  "2. No pill/chip badges. Use accent-line labels (a coloured bar/square + uppercase text), bordered grids or dot lists.",
  "3. More than two stacked cards on mobile become a horizontal swipe carousel.",
  "4. Vary image edges (some chamfered/cut corners), not all the same rounded rectangle.",
  "5. Footers restrained: light surfaces + one near-black footer.",
  "6. Keep the cloned structure, GSAP behaviour and responsive rules. Rebrand palette/fonts/copy/contacts/imagery only — never re-engineer layout. Real brand-voice copy, never lorem ipsum.",
].join("\n");

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i += 2) a[argv[i].replace(/^--/, "")] = argv[i + 1];
  return a;
}

function slugify(s) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .replace(/['"`’]/g, "") // drop apostrophes so "Joe's" -> "joes"
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 40);
}
function derivePrefix(slug) {
  const w = slug.split("-").filter(Boolean);
  let p = w.length >= 2 ? w.slice(0, 3).map((x) => x[0]).join("") : (w[0] || "site").slice(0, 2);
  p = p.replace(/[^a-z]/g, "");
  if (p.length < 2) p = (p + "xx").slice(0, 2);
  return p.toUpperCase();
}
function pickTemplate(brief) {
  const t = brief.toLowerCase();
  let best = TEMPLATES[0], score = -1;
  for (const tpl of TEMPLATES) {
    const s = tpl.keywords.reduce((n, k) => (t.includes(k) ? n + 1 : n), 0);
    if (s > score) { best = tpl; score = s; }
  }
  return best;
}

async function walk(dir, out = []) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) await walk(abs, out); else out.push(abs);
  }
  return out;
}

async function glmRebrand({ kind, file, current, brief, context }) {
  const job =
    kind === "fix" ? "FIX the syntax/build error described in the brief. Change ONLY what is needed to make the file valid TSX that compiles; keep all copy, imports, structure and logic identical."
    : kind === "brand" ? "Brand/theme module (palette, fonts, contacts, nav, image map). Update every value to the new business; keep all exported names and shapes."
    : kind === "component" ? "Header/footer/form/layout component. Update labels, links and brand name only; keep structure and exported names."
    : "Page. Rewrite the visible COPY for the new business in its real voice; keep section structure, data-* attributes and component usage.";
  const system = [
    "You rebrand an existing, already-good Next.js + Tailwind + GSAP site by editing ONE file.",
    "Do NOT re-engineer layout or animation. Keep imports, exports, JSX structure, className patterns and data-* attributes. Never introduce lorem ipsum.",
    "", HOUSE_STYLE, "",
    "OUTPUT: ONLY the complete new file contents. No markdown fences, no commentary.",
  ].join("\n");
  const user = [`TASK: ${job}`, `FILE: ${file}`, `BUSINESS BRIEF / FACTS:\n${brief}`, `TEMPLATE & ASSET CONTEXT:\n${context}`, "", "CURRENT FILE:", current].join("\n");
  const res = await fetch(`${ENV.glmBase}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${ENV.glmKey}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(300000),
    body: JSON.stringify({ model: ENV.glmModel, messages: [{ role: "system", content: system }, { role: "user", content: user }], max_tokens: 16000, thinking: { type: "disabled" } }),
  });
  if (!res.ok) throw new Error(`GLM rebrand ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content ?? "";
  const fenced = raw.match(/```(?:tsx?|jsx?|ts|html)?\s*([\s\S]*?)```/i);
  return (fenced ? fenced[1] : raw).trim();
}

async function pexels(theme, count) {
  if (!ENV.pexels) throw new Error("PEXELS_API_KEY not set");
  const u = `https://api.pexels.com/v1/search?query=${encodeURIComponent(theme)}&per_page=${Math.min(count, 15)}&orientation=landscape`;
  const r = await fetch(u, { headers: { Authorization: ENV.pexels } });
  if (!r.ok) throw new Error(`Pexels ${r.status}`);
  const d = await r.json();
  const links = (d.photos || []).map((p) => p.src?.large2x || p.src?.large).filter(Boolean).slice(0, count);
  const out = [];
  for (const link of links) {
    const img = await fetch(link);
    if (img.ok) out.push(Buffer.from(await img.arrayBuffer()));
  }
  return out;
}

// ── Pre-push syntax gate ──────────────────────────────────────────────────
// Use esbuild's parser when available (a real gate); else fall back to
// dependency-free heuristics that catch the common small-model slips
// (stray backtick → odd backtick count, leftover fences, truncation).
async function loadEsbuild() {
  try { const m = await import("esbuild"); return m.transform ? m : (m.default ?? null); } catch { return null; }
}
async function checkSyntax(code, esbuild) {
  if (esbuild) {
    try { await esbuild.transform(code, { loader: "tsx" }); return null; }
    catch (e) { return String(e?.message || e).split("\n").find((l) => l.trim()) || "parse error"; }
  }
  if (code.includes("```")) return "leftover markdown code fence (```)";
  if (((code.match(/`/g) || []).length) % 2 !== 0) return "unbalanced backticks (likely a stray ` in a className template literal)";
  const t = code.trim();
  if (t.length < 40) return "file is suspiciously short (truncated GLM output?)";
  if (!/[}\);>]$/.test(t)) return "file does not end cleanly (truncated GLM output?)";
  return null;
}
async function glmFix(file, current, error) {
  return glmRebrand({ kind: "fix", file, current, brief: `BUILD/SYNTAX ERROR to fix: ${error}`, context: "Return the corrected, complete file. Fix only the error; keep everything else byte-for-byte where possible." });
}

async function main() {
  const dry = process.argv.includes("--dry");
  const args = parseArgs(process.argv.slice(2).filter((a) => a !== "--dry"));
  if (!ENV.glmKey && !dry) throw new Error("GLM_API_KEY required");
  if (!args.name && !args.slug) throw new Error("--name or --slug required");
  if (!args.brief && !dry) throw new Error("--brief required");

  const slug = args.slug ? slugify(args.slug) : slugify(args.name);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error(`bad slug: ${slug}`);
  const tpl = args.template ? (TEMPLATES.find((t) => t.id === args.template) || pickTemplate(args.brief)) : pickTemplate(args.brief);
  const newPrefix = derivePrefix(slug);
  const newKey = newPrefix.toLowerCase();
  const repoDir = path.join(ENV.workdir, ENV.repo);
  const abs = (r) => path.join(repoDir, r);
  const git = (a) => run("git", a, { cwd: repoDir, maxBuffer: 16 * 1024 * 1024 });
  const log = (m) => console.error(`[clone] ${m}`);

  // 1. prepare repo
  const url = ENV.token ? `https://${ENV.token}@github.com/${ENV.owner}/${ENV.repo}.git` : `https://github.com/${ENV.owner}/${ENV.repo}.git`;
  if (!existsSync(path.join(repoDir, ".git"))) {
    await mkdir(ENV.workdir, { recursive: true });
    await run("git", ["clone", "--depth", "1", url, repoDir], { maxBuffer: 16 * 1024 * 1024 });
  } else {
    await git(["remote", "set-url", "origin", url]);
    await git(["fetch", "--depth", "1", "origin", ENV.branch]);
    await git(["reset", "--hard", `origin/${ENV.branch}`]);
  }
  await git(["config", "user.name", ENV.gitName]);
  await git(["config", "user.email", ENV.gitEmail]);
  log(`repo ready; slug=${slug} template=${tpl.id}`);

  // 2. clone + deterministically rename the template route
  const srcDir = abs(path.join("src/app", tpl.id));
  const dstRel = path.join("src/app", slug);
  const dstDir = abs(dstRel);
  if (!existsSync(srcDir)) throw new Error(`template route missing: ${tpl.id}`);
  if (existsSync(dstDir)) throw new Error(`route exists: ${slug}`);
  await cp(srcDir, dstDir, { recursive: true });
  let files = (await walk(dstDir)).filter((f) => f.endsWith(".tsx"));

  let oldPrefix = "";
  for (const f of files) { const m = path.basename(f).match(/^([A-Z]{2,5})(?:Header|Footer|FX|Form)\.tsx$/); if (m) { oldPrefix = m[1]; break; } }
  let oldKey = "";
  for (const f of files) { const m = (await readFile(f, "utf8")).match(/\/marketing\/([a-z0-9-]+)\//); if (m && m[1] !== "printattack") { oldKey = m[1]; break; } }

  for (const f of files) {
    let s = await readFile(f, "utf8");
    s = s.replace(new RegExp(`/${tpl.id}\\b`, "g"), `/${slug}`);
    if (oldPrefix) s = s.replace(new RegExp(`\\b${oldPrefix}([A-Z][A-Za-z0-9]+)`, "g"), `${newPrefix}$1`);
    if (oldKey) s = s.replace(new RegExp(`/marketing/${oldKey}/`, "g"), `/marketing/${newKey}/`);
    s = s.replace(new RegExp(`/marketing/${tpl.id}-logo`, "g"), `/marketing/${slug}-logo`);
    await writeFile(f, s);
  }
  if (oldPrefix) {
    for (const f of files) {
      const m = path.basename(f).match(new RegExp(`^${oldPrefix}([A-Za-z0-9]+)\\.tsx$`));
      if (m) await rename(f, path.join(path.dirname(f), `${newPrefix}${m[1]}.tsx`));
    }
    files = (await walk(dstDir)).filter((f) => f.endsWith(".tsx"));
  }
  log("template cloned + renamed");

  // 3. fill every referenced image slot (user photos, else stock)
  const refRe = new RegExp(`/marketing/${newKey}/[A-Za-z0-9._-]+\\.(?:jpe?g|png|webp)`, "g");
  const refs = new Set();
  for (const f of files) for (const m of (await readFile(f, "utf8")).matchAll(refRe)) refs.add(m[0]);
  const refList = [...refs];
  log(`image slots: ${refList.length}`);

  let imageMode = "none";
  if (refList.length && !dry) {
    let pool = [];
    if (args.photos) {
      imageMode = "user-photos";
      for (const p of args.photos.split(",").map((x) => x.trim()).filter(Boolean)) pool.push(await readFile(p));
    } else {
      imageMode = "stock";
      for (const theme of tpl.stockThemes) {
        if (pool.length >= refList.length) break;
        try { pool.push(...(await pexels(theme, Math.ceil(refList.length / tpl.stockThemes.length) + 1))); } catch (e) { log(`stock '${theme}' failed: ${e.message}`); }
      }
    }
    if (!pool.length) throw new Error("no images to fill slots (send photos or set PEXELS_API_KEY)");
    for (let i = 0; i < refList.length; i++) {
      const dest = abs(path.join("public", refList[i]));
      await mkdir(path.dirname(dest), { recursive: true });
      await writeFile(dest, pool[i % pool.length]);
    }
  }
  if (args.logo && !dry) {
    const dest = abs(path.join("public/marketing", `${slug}-logo.png`));
    await mkdir(path.dirname(dest), { recursive: true });
    await writeFile(dest, await readFile(args.logo));
    log("logo written");
  }

  // 4. rebrand each file with GLM (structure preserved)
  const rel = (f) => path.relative(repoDir, f);
  const brand = files.find((f) => f.endsWith("brand.tsx"));
  const pages = files.filter((f) => f.endsWith("page.tsx"));
  const comps = files.filter((f) => /(?:Header|Footer|FX|Form|layout)\.tsx$/.test(path.basename(f)));
  if (dry) {
    console.log(JSON.stringify({ ok: true, dry: true, slug, template: tpl.id, oldPrefix, newPrefix, oldKey, newKey, routeDir: dstRel, imageSlots: refList, brand: brand && rel(brand), pages: pages.map(rel), components: comps.map(rel) }, null, 2));
    return;
  }
  const context = `${tpl.vibe}\nAvailable image paths (reference as-is): ${refList.join(", ")}\nLogo: /marketing/${slug}-logo.png`;
  const order = [...(brand ? [["brand", brand]] : []), ...comps.map((f) => ["component", f]), ...pages.map((f) => ["page", f])];
  for (const [kind, f] of order) {
    const current = await readFile(f, "utf8");
    const next = await glmRebrand({ kind, file: rel(f), current, brief: args.brief, context });
    if (next && next.length > 30) { await writeFile(f, next); log(`rebranded ${rel(f)}`); }
    else log(`skipped ${rel(f)} (empty GLM output)`);
  }

  // 4b. PRE-PUSH SYNTAX GATE: parse every generated file; GLM-fix any that fail.
  // Nothing is pushed unless all files are valid — main can never get broken code.
  const esbuild = await loadEsbuild();
  log(`syntax gate: ${esbuild ? "esbuild parser" : "heuristic (esbuild not installed)"}`);
  const broken = [];
  for (const f of (await walk(dstDir)).filter((x) => x.endsWith(".tsx"))) {
    let err = await checkSyntax(await readFile(f, "utf8"), esbuild);
    for (let pass = 0; err && pass < 2; pass++) {
      log(`syntax fix ${rel(f)} (pass ${pass + 1}): ${err.slice(0, 100)}`);
      const fixed = await glmFix(rel(f), await readFile(f, "utf8"), err);
      if (fixed && fixed.length > 30) await writeFile(f, fixed);
      err = await checkSyntax(await readFile(f, "utf8"), esbuild);
    }
    if (err) broken.push(`${rel(f)}: ${err.slice(0, 160)}`);
  }
  if (broken.length) {
    console.log(JSON.stringify({ ok: false, error: "syntax gate failed — not pushed; main untouched", files: broken }, null, 2));
    process.exit(1);
  }
  log("syntax gate passed");

  // 5. register the route in SiteChrome
  const chrome = abs("src/components/SiteChrome.tsx");
  if (existsSync(chrome)) {
    let s = await readFile(chrome, "utf8");
    if (!s.includes(`"/${slug}"`)) {
      s = s.replace(/(const BARE_PREFIXES = \[[^\]]*?)(\s*\];)/, `$1, "/${slug}"$2`);
      await writeFile(chrome, s);
      log("route registered");
    }
  }

  // 6. commit + push (= live via Vercel)
  await git(["add", "-A"]);
  await git(["commit", "-m", `feat: add ${args.name || slug} microsite at /${slug}`]);
  await git(["push", "origin", `HEAD:${ENV.branch}`]);
  const sha = (await git(["rev-parse", "HEAD"])).stdout.trim();

  const result = { ok: true, url: `${ENV.siteBase}/${slug}`, slug, template: tpl.id, commit: sha, imageMode, images: refList.length };
  console.log(JSON.stringify(result, null, 2));
}

// Exported for unit tests; only run the pipeline when invoked directly.
export { checkSyntax, loadEsbuild, slugify, derivePrefix, pickTemplate };

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => { console.log(JSON.stringify({ ok: false, error: e.message })); process.exit(1); });
}
