

## Fix: Calendar Sync Duplication Bug

### Root Cause
The sync function loads the `calendar_sync_map` once at the start. During the **PUSH** phase, new sync map entries are inserted into the DB. But the **PULL** phase uses `existingGoogleIds` built from the initial load — so it doesn't see events just pushed, and creates duplicate local events for them.

Also, the table lacks unique constraints, so nothing prevents duplicates at the DB level.

### Plan

**1. Database migration — add unique constraints and clean duplicates**
- Delete duplicate rows in `calendar_sync_map` (keep the oldest per `google_event_id + user_id`)
- Delete orphaned duplicate `personal_events` created by the bug
- Add unique constraint: `(user_id, local_event_id, local_event_type)`
- Add unique constraint: `(user_id, google_event_id)`

**2. Fix edge function `google-calendar-sync/index.ts`**
- Track newly pushed `google_event_id` values in a `Set` during the PUSH phase
- In the PULL phase, check both `existingGoogleIds` AND the newly-pushed set before creating local events
- Use `upsert` with `onConflict` instead of plain `insert` for sync map entries as an additional safety net
- Reload or accumulate sync map state between push and pull phases

**3. Deploy and verify**
- Deploy the updated edge function
- Test: create event → sync → sync again → verify no duplicates

### Technical Details

```text
Current flow (buggy):
  Load syncMap → PUSH (inserts new sync_map rows) → PULL (uses stale syncMap) → DUPLICATES

Fixed flow:
  Load syncMap → PUSH (inserts + tracks new google_event_ids in memory) → PULL (checks both sets) → NO DUPLICATES
```

