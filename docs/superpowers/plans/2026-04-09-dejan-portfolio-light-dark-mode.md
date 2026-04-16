# Dejan Portfolio — Light + Dark Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Switch the default background of `waruna-dev-portfolio-dejan.html` to a near-white `#fdfdfc` and add a manual dark mode toggle in the header pill, with localStorage persistence and FOUC-free first-paint behavior.

**Architecture:** Single static HTML file. CSS custom properties on `:root` provide the light defaults; `:root[data-theme="dark"]` overrides them. An inline `<head>` script reads `localStorage` and sets the `data-theme` attribute before first paint to prevent flash. A button in the floating header pill toggles the attribute, persists the choice, and swaps sun/moon icons via CSS-only `display` rules.

**Tech Stack:** Plain HTML, CSS custom properties, vanilla JS. No build step. No dependencies. Validation via Playwright MCP browser tools.

**Spec:** `docs/superpowers/specs/2026-04-09-dejan-portfolio-light-dark-mode-design.md`

**Project conventions to honor:**
- The file uses minified-style CSS (single-line declarations, no semicolon spacing). Match this style for any new CSS so the file stays consistent.
- The existing `<script>` block uses ES5-style `function(){}` and `var` (not arrow functions or `let`/`const`). Match this style.
- No build step exists. Edits go directly into `waruna-dev-portfolio-dejan.html` and are validated by opening the file in a browser.

---

## File Structure

**Single file modified:** `waruna-dev-portfolio-dejan.html`

No new files. No deletions. All changes are additions or in-place modifications inside the existing `<head>`, `<style>`, `<header>`, and `<script>` blocks.

**Why single file:** This is a one-page static site. The spec explicitly limits scope to this one variant. No shared CSS or JS exists across portfolio variants — each is self-contained.

---

## Validation approach (no unit test framework)

This project has no test framework. "Tests" in this plan mean **direct browser validation via the Playwright MCP browser tools**: navigating to `file:///Users/waruna/Projects/PersonalWebSite/waruna-dev-portfolio-dejan.html`, taking screenshots, evaluating JS in the page, and clicking the toggle. Each task ends with a concrete validation step you must run before committing.

When the plan says "open the file" it means using `mcp__plugin_playwright_playwright__browser_navigate` with the absolute `file://` URL above.

When the plan says "evaluate in page" it means using `mcp__plugin_playwright_playwright__browser_evaluate` with a JS expression.

---

## Task 1: Restructure CSS color tokens (light defaults + dark override block)

**Files:**
- Modify: `waruna-dev-portfolio-dejan.html` lines 12-23 (the `:root` block)

**Why first:** Everything else depends on the new tokens existing. After this task, the page should look subtly different (new lighter background) but still work in light mode only — no toggle yet.

- [ ] **Step 1: Read the current `:root` block to confirm exact line numbers**

Use the Read tool on `waruna-dev-portfolio-dejan.html` lines 12-23. Confirm the block matches:

```css
:root{
  --bg:#f8f7f4;
  --bg-alt:#efede8;
  --text:#1a1a1a;
  --text-secondary:#5a5a5a;
  --text-tertiary:#8a8a8a;
  --accent:#1a1a1a;
  --border:#e0ddd6;
  --radius:12px;
  --sans:'Instrument Sans',system-ui,sans-serif;
  --serif:'Newsreader',Georgia,serif;
}
```

If line numbers have shifted (because earlier tasks were already applied), search for `--bg:#f8f7f4` to relocate it.

- [ ] **Step 2: Replace the `:root` block with the new light defaults + dark override**

Use the Edit tool to replace the entire `:root` block above with:

```css
:root{
  --bg:#fdfdfc;
  --bg-alt:#f4f3ef;
  --text:#1a1a1a;
  --text-secondary:#5a5a5a;
  --text-tertiary:#8a8a8a;
  --accent:#1a1a1a;
  --border:#e8e6e0;
  --radius:12px;
  --sans:'Instrument Sans',system-ui,sans-serif;
  --serif:'Newsreader',Georgia,serif;
}
:root[data-theme="dark"]{
  --bg:#141413;
  --bg-alt:#1c1c1a;
  --text:#f0eeea;
  --text-secondary:#a8a6a0;
  --text-tertiary:#6e6c66;
  --accent:#f0eeea;
  --border:#2a2a27;
}
```

