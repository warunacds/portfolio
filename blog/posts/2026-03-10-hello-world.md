---
title: Hello, World
date: 2026-03-10
excerpt: Kicking off the blog — a place for notes on product engineering, shipping, and the craft of building real software.
---

I've been meaning to start writing for a while. Less as a broadcast and more as a way to think out loud about the work.

## What goes here

A loose collection of notes on:

- **Product engineering** — the intersection of design, code, and what users actually need
- **Shipping** — how real software gets out the door (and how it doesn't)
- **Tools & systems** — what I'm using, building, breaking, and fixing

## How this works

This blog is just markdown files in a folder. I drop a new `.md` into `blog/posts/`, run `npm run build`, and a new page appears. No CMS, no database, no friction — the way the web used to be.

```bash
# Add a post
vim blog/posts/2026-04-20-my-post.md

# Build it
npm run build

# Ship it
git commit -am "new post" && git push
```

That's it. More soon.
