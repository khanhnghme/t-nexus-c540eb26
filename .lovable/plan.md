

# Plan: Fix Google OAuth 404 on Vercel

## Root Cause
`vercel.json` rewrites ALL paths to `index.html`, including `/~oauth/initiate` and `/~oauth/callback` used by `@lovable.dev/cloud-auth-js`. On Lovable hosting these are intercepted by a proxy — on Vercel they are not.

## Solution

Since this project is self-hosted on Vercel but uses Lovable Cloud's managed OAuth, the `/~oauth` routes need to reach `oauth.lovable.app` instead of being swallowed by the SPA rewrite.

### Option: Add Vercel rewrite to proxy `~oauth` to Lovable

Update `vercel.json` to add a rewrite rule **before** the catch-all that forwards `/~oauth/*` to the Lovable OAuth broker:

```json
{
  "rewrites": [
    { "source": "/~oauth/:path*", "destination": "https://oauth.lovable.app/~oauth/:path*" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### Files changed
1. `vercel.json` — Add `~oauth` proxy rewrite before SPA fallback

One file, one change. No code or backend modifications needed.

