---
name: gsap-awwwards-sites
description: Use when the user wants a premium, Awwwards-calibre animated website, landing page, or one-page site with GSAP motion — built in Paul's (Bridgeway) house style. Derives a bespoke concept per brief (never one template), outputs a single self-contained index.html with Tailwind + GSAP 3.12 + ScrollTrigger, then verifies it renders. Not for plain CMS/SaaS UI or token-spec files.
version: 1.0.0
author: Bridgeway
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [gsap, web-design, landing-page, animation, scrolltrigger, tailwind, awwwards, bridgeway, html]
    related_skills: [claude-design, popular-web-designs, design-md]
---

# GSAP Awwwards-Calibre Sites (Bridgeway house style)

<!-- Live on Mac Hermes (~/.hermes/skills/creative/). Committed to Railway image source
     (Mrfocused1/hermes-cloud skills/creative/gsap-awwwards-sites). Reaches the live
     Railway bot only after the next image REBUILD — verify with /gsap-awwwards-sites. -->

## Overview

Build a single, self-contained `index.html` that looks and moves like an Awwwards site of the day: an immersive, scripted GSAP experience, not a static page with a few fades. This skill carries Bridgeway's **house vocabulary** (stack, palette posture, motion grammar, build/verify discipline) — but the **concept is derived fresh for every brief**. There is no fixed template; a charity, a streetwear drop, a barber, and a law firm should each get a different idea built from the same craftsmanship.

The deliverable is production-ready: one HTML file, all CDN, openable directly in a browser, with real copy and motion that degrades gracefully.

## When to Use

- "Build me a landing page / one-pager / site for X" where premium feel and motion matter
- A hero with scripted entrance, scroll-driven storytelling, a pinned/horizontal section
- Recreating the polish of a reference site without cloning it
- Pitch/demo sites, agency work, client one-pagers, portfolio pieces

**Don't use for:** plain dashboards or CRUD/SaaS UI (use `claude-design`), matching a specific named brand's exact system (`popular-web-designs`), or authoring a DESIGN.md token file (`design-md`). For multi-page apps, build the hero/marketing surface with this skill and the app shell elsewhere.

## Method (per brief — concept first, never a template)

1. **Read the brief for its ONE idea.** What single feeling or tension defines this brand? (heritage & restraint, raw energy, precision, warmth, luxury-quiet). Everything — palette, type, motion intensity — serves that idea. Completion: you can state the concept in one sentence before writing any HTML.
2. **Pick the posture, then break it if the brand demands.** The house defaults below are a starting vocabulary, not a cage. A streetwear or sports brief should reject cream-and-gold for something loud. Completion: palette + type + motion intensity chosen and justified by the concept.
3. **Plan 7+ distinct sections.** No repeated card grids. Each section earns its place and does something the others don't (reveal, parallax, pin, marquee, stat count, gallery, CTA). Completion: a section list exists, each with a different job.
4. **Write the file.** Single `index.html`, real copy in the brand's voice (no lorem). Completion: file written to disk, full document, no truncation.
5. **Verify it renders** (see Verification). Completion: file opened/screenshotted, no console errors, content visible even with motion stripped.
6. **Report** the path + concept + what to tweak. Keep it short.

## Tech Stack (mandatory — all CDN, one file)

```html
<script src="https://cdn.tailwindcss.com"></script>
<script>tailwind.config = { theme: { extend: { colors:{...}, fontFamily:{...} } } }</script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>
<!-- add MotionPathPlugin / SplitText only when the design uses them -->
<link href="https://fonts.googleapis.com/css2?family=...&display=swap" rel="stylesheet">
```

Always `gsap.registerPlugin(ScrollTrigger)` (and any other plugin) before use. Inline the Tailwind config — extend colours and fonts so utility classes carry the brand.

## Design Language (house vocabulary — adapt, don't copy verbatim)

- **Palette posture.** Default to either (a) near-black `#080808` with a metallic-gold gradient `#D4AF37 → #8a6531`, or (b) warm cream `#F5EFE6` with forest/sage + champagne. These read as "expensive and calm." **Override freely** when the brand is loud, playful, or technical — the concept wins, not the default.
- **Type pairing.** An elegant serif display (Cormorant Garamond, Cinzel, Playfair) with a clean sans (Manrope, Inter, Jost). For loud/streetwear briefs, a heavy display (Anton, Bebas Neue) instead. Use type as hierarchy before boxes or icons.
- **Film grain.** A fixed full-screen inline-SVG `feTurbulence` overlay, `opacity ~0.05`, `mix-blend-mode: overlay`, `pointer-events:none`. Adds analog depth.
- **Surface.** Generous whitespace, strong hierarchy, depth from soft shadows, fine hairline borders, and restrained gradients. Avoid AI-slop: no default glassmorphism, no rainbow gradients, no icon-soup feature grids, no fake dashboards.

## Motion Grammar (mandatory — immersive but controlled)

Motion must feel **fast and intentional** — restraint over flash. Every animation has a reason.

- **Scripted hero entrance on load.** A timeline, never a static hero: clip-path / curtain / door reveal + staggered text lift. Use `SplitText` or manual line-wrapping for the headline.
- **ScrollTrigger choreography.** Staggered reveals, `yPercent` parallax on backgrounds, hairline dividers that expand on scroll. At least **one special pinned section**: a pinned horizontal-scroll strip (`containerAnimation`, `ease:"none"`) or a pinned scrubbed scene.
- **Signature flourishes where they fit:** `mix-blend-mode: difference` fixed nav, `-webkit-text-stroke` outline headings, a marquee strip, count-up stat numbers, magnetic buttons, a `MotionPath` dot tracing an SVG route.
- **Easing & timing.** `power2/power3/power4.out` and `expo.inOut`. Tight staggers (`0.02–0.08`). `scrub: 1` for scroll-linked scenes. Don't mix `scrub` and `toggleActions` on the same trigger.
- **Pinned horizontal scroll** (the house signature) — the canonical shape:
  ```js
  const track = document.querySelector(".h-track");
  gsap.to(track, {
    xPercent: () => -100 * (track.children.length - 1) * (track.children[0].offsetWidth / window.innerWidth) /* or compute to scrollWidth */,
    ease: "none",
    scrollTrigger: { trigger: ".h-section", pin: true, scrub: 1, end: () => "+=" + track.scrollWidth }
  });
  ```
  Animate a child, not the pinned element; horizontal tween uses `ease:"none"`.