- [ ] **Step 3: Validate the page still renders in light mode with the new background**

Open `file:///Users/waruna/Projects/PersonalWebSite/waruna-dev-portfolio-dejan.html` in the Playwright browser. Take a full-page screenshot. The background should now be a slightly brighter near-white (`#fdfdfc`) instead of the previous warm cream (`#f8f7f4`). The change is subtle but visible if you compare screenshots.

Evaluate in page:
```js
getComputedStyle(document.body).backgroundColor
```
Expected: `rgb(253, 253, 252)`

- [ ] **Step 4: Commit**

```bash
git add waruna-dev-portfolio-dejan.html
git commit -m "Restructure dejan portfolio CSS tokens for light/dark theming

Switches light-mode background from warm cream (#f8f7f4) to near-white
(#fdfdfc), adjusts --bg-alt and --border to match, and adds a
:root[data-theme=\"dark\"] override block with the dark palette. Other
tokens unchanged."
```

---

## Task 2: Add FOUC-prevention inline script in `<head>`

**Files:**
- Modify: `waruna-dev-portfolio-dejan.html` (insert just before line 10, the opening `<style>` tag)

**Why now:** The dark token block exists but nothing applies the `data-theme` attribute yet. Adding the FOUC script means dark mode will activate immediately for any user who has `theme-dejan=dark` in localStorage — even before the toggle button exists. This lets us validate the dark palette in isolation by manually setting localStorage in the browser.

- [ ] **Step 1: Insert the FOUC script before the `<style>` tag**

Use the Edit tool. Find this exact text:

```html
<link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=Newsreader:ital,wght@0,300;0,400;0,500;1,300;1,400&display=swap" rel="stylesheet">
<style>
```

Replace with:

```html
<link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=Newsreader:ital,wght@0,300;0,400;0,500;1,300;1,400&display=swap" rel="stylesheet">
<script>
(function(){
  try {
    if (localStorage.getItem('theme-dejan') === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  } catch (e) {}
})();
</script>
<style>
```

- [ ] **Step 2: Validate light mode is still the default on a fresh load**

In the Playwright browser, clear storage first then navigate fresh:
```js
// browser_evaluate
localStorage.clear()
```
Then navigate to `file:///Users/waruna/Projects/PersonalWebSite/waruna-dev-portfolio-dejan.html`.

Evaluate in page:
```js
document.documentElement.getAttribute('data-theme')
```
Expected: `null`

Background should still be `rgb(253, 253, 252)` (light).

- [ ] **Step 3: Validate dark mode activates when localStorage is set**

Evaluate in page:
```js
localStorage.setItem('theme-dejan', 'dark')
```
Then trigger a full reload via `browser_evaluate`:
```js
location.reload()
```
(This guarantees a real reload through the FOUC script — more reliable than re-navigating to the same URL, which some browser contexts may treat as a no-op.)

Evaluate in page:
```js
document.documentElement.getAttribute('data-theme')
```
Expected: `"dark"`

Evaluate in page:
```js
getComputedStyle(document.body).backgroundColor
```
Expected: `rgb(20, 20, 19)`

Take a full-page screenshot. Verify:
- Background is the warm near-black `#141413`
- Body text is the warm off-white `#f0eeea`
- Experience section background (`--bg-alt`) is `#1c1c1a` — slightly elevated from the main bg
- Project tags and `other-card` borders use `--border:#2a2a27`

**Known issue at this point:** The `<header>` will look wrong in dark mode — its background is still hardcoded `rgba(255,255,255,.55)` so it appears as a bright white pill on a dark page. The `::selection`, `header:hover`, `.nav-links a:hover`, and `.other-card:hover` styles also still reference hardcoded light-mode values. This is expected. Task 3 fixes it.

Reset for the next task:
```js
localStorage.clear()
```

- [ ] **Step 4: Commit**

```bash
git add waruna-dev-portfolio-dejan.html
git commit -m "Add FOUC-prevention script for dejan portfolio dark mode

Reads localStorage 'theme-dejan' synchronously in <head> before any
CSS loads, and sets data-theme=\"dark\" on <html> if needed. The
try/catch silently falls back to light mode if localStorage is
unavailable (private browsing, disabled storage)."
```

