# Dejan Portfolio — Light + Dark Mode

**Date:** 2026-04-09
**File affected:** `waruna-dev-portfolio-dejan.html` (single-file change)

## Goal

Switch the default background of `waruna-dev-portfolio-dejan.html` from the warm cream `#f8f7f4` to a near-white `#fdfdfc`, and introduce a manual dark mode toggled from a button in the floating header pill. Preference persists in `localStorage` and applies before first paint to avoid FOUC.

## Non-goals

- No changes to other portfolio variants (`index.html`, `waruna-dev-portfolio-1.html` … `-10.html`, `waruna-dev-portfolio.html`).
- No changes to layout, typography, fonts, hero copy, projects, experience, or footer content.
- No system-preference (`prefers-color-scheme`) detection — light is the default for first-time visitors regardless of OS setting.
- No new dependencies, build step, or new files.

## Design

### Color tokens

The current implementation defines tokens in `:root`. We restructure so `:root` holds the new light defaults and `:root[data-theme="dark"]` overrides them for dark mode.

**Light mode (new default):**

| Token | Current value | New value |
|---|---|---|
| `--bg` | `#f8f7f4` | `#fdfdfc` |
| `--bg-alt` | `#efede8` | `#f4f3ef` |
| `--text` | `#1a1a1a` | `#1a1a1a` (unchanged) |
| `--text-secondary` | `#5a5a5a` | `#5a5a5a` (unchanged) |
| `--text-tertiary` | `#8a8a8a` | `#8a8a8a` (unchanged) |
| `--accent` | `#1a1a1a` | `#1a1a1a` (unchanged) |
| `--border` | `#e0ddd6` | `#e8e6e0` |

**Dark mode (new):**

| Token | Value |
|---|---|
| `--bg` | `#141413` |
| `--bg-alt` | `#1c1c1a` |
| `--text` | `#f0eeea` |
| `--text-secondary` | `#a8a6a0` |
| `--text-tertiary` | `#6e6c66` |
| `--accent` | `#f0eeea` |
| `--border` | `#2a2a27` |

The palette stays in the warm-neutral family in both modes — no cold blue-greys.

### Theme toggle

**Placement:** Inside the existing `<header>` floating pill, as the last child of (or sibling to) `.nav-links`. The exact DOM position is decided during implementation based on which gives cleaner horizontal spacing within the pill.

**Visuals:**
- 32×32px circular button
- Inline SVG sun icon (visible in light mode → click switches to dark)
- Inline SVG moon icon (visible in dark mode → click switches to light)
- Both icons live in the DOM; CSS `display:none` toggles which is rendered based on `:root[data-theme="dark"]`
- Icons use `currentColor` stroke at ~16px so they inherit theme text color automatically
- Hover state matches existing nav links: `rgba(0,0,0,.05)` background pill in light mode, `rgba(255,255,255,.05)` in dark mode

**Accessibility:**
- `aria-label` is "Switch to dark mode" in light mode, "Switch to light mode" in dark mode
- `aria-pressed` reflects current state (`true` when dark is active)
- Button has visible focus ring inheriting browser default

**Mobile (`<768px`):** Toggle stays in the header pill alongside the existing nav links — small enough to fit without crowding. No separate mobile placement.

### Persistence and first-load behavior

