# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal technical blog (Chinese language) built with **Hugo 0.125.6 extended**. No theme or Hugo modules — all templates are custom in `layouts/`. Deployed to GitHub Pages at `https://jeny-sys.github.io/`.

## Commands

- **Dev server**: `hugo server` (live reload)
- **Build**: `hugo` (or `hugo --minify` for production)
- **New post**: `hugo new posts/my-post.md`
- **Deploy**: Automatic on push to `master` via `.github/workflows/hugo.yml`

## Architecture

### Template system (no external theme)

All layouts live in `layouts/` and follow Hugo conventions:

- `_default/baseof.html` — outer HTML shell, loads `style.css` and `main.js`
- `_default/single.html` — post detail page
- `_default/list.html` — section listing
- `index.html` — home page (5 most recent posts)
- `pages/search.html` — client-side search page
- `index.json` / `_default/search.json` — JSON index consumed by the search page's client-side JS

Partials in `layouts/partials/`: `header.html`, `sidebar.html`, `footer.html`.

### Content structure

Posts in `content/posts/` with YAML front matter: `title`, `date`, `draft`, `categories`, `tags`, `description`. Additional pages: `content/about/index.md` (leaf bundle), `content/categories/_index.md`, `content/search/index.md`.

### Client assets

- `static/css/style.css` — dark theme using CSS variables, responsive (sidebar collapses on mobile), accent `#4da6ff`
- `static/js/main.js` — smooth scroll, back-to-top button

### Configuration

`config.toml` — language `zh-cn`, taxonomies (categories, tags), markup highlighting (monokai), output formats include JSON on home for search indexing.

## CI/CD

GitHub Actions (`.github/workflows/hugo.yml`): triggers on push to `master`, installs Hugo 0.125.6 extended, builds with `--gc --minify`, deploys to GitHub Pages.