---

## Task 3: Fix hardcoded colors that bypass the token system

**Files:**
- Modify: `waruna-dev-portfolio-dejan.html` lines 31, 49-67, 83, 274 (and add new dark-mode override rules)

**Why now:** The dark palette is wired up but several elements use hardcoded `rgba()` values that don't flip with the theme. After this task, dark mode is visually complete — the only thing missing is the toggle button itself.

- [ ] **Step 1: Replace the `::selection` rule to use tokens**

Find this line (currently around line 31):
```css
::selection{background:#1a1a1a;color:#f8f7f4}
```

Replace with:
```css
::selection{background:var(--text);color:var(--bg)}
```

- [ ] **Step 2: Add a body transition for smooth theme swap**

Find the `body` block (currently around lines 25-29):
```css
body{
  font-family:var(--sans);background:var(--bg);color:var(--text);
  line-height:1.6;-webkit-font-smoothing:antialiased;
  text-rendering:optimizeLegibility;
}
```

Replace with:
```css
body{
  font-family:var(--sans);background:var(--bg);color:var(--text);
  line-height:1.6;-webkit-font-smoothing:antialiased;
  text-rendering:optimizeLegibility;
  transition:background-color .2s ease,color .2s ease;
}
```

- [ ] **Step 3: Add dark-mode overrides for the header, nav hover, and other-card hover**

