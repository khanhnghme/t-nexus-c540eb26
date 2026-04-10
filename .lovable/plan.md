

## Plan: Add Connected Tools section to all plan-related pages

### Summary
Extract the Connected Tools data (Google integrations) into a shared constant/component, then add the "Connected Tools" section to all pages that display plan features — matching the exact style from the Pricing page.

### Pages to update

1. **Upgrade.tsx** — Add Connected Tools below the feature list in `PlanColumn` for Pro, Business, and Enterprise plans. Also add to the comparison table (`UpgradePlansAndFeatures`).

2. **ServicePlan.tsx** — Add Connected Tools in the "Plan Benefits" section (Tab 1: Current Plan) when the user's plan is Pro, Business, or Custom.

3. **ServicePlanSection.tsx** — Add a compact Connected Tools list below the features list, only visible for Pro/Business/Custom plans.

4. **FirstTimeOnboarding.tsx** — Add Connected Tools below each plan card's feature list for Pro and Business plans during onboarding.

### Shared code
Create a reusable `ConnectedToolsList` component or shared constant in a new file (e.g., `src/lib/connectedTools.ts`) containing:
- Gmail logo, Google Drive logo, Google Calendar logo imports
- Labels: "Email Integration", "Google Drive", "Calendar Sync"
- A React component that renders the "Connected Tools" header + checkmark + logo + label rows

### Style
- Matches Pricing page exactly: border-top separator, "Connected Tools" title (13px, 600 weight), Check icon (blue, 15px), logo (16x16), label (13px)
- Adapts to each page's styling context (inline styles on Pricing/Upgrade Notion-style pages, Tailwind classes on ServicePlan/Settings pages)

### Technical details
- No logic, API, or database changes
- Only UI additions — existing layouts remain untouched
- `showIntegrations` condition: plan key includes `pro`, `business`, `custom`, or `enterprise`

### Files to create/edit
| File | Action |
|------|--------|
| `src/components/ConnectedToolsBadge.tsx` | **Create** — shared component |
| `src/pages/Upgrade.tsx` | **Edit** — add to PlanColumn + comparison table |
| `src/pages/ServicePlan.tsx` | **Edit** — add to plan benefits section |
| `src/components/personal/ServicePlanSection.tsx` | **Edit** — add below features |
| `src/components/FirstTimeOnboarding.tsx` | **Edit** — add to plan cards |

