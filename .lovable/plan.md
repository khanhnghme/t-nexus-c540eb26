

# Plan: Fix Google OAuth Verification Issues

## Problem
Google's Trust & Safety team reports three issues:
1. **Homepage requirements** — "Your home page URL is unresponsive" (the main blocker)
2. **Privacy policy requirements** — needs to be accessible
3. **Branding guidelines** — needs compliance

The root cause: `https://t-nexus.io.vn` is a React SPA. The `<body>` contains only `<div id="root"></div>` — Google's verification crawler does not execute JavaScript, so it sees an empty/blank page and reports it as "unresponsive." The same applies to the Privacy Policy and Terms pages at `/guide/privacy` and `/guide/terms`.

## Solution

### 1. Add rich `<noscript>` fallback content to `index.html`

Add a `<noscript>` block inside `<body>` (before `<div id="root">`) with static HTML that includes:
- App name and description ("Team Nexus — Team collaboration platform for students")
- Key feature descriptions
- Direct links to Privacy Policy (`/guide/privacy`) and Terms of Service (`/guide/terms`)
- Contact information
- Basic styling via inline CSS so the page looks presentable

This ensures Google's non-JS crawler sees a complete, meaningful homepage with working links.

### 2. Verify Privacy Policy and Terms pages are crawlable

The Privacy and Terms pages are also React SPA routes — they will also appear blank to a non-JS crawler. Add `<noscript>` content that provides a basic text version or at minimum states that JavaScript is required and links to a plain-text version.

Alternatively, since `<noscript>` only applies globally in `index.html`, ensure the noscript block includes the full privacy policy text and terms text as anchor-linked sections, so the crawler can find them from the homepage.

### 3. Files to modify

| File | Change |
|------|--------|
| `index.html` | Add `<noscript>` block with static homepage content, privacy policy summary, terms summary, and navigation links |

### Technical Details

The `<noscript>` tag goes inside `<body>`, after the PWA script and before `<div id="root">`. It will contain:

```html
<noscript>
  <div style="max-width:800px;margin:0 auto;padding:40px 20px;font-family:sans-serif;">
    <h1>Team Nexus</h1>
    <p>The teamwork orchestration platform for students. T-Nexus keeps your work on track 24/7.</p>
    <h2>Features</h2>
    <ul>
      <li>Task Management — Assign, track and complete work</li>
      <li>Scoring System — Automated, fair and transparent grading</li>
      <li>AI Assistant — Context-aware project helper</li>
      <li>Public Sharing — Share projects publicly</li>
    </ul>
    <h2>Links</h2>
    <ul>
      <li><a href="/guide/privacy">Privacy Policy</a></li>
      <li><a href="/guide/terms">Terms of Service</a></li>
      <li><a href="/guide/pricing">Pricing</a></li>
    </ul>
    <p>Contact: [your contact email]</p>
  </div>
</noscript>
```

This is invisible to normal users (JS renders the React app), but fully visible to Google's non-JS verification crawler, resolving all three issues: responsive homepage, accessible privacy policy links, and clear branding.

