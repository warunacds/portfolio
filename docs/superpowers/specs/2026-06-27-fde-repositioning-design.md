# Reposition site for Forward Deployed Engineer roles

**Date:** 2026-06-27
**Status:** Approved

## Goal

Replace the "Product engineer building and shipping digital products" framing with a neutral, problem-first, FDE-flavored identity. The site should read well for Forward Deployed Engineer roles without locking the candidate into the literal "FDE" title, so it still serves founding-engineer and lead applications.

## Approach

Surgical copy edits to `index.html` only. No structural, CSS, or JS changes. Projects, experience, and "Other Work" content stay as-is.

## Changes

All edits are in `/Users/waruna/Projects/PersonalWebSite/index.html`.

### 1. `<title>` (line 6)
- From: `Waruna — Product Engineer`
- To: `Waruna — Engineer`

### 2. Meta description (line 7)
- From: `Product engineer with 12+ years of experience building end-to-end products.`
- To: `Engineer with 12+ years turning ambiguous problems into shipped software — across the whole stack, from idea to production.`

### 3. Hero `<h1>` (line 367) — solutions-oriented, problem-first
- From: `Product engineer building <em>and shipping</em> digital products`
- To: `Engineer who solves real problems, <em>fast</em> — from first conversation to production`

### 4. Hero subtitle (line 368) — customer/embed angle
- From: `12+ years of turning ideas into real, running software. I work cross the stack and lead teams to architect, build, optimize and scale — from database to App Store.`
- To: `12+ years turning ambiguous problems into shipped software. I work directly with the people who have the problem, across the whole stack — from idea to production.`

### 5. "What I bring" list (lines 392–396) — reframe toward problem/customer axis
- 01: `Work directly with stakeholders to turn ambiguous problems into clear solutions`
- 02: `Build full-stack products across web, mobile, and desktop`
- 03: `Ship to production — App Store, cloud infra, the whole pipeline`
- 04: `Integrate with existing systems and make pragmatic tradeoffs under real constraints`
- 05: `Lead teams, mentor engineers, and establish development workflows`

### 6. CTA line (line 536)
- From: `Open to Product Engineer, Founding Engineer, and Lead roles worldwide.`
- To: `Open to Forward Deployed Engineer, Founding Engineer, and Lead roles worldwide.`

## Out of scope

- `#projects` section content
- Experience content (`work-exp-section.txt`)
- "Other Work" cards
- All CSS / JS
- Images in git status (avatar.jpeg, screenshots)

## Notes

- The existing typo "I work cross the stack" → "across the stack" is corrected as part of rewriting the hero subtitle line.
- Pre-existing observation (not addressed here): the nav links to `#experience`, but `index.html` does not render an experience section — the markup lives only in `work-exp-section.txt`.

## Success criteria

- No occurrence of "Product engineer" / "Product Engineer" remains in `index.html` as a self-title.
- All six edits applied verbatim.
- Page still renders (no broken HTML).