**Storage:** `localStorage` key `theme-dejan` (scoped to this file specifically so it doesn't collide with theme preferences set on other pages in the repo).

**Values:** `"light"` or `"dark"`. Anything else is treated as unset.

**First-load logic:**
1. Read `localStorage.getItem('theme-dejan')`
2. If value is `"dark"` → set `data-theme="dark"` on `<html>`
3. Otherwise (including `"light"`, `null`, malformed values, or absent) → leave `<html>` without `data-theme` (light is the CSS default)

### FOUC prevention

A small inline `<script>` is placed in `<head>`, **before** the existing `<style>` block, so the theme attribute is set on `<html>` synchronously before the first paint. This prevents the dark-mode flash for returning visitors who chose dark on a prior visit.

```html
<script>
(function(){
  try {
    if (localStorage.getItem('theme-dejan') === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  } catch (e) {}
})();
</script>
```

The `try/catch` guards against `localStorage` access errors (private mode, disabled storage, etc.) — failure silently falls back to the light default.

### Toggle click handler

A new function added to the existing `<script>` block (top, near `copyEmail`). On click:
1. Read current `data-theme` attribute
2. Compute the next theme (light → dark, dark → light)
3. Set or remove `data-theme` attribute on `<html>` accordingly
4. Write the new value to `localStorage` under `theme-dejan`
5. Update the button's `aria-label` and `aria-pressed`

The icon swap is handled purely by CSS (different `display` values based on `:root[data-theme="dark"]`), no JS needed for that.

### Smooth transition

Add a short transition to `body` so the theme swap doesn't feel like a hard cut:

```css
body { transition: background-color .2s ease, color .2s ease; }
```

This is short enough to feel responsive and long enough to feel deliberate. No transition on the FOUC-prevention path because the attribute is set before paint.

### Hardcoded color audit

The current CSS contains several hardcoded color values that bypass the token system. These need to either become token-based or get a dark-mode override block:

| Selector | Current | Action |
|---|---|---|
| `::selection` | `background:#1a1a1a;color:#f8f7f4` | Replace with `var(--text)` / `var(--bg)` |
| `header` | `background:rgba(255,255,255,.55)`, `border:1px solid rgba(255,255,255,.6)`, `inset 0 1px 0 rgba(255,255,255,.8)` in box-shadow | Add `:root[data-theme="dark"] header { ... }` override using `rgba(20,20,19,.55)`, `rgba(255,255,255,.08)` border, dark inset highlight |
| `header:hover` | `background:rgba(255,255,255,.65)` | Add dark override `rgba(20,20,19,.65)` |
| `.nav-links a:hover` | `background:rgba(0,0,0,.05)` | Add dark override `rgba(255,255,255,.05)` |
| `.other-card:hover` | `box-shadow:0 4px 12px rgba(0,0,0,.04)` | Add dark override `box-shadow:0 4px 12px rgba(0,0,0,.4)` (stronger because shadows on dark surfaces need more contrast to be visible) |
| `.carousel-dot` and `.carousel-arrow` | `rgba(255,255,255,...)` values | **Leave unchanged** — these sit on top of carousel images, work in both modes |
| Grain overlay (`body::after`) | `opacity:.4` | Leave unchanged unless validation shows it's distracting in dark mode; if so, lower to ~`.25` via dark override |

## Touch points (single file)

All edits in `waruna-dev-portfolio-dejan.html`:

1. **`<head>` — new inline FOUC script** (~10 lines), placed before the existing `<style>` block
2. **`<style>` — token restructure**: split current `:root` into light defaults + `:root[data-theme="dark"]` override block
3. **`<style>` — body transition**: add `transition: background-color .2s ease, color .2s ease`
4. **`<style>` — toggle button styles**: ~15 lines for button sizing, hover, icon visibility rules
5. **`<style>` — dark-mode overrides** for the hardcoded colors listed in the audit table
6. **`<style>` — `::selection`** changed to use tokens
7. **`<header>` HTML** — add toggle button with both sun and moon SVG icons
8. **`<script>` — toggle click handler** (~15 lines), added near the top of the existing script block

No structural changes outside the header. No changes to hero, projects, experience, CTA, or footer.

## Validation plan

After implementation:

1. Open the file via Playwright in a fresh browser context (no localStorage)
2. Verify light mode renders by default with the new `#fdfdfc` background
3. Take a screenshot of the full page in light mode
4. Click the theme toggle in the header
5. Verify dark mode applies — background, text, header pill, exp section, tags, borders all flip
6. Take a screenshot of the full page in dark mode
7. Reload the page; verify dark mode persists (no flash of light mode on load)
8. Click the toggle again to return to light; reload; verify light persists
9. Resize viewport to 375px wide and verify the toggle still fits cleanly inside the header pill on mobile
10. Verify the toggle button has correct `aria-label` and `aria-pressed` values in both states

If any visual issue surfaces (e.g., grain overlay too prominent in dark mode, header pill border feels wrong), fix inline before considering validation passed.

## Out of scope (explicit YAGNI)

- No keyboard shortcut for theme toggle
- No transition delay or animation on the icon swap itself
- No theme sync across browser tabs (no `storage` event listener)
- No theme sync with other portfolio variants in the repo
- No respect for `prefers-reduced-motion` on the body transition (200ms is short enough to be unobtrusive even with reduced motion)
