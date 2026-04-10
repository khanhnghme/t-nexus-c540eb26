

## Fix: Homepage URL Unresponsive

**Problem**: The homepage is being flagged as "unresponsive" because crawlers/bots encounter:
1. A **SplashScreen** (~2.8s animation) that blocks all content
2. A **LoadingScreen** while `useFullLockdown` queries the database
3. No meaningful HTML content is rendered until both complete

Crawlers see an empty/loading page and consider the URL unresponsive.

**Solution**: Render the actual Landing page content in the DOM immediately, with the SplashScreen as an overlay on top. This way crawlers see real content while users still see the splash animation.

---

### Changes

**1. `src/pages/Landing.tsx`** — Render content behind splash/loading overlays

- Remove the early `return <LoadingScreen />` when `isChecking` is true
- Instead, render the full landing page content always, and show the LoadingScreen/SplashScreen as fixed overlays on top with `z-index`
- This ensures HTML content is always in the DOM for crawlers

**2. `src/components/SplashScreen.tsx`** — Ensure it's an overlay, not a blocking element

- Wrap in a `fixed inset-0` container with high z-index so it overlays content rather than replacing it

### Technical detail

```tsx
// Landing.tsx — before:
if (isChecking && !showSplash) {
  return <LoadingScreen message={tl.loadingHomepage} />;
}

// Landing.tsx — after:
// Remove early return, render LoadingScreen as overlay
return (
  <div className="relative min-h-screen ...">
    {showSplash && <SplashScreen ... />}
    {isChecking && !showSplash && (
      <div className="fixed inset-0 z-50">
        <LoadingScreen message={tl.loadingHomepage} />
      </div>
    )}
    {/* Full landing page content always rendered below */}
    ...
  </div>
);
```

This ensures the homepage always has real, crawlable HTML content in the DOM, fixing the "unresponsive" detection.

