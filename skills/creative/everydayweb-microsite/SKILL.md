---
name: everydayweb-microsite
description: Use when the user wants a new everydayweb.site client microsite (a business landing site at everydayweb.site/<their-name>) — e.g. "build a site for Joe's Barbers", "make Print Attack a website", or sends a business brief + product/logo photos. Clones an existing house-style template route, rebrands it (palette, fonts, copy, contacts, imagery) keeping structure/GSAP intact, fills every image, pushes live, then screenshot-verifies on mobile + desktop. Not for one-off standalone HTML pages (use gsap-awwwards-sites) or non-everydayweb sites.
version: 1.0.0
author: Bridgeway
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [everydayweb, microsite, clone, rebrand, nextjs, tailwind, gsap, bridgeway, web-design]
    related_skills: [gsap-awwwards-sites]
---

# everydayweb.site Microsite (clone-and-rebrand)

<!-- Live on Mac Hermes (~/.hermes/skills/creative/). To reach the 24/7 Railway bot it
     must also be committed to the Railway image source (Mrfocused1/hermes-cloud
     skills/creative/everydayweb-microsite/) and the image REBUILT. -->

## Overview

Build a new client microsite for **everydayweb.site** the way Bridgeway builds them by hand: **clone an existing, already-shipped template route, then rebrand it** — never design structure from scratch. The microsites all live inside ONE Next.js repo (`Mrfocused1/everydaywebsite`) as path routes (`/print-attack`, `/connect-care`…); a new site = a new route folder pushed to `main`, which Vercel builds and serves at `everydayweb.site/<slug>`.

Cloning is the whole point: structure, responsiveness and GSAP already work, so the model only changes palette, fonts, copy, contacts and imagery. That makes the result reliable on GLM and keeps every site on-brand. The deterministic clone + rebrand is done by a bundled script; **your job is to gather the brief, run the script, then verify and fix on screenshots.**

## When to Use

- "Build / make a website for <business>" that should live at everydayweb.site/<name>
- The user sends a business name + brief (services, location, contacts, voice) and optionally product photos + a logo
- "Add <business> to everydayweb", "do another one like Print Attack"

**Don't use for:** a standalone one-page HTML site (use `gsap-awwwards-sites`), a site on its own domain/repo, or editing an existing microsite's code by hand (just edit the route and push).

## Inputs to collect first

Before running anything, make sure you have (ask the user for what's missing):

1. **Business name** → becomes the slug (`Joe's Barbers` → `joes-barbers`).
2. **Brief / facts** — what they do, services, location/area, phone, email or "no email" (then contact = call/WhatsApp/Instagram), opening hours, social links, and any real copy or tone. Real facts only — never invent contact details.
3. **Images** — either the user's **photos** (products/team) OR none (then stock is fetched, which needs `PEXELS_API_KEY`). A **logo** if they have one.

Completion: you can state the business name, slug, the brief facts, and the image plan (photos vs stock) in one message before building.

## Build (run the bundled script)

The script clones the repo, picks the closest template, copies + renames the route deterministically, fills every image slot, GLM-rebrands each file, registers the route, and pushes to `main` (= live via Vercel). It does **not** build locally — Vercel is the build gate.

Run `scripts/clone-rebrand.mjs` from **this skill's own directory** (below is the local Mac agent path; on the Railway image it's the same `scripts/clone-rebrand.mjs` under the synced skills dir). Add `--dry` to preview the clone/rename plan without calling GLM or pushing.

```bash
node ~/.hermes/skills/creative/everydayweb-microsite/scripts/clone-rebrand.mjs \
  --name "Joe's Barbers" \
  --brief "Barbershop in Brentwood. Skin fades, beard trims, hot towel. Walk-ins + booking. Phone 01277 000000. Mon-Sat 9-7. Instagram @joesbarbers. Tone: sharp, local, confident." \
  [--slug joes-barbers] [--template industry-branding] \
  [--photos /abs/a.jpg,/abs/b.jpg] [--logo /abs/logo.png]
```

