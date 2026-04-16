

# Plan: Fix ERESOLVE dependency conflict on Vercel

## Problem
`@blocknote/shadcn@0.47.3` requires `tailwindcss@^4.1.12`, but the project uses Tailwind v3. Upgrading to Tailwind v4 is **not viable** — the project has 2,400+ lines of CSS using v3 syntax (`@tailwind`, `@apply`, `@layer base`, `theme()`), a complex `tailwind.config.ts`, and the `tailwindcss-animate` plugin which is v3-only. A full migration would break the entire UI.

## Solution: Add `.npmrc` with `legacy-peer-deps`
Create a `.npmrc` file at the project root with `legacy-peer-deps=true`. This tells npm (used by Vercel) to skip strict peer dependency resolution, matching the behavior of npm v6. BlockNote will still work fine — the peer dependency on Tailwind v4 is a soft requirement since BlockNote ships its own pre-built CSS.

## Changes

### 1. Create `.npmrc` (new file)
```
legacy-peer-deps=true
```

One file, one line. No other changes needed.

## Why not upgrade Tailwind?
- 2,400+ lines of `index.css` using v3 directives (`@tailwind base/components/utilities`)
- Complex `tailwind.config.ts` with custom theme, `tailwindcss-animate` plugin
- shadcn/ui components all built for v3
- Migration would require rewriting CSS, config, and testing every component

