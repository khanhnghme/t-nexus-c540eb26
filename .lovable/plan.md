

## Redesign Account Settings — Integration Management Hub

### Overview
Add a new "Connected Services" section to the Account Settings page with individual cards for Google Calendar, Gmail, and Google Drive. Each card shows connection status and provides connect/disconnect actions. The existing connect/disconnect logic from the hooks remains unchanged — only the UI presentation is centralized here.

### Changes

**1. Create `src/components/settings/ConnectedServicesCard.tsx`**
- A new component rendering 3 service cards in a grid
- Each card includes: service icon, name, short description, connection status badge, and a Connect or Disconnect button
- Uses the existing hooks: `useGoogleCalendarSync`, `useGmailSync`, `useGoogleDriveConnect`
- Disconnect triggers a confirmation dialog (reusing AlertDialog pattern already in the codebase)
- Connected state shows green badge + email if available (Gmail, Drive)
- Loading/checking state shows a subtle skeleton/spinner

**2. Update `src/pages/AccountSettings.tsx`**
- Import and render `ConnectedServicesCard` in the page layout
- Place it prominently (above or below the existing Language/Nav cards)
- Update page subtitle to mention integrations
- Layout: full-width card spanning the grid, containing 3 sub-cards for each service

**3. No changes to other pages**
- The hooks (`useGoogleCalendarSync`, `useGmailSync`, `useGoogleDriveConnect`) remain as-is
- Other pages that currently show connect buttons (e.g., `GoogleCalendarConnect`, `GmailConnect`) will continue to use the hooks for status checks only — their connect/disconnect UX is not modified in this task (per user request: "Không thay đổi logic ở các trang khác")

### Technical Details

```text
AccountSettings page layout:
┌─────────────────────────────────────────┐
│ Settings                                │
│ Customize interface, language & services│
├─────────────────────────────────────────┤
│ Connected Services (full-width card)    │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│ │ Calendar │ │  Gmail   │ │  Drive   │ │
│ │ ✓ Active │ │ Connect  │ │ ✓ Active │ │
│ └──────────┘ └──────────┘ └──────────┘ │
├───────────────────┬─────────────────────┤
│ Language          │ Nav Customization   │
└───────────────────┴─────────────────────┘
```

- Each service card: icon (Google product icon or Lucide), title, 1-line description, status badge, action button
- Disconnect: AlertDialog confirmation before executing
- After connect redirect, URL params are already handled by existing hooks

