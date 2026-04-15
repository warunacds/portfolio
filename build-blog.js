#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { marked } = require('marked');

const ROOT = __dirname;
const POSTS_DIR = path.join(ROOT, 'blog', 'posts');
const BLOG_DIR = path.join(ROOT, 'blog');

marked.setOptions({ gfm: true, breaks: false });

const themeBootScript = `<script>(function(){try{if(localStorage.getItem('theme-dejan')==='dark'){document.documentElement.setAttribute('data-theme','dark');}}catch(e){}})();</script>`;

const fontsLink = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=Newsreader:ital,wght@0,300;0,400;0,500;1,300;1,400&display=swap" rel="stylesheet">`;

const headerHtml = (activeBlog) => `<header>
  <div class="container">
    <a href="/" class="logo"><img src="/images/avatar_small.jpg" alt="Waruna" class="logo-avatar">Waruna</a>
    <nav class="nav-links">
      <a href="/#projects">Projects</a>
      <a href="/#experience">Experience</a>
      <a href="/blog/"${activeBlog ? ' class="active"' : ''}>Blog</a>
      <a href="/#contact">Contact</a>
      <button class="theme-toggle" id="themeToggle" type="button" aria-label="Switch to dark mode" aria-pressed="false">
        <svg class="theme-icon-sun" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
        <svg class="theme-icon-moon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
      </button>
    </nav>
  </div>
</header>`;

const footerHtml = `<footer>
  <div class="container">
    <div>© 2026 Waruna</div>
    <div><a href="/">← Back to home</a></div>
  </div>
</footer>`;

const themeToggleScript = `<script>(function(){var btn=document.getElementById('themeToggle');if(!btn)return;function sync(){var d=document.documentElement.getAttribute('data-theme')==='dark';btn.setAttribute('aria-label',d?'Switch to light mode':'Switch to dark mode');btn.setAttribute('aria-pressed',d?'true':'false');}sync();btn.addEventListener('click',function(){var d=document.documentElement.getAttribute('data-theme')==='dark';if(d){document.documentElement.removeAttribute('data-theme');try{localStorage.setItem('theme-dejan','light');}catch(e){}}else{document.documentElement.setAttribute('data-theme','dark');try{localStorage.setItem('theme-dejan','dark');}catch(e){}}sync();});})();</script>`;

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function formatDate(d) {
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
}

function readPosts() {
  if (!fs.existsSync(POSTS_DIR)) {
    fs.mkdirSync(POSTS_DIR, { recursive: true });
    return [];
  }
  const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));
  const posts = files.map(file => {
    const full = path.join(POSTS_DIR, file);
    const raw = fs.readFileSync(full, 'utf8');
    const { data, content } = matter(raw);

    if (!data.title) {
      throw new Error(`Missing 'title' in frontmatter: ${file}`);
    }
    if (!data.date) {
      throw new Error(`Missing 'date' in frontmatter: ${file}`);
    }

    const slug = data.slug
      ? slugify(data.slug)
      : slugify(file.replace(/\.md$/, '').replace(/^\d{4}-\d{2}-\d{2}-/, ''));

    return {
      file,
      slug,
      title: data.title,
      date: new Date(data.date),
      excerpt: data.excerpt || '',
      bodyMd: content,
    };
  });

  posts.sort((a, b) => b.date - a.date);
  return posts;
}

function renderIndex(posts) {
  const items = posts.length
    ? `<ul class="post-list">
${posts.map(p => `      <li class="post-item">
        <a href="/blog/${p.slug}.html">
          <div class="post-meta">${escapeHtml(formatDate(p.date))}</div>
          <h2 class="post-title">${escapeHtml(p.title)}</h2>
          ${p.excerpt ? `<p class="post-excerpt">${escapeHtml(p.excerpt)}</p>` : ''}
        </a>
      </li>`).join('\n')}
    </ul>`
    : `<div class="empty-state">No posts yet. Check back soon.</div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Blog — Waruna</title>
<meta name="description" content="Writing by Waruna on product engineering, shipping, and the craft of building software.">
${fontsLink}
${themeBootScript}
<link rel="stylesheet" href="/blog/blog.css">
</head>
<body>
${headerHtml(true)}
<main>
  <div class="container">
    <div class="page-label">Writing</div>
    <h1 class="page-title">Blog</h1>
    <p class="page-sub">Notes on product engineering, shipping fast, and the craft of building real software end-to-end.</p>
    ${items}
  </div>
</main>
${footerHtml}
${themeToggleScript}
</body>
</html>
`;
}

function renderPost(post) {
  const bodyHtml = marked.parse(post.bodyMd);
  const desc = post.excerpt
    ? escapeHtml(post.excerpt)
    : escapeHtml(post.bodyMd.replace(/\n+/g, ' ').slice(0, 160));

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(post.title)} — Waruna</title>
<meta name="description" content="${desc}">
${fontsLink}
${themeBootScript}
<link rel="stylesheet" href="/blog/blog.css">
</head>
<body>
${headerHtml(true)}
<main>
  <div class="container">
    <article>
      <a href="/blog/" class="post-back">Back to blog</a>
      <h1>${escapeHtml(post.title)}</h1>
      <div class="post-date">${escapeHtml(formatDate(post.date))}</div>
      <div class="post-body">
${bodyHtml}
      </div>
    </article>
  </div>
</main>
${footerHtml}
${themeToggleScript}
</body>
</html>
`;
}

function cleanGenerated() {
  if (!fs.existsSync(BLOG_DIR)) return;
  const entries = fs.readdirSync(BLOG_DIR);
  for (const entry of entries) {
    const full = path.join(BLOG_DIR, entry);
    const stat = fs.statSync(full);
    if (stat.isFile() && entry.endsWith('.html')) {
      fs.unlinkSync(full);
    }
  }
}

function build() {
  const posts = readPosts();
  if (!fs.existsSync(BLOG_DIR)) fs.mkdirSync(BLOG_DIR, { recursive: true });

  cleanGenerated();

  fs.writeFileSync(path.join(BLOG_DIR, 'index.html'), renderIndex(posts));

  for (const post of posts) {
    fs.writeFileSync(path.join(BLOG_DIR, `${post.slug}.html`), renderPost(post));
  }

  console.log(`Built ${posts.length} post${posts.length === 1 ? '' : 's'}:`);
  for (const p of posts) {
    console.log(`  - ${p.slug}.html  (${p.title})`);
  }
  console.log(`Wrote blog/index.html`);
}

try {
  build();
} catch (err) {
  console.error('Build failed:', err.message);
  process.exit(1);
}
