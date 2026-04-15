

## Plan: Redesign AI Chat & Add Delete Features

### Changes

**1. Remove usage score from chat input area**
The usage bar (questionsToday/maxQuestions) currently appears below the chat input (lines 536-546). Since this is a page-level metric, it should not be repeated in the chat area. Remove it entirely from the chat view — the TopBar already shows page-level info.

**2. Add "Delete All Conversations" button**
Add a "Xóa tất cả" button in the history sidebar header (next to the close button). On click, delete all conversations for the current user, clear messages, and reset state. Include a confirmation step (window.confirm or toast).

**3. Ensure individual delete works properly**
Individual delete already exists (`handleDeleteConversation`). Verify it's visible and accessible — currently shows on hover with `opacity-0 group-hover:opacity-100`. No changes needed here.

### Technical Details

**File: `src/pages/AIAssistant.tsx`**
- Remove lines 536-546 (usage progress bar below chat input)
- Add `handleDeleteAllConversations` function that deletes all conversations for `user.id`
- Add a trash/delete-all button in the history sidebar header bar (line 376-381)
- Clean up unused `usagePercent` variable if no longer referenced

