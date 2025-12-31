# E2E Test Gaps - Permission Testing

> Last updated: 2025-12-31
> Location: `e2e/tests/sharing/permissions.spec.ts`

## Overview

Current permission test coverage has gaps, particularly around **Commenter role functionality** and **Viewer restrictions** for comment/AI features.

---

## Missing Tests by Role

### Viewer Role (View Access)

| Test | Priority | Status | Notes |
|------|----------|--------|-------|
| Cannot open AI Chat panel | 🔴 High | `test.skip` | AI Chat should be hidden/disabled |
| Cannot add comments | 🔴 High | `test.skip` | Comments button should be hidden |
| Cannot view comment threads | 🟡 Medium | `test.skip` | Unclear if viewers can see existing comments |

### Commenter Role (Comment Access)

| Test | Priority | Status | Notes |
|------|----------|--------|-------|
| Can open Comments panel | 🔴 High | `test.skip` | Core commenter functionality |
| Can add new comment thread | 🔴 High | `test.skip` | Core commenter functionality |
| Can reply to existing comment | 🔴 High | `test.skip` | Core commenter functionality |
| Can add emoji reactions | 🟡 Medium | `test.skip` | Part of comment interactions |
| Cannot delete others' comments | 🔴 High | `test.skip` | Permission boundary |
| Cannot use AI Chat | 🟡 Medium | `test.skip` | Should be restricted like viewer |
| Real-time sync for comments | 🟡 Medium | Not added | Owner adds comment, commenter sees it |

### Editor Role (Edit Access)

| Test | Priority | Status | Notes |
|------|----------|--------|-------|
| Can drag nodes | 🟡 Medium | `test.skip` | Already exists, skipped due to React Flow flakiness |
| Can resize nodes | 🟢 Low | Not added | Lower priority |
| Can add comments | 🟢 Low | Not added | Should work, lower priority to verify |
| Can use AI features | 🟢 Low | Not added | Should work, lower priority to verify |

---

## Implementation Notes

### Prerequisites for Comment Tests

1. **Page Object needed**: `comments-panel.page.ts`
   - Methods: `openPanel()`, `addComment(nodeId, text)`, `replyToComment(commentId, text)`, `addReaction(commentId, emoji)`, `deleteComment(commentId)`

2. **Fixtures**: May need to create comments via API in `beforeAll` for "reply" and "delete" tests

3. **Real-time considerations**: Comment sync tests need similar 2-3 second waits as node sync tests

### AI Chat Test Prerequisites

1. **Page Object needed**: `ai-chat.page.ts` or extend `toolbar.page.ts`
   - Methods: `openAiChat()`, `expectAiChatHidden()`, `expectAiChatDisabled()`

---

## Quick Reference: Current Test Counts

| Role | Tested | Missing | Total Expected |
|------|--------|---------|----------------|
| Viewer | 15 | 3 | 18 |
| Editor | 7 (1 skipped) | 4 | 12 |
| Commenter | 6 | 7 | 13 |
| **Total** | **28** | **14** | **43** |

---

## How to Run Placeholder Tests

```bash
# See all skipped tests
pnpm e2e --grep "@skip"

# Run only permission tests
pnpm e2e e2e/tests/sharing/permissions.spec.ts
```

---

## Changelog

- **2025-12-31**: Initial gap analysis created