- Omit `--template` to auto-pick (bold `industry-branding` for trade/garment/streetwear; calm `connect-care` for care/professional/services). Override only if the auto-pick is wrong.
- Omit `--photos` to use stock (requires `PEXELS_API_KEY` in env; prefer the user's real photos when they exist).
- The script prints a JSON result: `{ ok, url, slug, template, commit, imageMode, images }`. Read it. On `ok:false`, fix the cause (usually a missing arg, no images available, or a push-auth problem) and rerun.

Completion: the script printed `ok:true` with a `url` and a `commit`.

## Video heroes (optional — lifestyle businesses only)

The templates' `PageHero` accepts an optional `video` prop: pass an mp4 and it
plays muted-looping behind the headline, with the hero image as poster/fallback
(reduced-motion users get the still). Use it ONLY for businesses Coverr has good
footage for — **gym, salon, spa, restaurant/café, hospitality, property, beauty,
fitness, wellness**. Do NOT use it for product or trade brands (printing, garments,
electrical, builders) — real product photos read better and Coverr has no fitting
footage; a generic stock clip there looks worse than an image.

To add one: fetch a landscape clip, then pass its path as `video` on the hero(s).
```bash
node <skill>/scripts/fetch-coverr.mjs --theme "boutique gym" \
  --out public/marketing/<key>/hero.mp4 --poster public/marketing/<key>/hero-poster.jpg
# then in the route's page, e.g.:  <PageHero ... img={IMG.heroX} video="/marketing/<key>/hero.mp4" />
```
The clip is ~2–3 MB (one per site, fine). If `fetch-coverr` returns `ok:false`
("no landscape clip"), the theme has no good footage — skip video, keep the image.

## Verify (you do this — GLM vision QA)

This is the quality gate. After the push, Vercel needs ~1–2 min to build.

1. **Wait for live.** Poll the `url` until it returns 200 (the page renders). If it still errors after ~3 min, Vercel's build likely failed — open the route's files, find the syntax/type error the rebrand introduced, fix, commit, push, wait again.
2. **Screenshot both widths.** Use your screenshot tool to capture the `url` at **mobile (~390px)** and **desktop (~1440px)**. A site is not done until you've SEEN it on mobile.
3. **Grade against the checklist** (below). Look at the screenshots; list every failure.
4. **Fix loop (cap 2 passes).** For each failure, edit the specific file in the cloned route (read it, patch it), commit, push, wait, re-screenshot. Keep changes minimal — never re-engineer layout.
5. **Escalate, don't ship broken.** If it still fails the checklist after 2 fix passes, STOP and tell the user exactly what's wrong with a screenshot — do not present a broken site as done.

### QA checklist (every item must pass on BOTH widths)
- [ ] Hero shows a visible background image (not blank/solid colour), readable headline.
- [ ] No clipped, overflowing, or overlapping text.
- [ ] All images loaded — no blank grey boxes or broken-image icons.
- [ ] Mobile is single-column; nothing cut off horizontally.
- [ ] No template leftovers (old brand name, placeholder copy, lorem ipsum).
- [ ] Layout matches the template's structure (no collapsed/broken sections).

Completion: every checkbox passes on mobile and desktop, or you've escalated with specifics.

## Report

Reply short: the live URL, which template was used, the image mode (their photos / stock), and anything you invented or that needs their input (e.g. "no email given — I wired contact to call + Instagram; send an email to add it").

## House style (the rebrand obeys these — enforce them in QA too)

1. Heroes are **image-led**: full-bleed image + headline on a dark scrim, never a flat colour slab, never text-only, and visible on mobile.
2. **No pill/chip badges** — use accent-line labels (a coloured bar/square + uppercase text), bordered grids, or dot lists.
3. **>2 stacked cards on mobile** → a horizontal swipe carousel, never a long vertical stack.
4. **Vary image edges** (some chamfered/cut corners), not all identical rounded rectangles.
5. **Restrained footers** — light surfaces plus one near-black footer.
6. Keep cloned **structure + GSAP + responsiveness**; change only palette, fonts, copy, contacts, imagery. **Real brand-voice copy, never lorem ipsum.**

## Common Pitfalls

1. **Inventing contact details.** If the user gives no email, wire contact to call/WhatsApp/Instagram — never fabricate an address or phone.
2. **Shipping unseen on mobile.** The hardest failures (overflow, blank hero, broken cards) only show at ~390px. Always screenshot mobile before declaring done.
3. **Re-engineering layout.** The template already works. Rebranding means copy/brand/colour/images only — if you're rewriting JSX structure or GSAP, stop.
4. **Stock with no key.** `--photos` absent + no `PEXELS_API_KEY` = no images. Ask for photos or set the key; don't push a site with empty image slots.
5. **Declaring done on a failed Vercel build.** A 200 from the URL is the real gate, not the push succeeding. Poll the URL; if it errors, the rebrand broke the build — fix it.
6. **Skipping the escalation valve.** After 2 fix passes that still fail QA, escalate with a screenshot. Never present broken as finished.

## Verification Checklist

- [ ] Brief, slug, and image plan stated before building
- [ ] Script run; printed `ok:true` with a `url` + `commit`
- [ ] URL polled to a 200 (Vercel build succeeded)
- [ ] Screenshotted at mobile (~390px) AND desktop (~1440px)
- [ ] Every QA-checklist item passes on both widths (or escalated with specifics)
- [ ] Report gives live URL, template, image mode, and anything invented / needing input
