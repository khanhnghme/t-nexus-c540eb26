

## Fix Google Drive Picker — 3 Issues

### Issues Identified

1. **Redirect goes to `/settings` instead of original context**: The callback edge function hardcodes redirect to `https://t-nexus.lovable.app/settings?gdrive=connected`. When user connects from a project page (e.g., `/p/nckh-hkc-2025-ban-sao`), they lose context.

2. **Picker lag/unresponsive**: The `setDeveloperKey('')` call with empty string may cause issues. Also, the Picker API script loading uses `gapi.load('picker')` but the newer Google Picker requires loading via `google.accounts.oauth2` or proper initialization.

3. **Picker may not open**: Race conditions in script loading + the `isLoading` state resets in `finally` block before picker is actually visible.

---

### Fix Plan

#### Fix 1: Preserve context across OAuth redirect

**`google-drive-auth/index.ts`** — Accept `return_url` from request body, encode it into OAuth `state` param alongside `userId`:
- State format: `userId::returnUrl` (base64 encoded)

**`google-drive-callback/index.ts`** — Decode `state` to extract both `userId` and `returnUrl`, redirect to the original page:
- Parse state → extract return URL
- Redirect to `returnUrl?gdrive=connected` instead of hardcoded `/settings`

**`useGoogleDriveConnect.ts`** — Pass `window.location.pathname` when calling `connect()`:
- Send `return_url` in the body to `google-drive-auth`
- The redirect after OAuth will land back on the correct page

#### Fix 2: Fix Picker initialization

**`useGoogleDrivePicker.ts`** — Fix picker construction:
- Remove `.setDeveloperKey('')` — empty developer key causes issues; omit it entirely when using OAuth token
- Remove `.setAppId(client_id.split('-')[0])` — incorrect app ID extraction causes picker failures
- Add proper `DocsView` with specific MIME types for better performance
- Add `setSize(width, height)` to ensure picker renders at proper dimensions
- Load the Google Picker script from `https://apis.google.com/js/api.js` with proper error handling

#### Fix 3: Script loading robustness

**`useGoogleDrivePicker.ts`** — Improve reliability:
- Add retry logic for script loading
- Don't reset `isLoading` until picker callback fires (PICKED or CANCEL)
- Add a `setOrigin(window.location.protocol + '//' + window.location.host)` call to fix cross-origin issues in iframe preview

---

### Files to Change

| File | Change |
|------|--------|
| `supabase/functions/google-drive-auth/index.ts` | Accept + encode `return_url` in state |
| `supabase/functions/google-drive-callback/index.ts` | Decode state, redirect to original URL |
| `src/hooks/useGoogleDriveConnect.ts` | Pass current path when connecting |
| `src/hooks/useGoogleDrivePicker.ts` | Fix picker init, remove bad config, add setOrigin |