## Accessibility & Fail-Safes (non-negotiable)

- **Content visible by default.** Animations only ENHANCE. If a ScrollTrigger never fires, the content must still be readable.
- **The loader/curtain is the #1 blank-screen risk — it MUST self-dismiss without JS.** Any full-screen loader or curtain panel that covers content must lift via a CSS `@keyframes … forwards` animation (or a `setTimeout` removal), so a slow or failed GSAP CDN can NEVER leave it covering the page. GSAP then re-drives it for the polished version; the CSS is the guarantee, not the JS.
- **Never hide content with CSS that only JS can un-hide.** Reveal targets must either start visible, or be hidden by `gsap.set()` in the SAME `<script>` that animates them — so if that script never loads, nothing was hidden in the first place.
- **Do NOT patch a blank screen with `!important`.** Forcing `clip-path`/`opacity … !important` to make content visible beats GSAP's inline styles and silently KILLS the reveal animation. Fix the cause (loader self-dismiss + JS-applied hide) instead.
- **Force-reveal safety net.** Add a `window` `load` listener that force-reveals any reveal-targeted elements after ~3s (set opacity/transform to final, no `!important`), so nothing can be left stuck hidden by a missed trigger.
- **prefers-reduced-motion.** Wrap heavy motion in `gsap.matchMedia()` and reduce/disable it when the user prefers reduced motion; keep all content visible.
- **Mobile-first.** Responsive; simplify or drop heavy effects (pins, parallax) on small screens via `matchMedia("(min-width: 768px)")`.
- After any DOM/layout/font change that affects positions, call `ScrollTrigger.refresh()`.

```js
gsap.matchMedia().add({
  desktop: "(min-width: 768px)",
  reduce: "(prefers-reduced-motion: reduce)"
}, (ctx) => {
  const { desktop, reduce } = ctx.conditions;
  if (reduce) { gsap.set("[data-reveal]", { opacity: 1, y: 0 }); return; }
  // build hero timeline + ScrollTriggers here; desktop-only for pins/parallax
});
window.addEventListener("load", () => {
  setTimeout(() => gsap.set("[data-reveal]", { opacity: 1, y: 0, clearProps: "transform" }), 3000);
  ScrollTrigger.refresh();
});
```

## Content Discipline

Real, specific, compelling copy in the brand's voice — **no lorem ipsum, no invented metrics or fake testimonials.** Aim for 7+ unique sections with no repetition. If the brief lacks copy detail, write plausible draft copy and mark anything you invented so the user can correct it. If real images are supplied, use them as actual `<img>` sources (hero/about), prominently; otherwise use clean typographic/abstract placeholders, never stock-photo clichés.

## GLM-5.2 generation notes (when this agent's model is GLM)

- Disable reasoning for big generations — it is ~10x faster and avoids empty `content`: send `thinking: { type: "disabled" }` (raw API) and allow a large output (`max_tokens` ~32000). A rich 14-section site can take a few minutes; that's expected, let it finish.
- Output **only** the raw HTML — no markdown fences, no commentary. If a fence sneaks in, strip it before writing the file.

## Verification Checklist

- [ ] Concept stated in one sentence before building; palette/type/motion justified by it
- [ ] Single self-contained `index.html` written to disk, complete (no truncation)
- [ ] Tailwind + GSAP 3.12.5 + ScrollTrigger via CDN; plugins registered before use
- [ ] 7+ distinct sections, no repeated grids, real copy (no lorem / no fake stats)
- [ ] Scripted hero timeline on load + at least one pinned/scrubbed section
- [ ] Film-grain overlay present (unless concept rejects it)
- [ ] `gsap.matchMedia()` handles `prefers-reduced-motion` and mobile; pins desktop-only
- [ ] 3s load force-reveal net present; content readable with all motion stripped
- [ ] Horizontal tween (if any) uses `ease:"none"`; no `scrub`+`toggleActions` on one trigger
- [ ] Opened/screenshotted; no console errors; report gives path + concept + next tweak

## Common Pitfalls

1. **Shipping a template.** Reusing the same hero/sections regardless of brief. Derive the concept first; a charity and a streetwear drop must look different.
2. **Static hero.** No load timeline. The hero entrance is the house signature — always scripted.
3. **Content stuck hidden.** Reveal animations with no fail-safe → blank page if a trigger misfires. Always include the 3s force-reveal and reduced-motion path.
4. **Mixing `scrub` and `toggleActions`** on one ScrollTrigger (scrub silently wins), or forgetting `ease:"none"` on a `containerAnimation` horizontal tween (scroll desyncs).
5. **AI-slop visuals.** Default glassmorphism, rainbow gradients, icon-soup feature cards, fake dashboards. Choose intentionally; use type and space for hierarchy.
6. **Lorem / invented claims.** Always write real, brand-voiced copy; mark anything invented.
7. **Markdown fences in the file.** GLM may wrap output in ```html — strip before writing or the page won't render.
8. **No `ScrollTrigger.refresh()`** after fonts/images load → wrong trigger positions and broken pins.