Find this exact text (the `@media(max-width:768px)` block — we'll insert directly above it):

```css
@media(max-width:768px){
```

Replace with:

```css
/* Dark mode overrides for hardcoded colors */
:root[data-theme="dark"] header{
  background:rgba(20,20,19,.55);
  border:1px solid rgba(255,255,255,.08);
  box-shadow:
    0 1px 3px rgba(0,0,0,.3),
    0 8px 24px rgba(0,0,0,.4),
    inset 0 1px 0 rgba(255,255,255,.05);
}
:root[data-theme="dark"] header:hover{
  background:rgba(20,20,19,.65);
  box-shadow:
    0 1px 3px rgba(0,0,0,.4),
    0 12px 32px rgba(0,0,0,.5),
    inset 0 1px 0 rgba(255,255,255,.08);
}
:root[data-theme="dark"] .nav-links a:hover{background:rgba(255,255,255,.05)}
:root[data-theme="dark"] .other-card:hover{box-shadow:0 4px 12px rgba(0,0,0,.4)}
:root[data-theme="dark"] .logo-avatar{border:1px solid rgba(255,255,255,.08)}

@media(max-width:768px){
```

(The `.logo-avatar` border override is added because the existing `border:1px solid rgba(0,0,0,.06)` is invisible against the dark header background. A subtle white border keeps the avatar circle defined.)

- [ ] **Step 4: Validate dark mode now looks correct end-to-end**

In the Playwright browser:
```js
localStorage.setItem('theme-dejan', 'dark')
```
Navigate to `file:///Users/waruna/Projects/PersonalWebSite/waruna-dev-portfolio-dejan.html` (full reload).

Take a full-page screenshot. Check:
- Header pill is now a translucent dark `rgba(20,20,19,.55)`, not bright white
- Header pill border is barely-visible warm white at 8% opacity
- Hovering a nav link should show a subtle white-tint pill (test by hovering with `browser_hover`)
- The avatar circle in the logo has a faint border (visible against the dark pill)
- Selection: select some hero text and verify selection background is warm off-white (`--text:#f0eeea`) and the selected text is dark (`--bg:#141413`)
- Scroll down to the "Other Work" cards. Hover one — the box shadow should be visible (test by taking a screenshot during hover)

Evaluate in page to spot-check the header background:
```js
getComputedStyle(document.querySelector('header')).backgroundColor
```
Expected: `rgba(20, 20, 19, 0.55)`

Reset:
```js
localStorage.clear()
```
Reload and verify the page returns to light mode and looks correct.

- [ ] **Step 5: Commit**

```bash
git add waruna-dev-portfolio-dejan.html
git commit -m "Add dark-mode overrides for hardcoded colors in dejan portfolio

The header glass pill, nav hover, other-card hover, and logo avatar
border all used hardcoded light-mode rgba values that didn't flip with
the theme. Adds :root[data-theme=\"dark\"] override blocks for each.
Also switches ::selection to use tokens and adds a 200ms body
transition so the theme swap feels smooth."
```

---

## Task 4: Add the toggle button HTML and styles

**Files:**
- Modify: `waruna-dev-portfolio-dejan.html` — add HTML inside `.nav-links`, add CSS for the button, both icons

**Why now:** Dark mode looks correct when forced via localStorage. Now we need the user-facing way to switch.

- [ ] **Step 1: Add the toggle button HTML inside `.nav-links`**

Find this exact text (currently around lines 296-300):

```html
    <nav class="nav-links">
      <a href="#projects">Projects</a>
      <a href="#experience">Experience</a>
      <a href="#contact">Contact</a>
    </nav>
```

Replace with:

```html
    <nav class="nav-links">
      <a href="#projects">Projects</a>
      <a href="#experience">Experience</a>
      <a href="#contact">Contact</a>
      <button class="theme-toggle" id="themeToggle" type="button" aria-label="Switch to dark mode" aria-pressed="false">
        <svg class="theme-icon-sun" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
        <svg class="theme-icon-moon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
      </button>
    </nav>
```

- [ ] **Step 2: Add the toggle button CSS**

Find this exact text (the `.nav-links a::after` rule, currently around line 84):
```css
.nav-links a::after{display:none}
```

Replace with:
```css
.nav-links a::after{display:none}
.theme-toggle{
  width:32px;height:32px;border-radius:50%;border:none;background:none;
  display:flex;align-items:center;justify-content:center;cursor:pointer;
  color:var(--text-secondary);transition:all .2s;padding:0;margin-left:4px;
}
.theme-toggle:hover{color:var(--text);background:rgba(0,0,0,.05)}
:root[data-theme="dark"] .theme-toggle:hover{background:rgba(255,255,255,.05)}
.theme-toggle svg{display:block}
.theme-toggle .theme-icon-moon{display:none}
:root[data-theme="dark"] .theme-toggle .theme-icon-sun{display:none}
:root[data-theme="dark"] .theme-toggle .theme-icon-moon{display:block}
```

- [ ] **Step 3: Validate the button is visible and icons swap correctly (visual only — no click handler yet)**

Open `file:///Users/waruna/Projects/PersonalWebSite/waruna-dev-portfolio-dejan.html` fresh (clear localStorage first).

Take a screenshot. The header pill should now contain the three nav links plus a sun icon button on the right. Hover it (use `browser_hover` on the `#themeToggle` selector) and screenshot — should show subtle dark-tint background pill.

Evaluate in page:
```js
document.querySelector('#themeToggle').getAttribute('aria-label')
```
Expected: `"Switch to dark mode"`

Now force dark mode to verify icon swap:
```js
localStorage.setItem('theme-dejan', 'dark')
```
Reload. Take a screenshot. The sun icon should now be hidden and the moon icon visible inside the button.

Evaluate in page:
```js
const sun = document.querySelector('.theme-icon-sun');
const moon = document.querySelector('.theme-icon-moon');
[getComputedStyle(sun).display, getComputedStyle(moon).display]
```
Expected: `["none", "block"]`

Reset:
```js
localStorage.clear()
```
Reload, verify the sun icon is back.

- [ ] **Step 4: Commit**

```bash
git add waruna-dev-portfolio-dejan.html
git commit -m "Add theme toggle button to dejan portfolio header

Adds a 32x32 circular button to the header pill containing both sun
and moon SVG icons. CSS toggles which icon is visible based on
:root[data-theme=\"dark\"]. Button uses currentColor stroke so icons
inherit the active text color. Click handler comes in the next commit."
```

---

## Task 5: Wire up the toggle click handler

**Files:**
- Modify: `waruna-dev-portfolio-dejan.html` — add a function to the existing `<script>` block

- [ ] **Step 1: Add the toggle handler to the script block**

Find this exact text (currently around lines 517-525, the top of the script block):

```js
<script>
// Copy email
function copyEmail(){
  navigator.clipboard.writeText('hello@waruna.dev').then(function(){
    var t=document.getElementById('toast');
    t.classList.add('visible');
    setTimeout(function(){t.classList.remove('visible');},1400);
  });
}
```

Replace with:

```js
<script>
// Theme toggle
(function(){
  var btn=document.getElementById('themeToggle');
  if(!btn)return;
  function syncAria(){
    var isDark=document.documentElement.getAttribute('data-theme')==='dark';
    btn.setAttribute('aria-label',isDark?'Switch to light mode':'Switch to dark mode');
    btn.setAttribute('aria-pressed',isDark?'true':'false');
  }
  syncAria();
  btn.addEventListener('click',function(){
    var isDark=document.documentElement.getAttribute('data-theme')==='dark';
    if(isDark){
      document.documentElement.removeAttribute('data-theme');
      try{localStorage.setItem('theme-dejan','light');}catch(e){}
    }else{
      document.documentElement.setAttribute('data-theme','dark');
      try{localStorage.setItem('theme-dejan','dark');}catch(e){}
    }
    syncAria();
  });
})();

// Copy email
function copyEmail(){
  navigator.clipboard.writeText('hello@waruna.dev').then(function(){
    var t=document.getElementById('toast');
    t.classList.add('visible');
    setTimeout(function(){t.classList.remove('visible');},1400);
  });
}
```

- [ ] **Step 2: Validate the toggle click works and updates aria attributes**

Open `file:///Users/waruna/Projects/PersonalWebSite/waruna-dev-portfolio-dejan.html` fresh (clear localStorage first).

Verify initial state via `browser_evaluate`:
```js
({
  dataTheme: document.documentElement.getAttribute('data-theme'),
  ariaLabel: document.querySelector('#themeToggle').getAttribute('aria-label'),
  ariaPressed: document.querySelector('#themeToggle').getAttribute('aria-pressed'),
  bg: getComputedStyle(document.body).backgroundColor
})
```
Expected:
```js
{
  dataTheme: null,
  ariaLabel: "Switch to dark mode",
  ariaPressed: "false",
  bg: "rgb(253, 253, 252)"
}
```

Click the toggle (`browser_click` on `#themeToggle`).

Re-evaluate the same expression. Expected:
```js
{
  dataTheme: "dark",
  ariaLabel: "Switch to light mode",
  ariaPressed: "true",
  bg: "rgb(20, 20, 19)"
}
```

Take a screenshot — should show the page in dark mode, header pill is dark, moon icon is visible.

Click the toggle again. Re-evaluate. Should be back to the initial light state.

- [ ] **Step 3: Validate persistence across reloads**

Click the toggle to enter dark mode. Verify dark mode is active.

Reload the page (navigate to the same URL again). Evaluate:
```js
({
  dataTheme: document.documentElement.getAttribute('data-theme'),
  bg: getComputedStyle(document.body).backgroundColor,
  storage: localStorage.getItem('theme-dejan')
})
```
Expected: `dataTheme: "dark"`, `bg: "rgb(20, 20, 19)"`, `storage: "dark"`.

The page should load directly into dark mode with no white flash. (Visually verify by reloading a few times — there should be no perceptible flash before paint.)

Click the toggle to return to light. Reload. Evaluate again. Expected: `dataTheme: null`, `bg: "rgb(253, 253, 252)"`, `storage: "light"`.

- [ ] **Step 4: Validate mobile layout (the toggle fits in the header pill at 375px wide)**

Resize the browser to 375x800 (`browser_resize`). Take a screenshot. The header pill should still contain all three nav links plus the toggle button without wrapping or overflowing the viewport.

Evaluate in page:
```js
const header = document.querySelector('header');
const rect = header.getBoundingClientRect();
({
  width: rect.width,
  scrollWidth: header.scrollWidth,
  fits: rect.width >= header.scrollWidth
})
```
Expected: `fits: true` (the header content fits inside the pill at mobile width).

Resize back to a desktop width (1280x800) for any subsequent steps.

- [ ] **Step 5: Commit**

```bash
git add waruna-dev-portfolio-dejan.html
git commit -m "Wire up theme toggle click handler for dejan portfolio

Click handler reads the current data-theme, flips it, persists the
new value to localStorage under 'theme-dejan', and updates aria-label
and aria-pressed on the button. Initial aria state syncs on page load
to match whatever the FOUC script set."
```

---

## Task 6: Final end-to-end validation pass

**Files:** None modified — this is verification only.

**Why:** The spec's validation plan lists 10 checks. Tasks 1-5 covered most of them inline. This task runs the complete list against the final state to make sure nothing regressed and everything ties together.

- [ ] **Step 1: Fresh-state validation (light mode default)**

Clear localStorage and reload `file:///Users/waruna/Projects/PersonalWebSite/waruna-dev-portfolio-dejan.html`.

Take a full-page screenshot. Check against the spec:
- Background is `#fdfdfc` (light cream-white)
- Header pill is light translucent
- All sections render: hero, what-list, projects, experience, CTA, footer
- Sun icon visible in toggle button
- No console errors (`browser_console_messages`)

- [ ] **Step 2: Toggle to dark, verify all surfaces flip**

Click `#themeToggle`. Take a full-page screenshot. Check:
- Background is `#141413`
- All text is the warm off-white `#f0eeea`
- Experience section background is the slightly elevated `#1c1c1a`
- Project tags use the dark `--bg-alt`
- Borders are warm dark `#2a2a27`
- Header pill is dark translucent
- Other-card borders use `--border` and are visible
- Moon icon visible in toggle button
- The 200ms transition is visible (the swap is smooth, not instant)

- [ ] **Step 3: Reload-persistence check**

Reload the page. Verify dark mode persists with no white flash. Repeat the reload 2-3 times to make sure the FOUC prevention is working consistently.

- [ ] **Step 4: Toggle back to light, reload, verify light persists**

Click toggle. Reload. Verify light mode loads with `localStorage.getItem('theme-dejan') === 'light'`.

- [ ] **Step 5: Mobile width check (375px)**

Resize to 375x800. Verify the header pill still fits and the toggle is still tappable. Toggle once at mobile width to confirm it works. Resize back to 1280x800.

- [ ] **Step 6: Carousel and other interactive elements still work**

In light mode, click through the DomainPilot carousel (use the next arrow). Verify it still advances. Switch to dark mode, do the same — verify the carousel arrows and dots are still visible against the carousel background (they sit on images, so they should be fine in both modes).

Hover an "Other Work" card in both modes — verify the hover lift and shadow are visible in both.

- [ ] **Step 7: Console error check**

Evaluate in page after all the above:
```js
// browser_console_messages — should report no errors
```
Expected: No errors. Warnings about `localStorage` access during `file://` are acceptable if the browser logs them, but no JavaScript errors.

- [ ] **Step 8: Final commit (only if step 7 surfaces small fixes)**

If validation passes cleanly, no commit needed — Tasks 1-5 already shipped the work. If small visual fixes were needed (e.g., grain overlay too prominent in dark mode at `opacity:.4`), apply the fix and commit:

```bash
git add waruna-dev-portfolio-dejan.html
git commit -m "<describe the small fix>"
```

---

## Spec coverage check

| Spec section | Covered by |
|---|---|
| Goal — bg to `#fdfdfc`, dark mode toggle | Tasks 1, 4, 5 |
| Color tokens (light) | Task 1 |
| Color tokens (dark) | Task 1 |
| Toggle placement in header pill | Task 4 |
| Toggle visuals (32px circle, sun/moon SVGs, hover) | Task 4 |
| Toggle accessibility (aria-label, aria-pressed) | Tasks 4, 5 |
| Mobile placement (toggle stays in header pill) | Task 5 (validation step 4), Task 6 (step 5) |
| Persistence — localStorage `theme-dejan` | Tasks 2, 5 |
| First-load logic (light default unless `"dark"` stored) | Tasks 2, 5 |
| FOUC prevention via inline `<head>` script | Task 2 |
| Toggle click handler behavior | Task 5 |
| Smooth 200ms body transition | Task 3 |
| `::selection` token-based | Task 3 |
| Header dark override | Task 3 |
| `header:hover` dark override | Task 3 |
| `.nav-links a:hover` dark override | Task 3 |
| `.other-card:hover` dark override | Task 3 |
| Carousel dots/arrows unchanged (sit on images) | Task 6 step 6 verifies |
| Grain overlay unchanged unless distracting | Task 6 step 8 conditional |
| Validation plan (10-step browser test) | Task 6 |

All spec sections have a corresponding task. No gaps.
