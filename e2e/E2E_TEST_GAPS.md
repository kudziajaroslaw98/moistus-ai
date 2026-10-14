# E2E Test Gaps - Permission Testing

> Last updated: 2026-01-17
> Location: `e2e/tests/sharing/permissions.spec.ts`

---

## Billing & Usage Limit Tests (NEW)

> Location: `e2e/tests/billing/usage-limits.spec.ts`
> Added: 2026-01-17

**Prerequisites**: Requires `SUPABASE_SERVICE_ROLE` in `.env.e2e.local`

| Test                                 | Status         | Description                                      |
| ------------------------------------ | -------------- | ------------------------------------------------ |
| Free user 402 on AI request          | ✅ Implemented | Verifies free tier users get 402 LIMIT_REACHED   |
| Pro user AI access                   | ✅ Implemented | Verifies Pro users don't hit limits              |
| Trialing user has Pro access         | ✅ Implemented | Verifies trial status grants Pro features        |
| Subscription period dates            | ✅ Implemented | Verifies billing period uses subscription dates  |
| Calendar month for free users        | ✅ Implemented | Verifies free users use calendar month           |
| Usage before period not counted      | ✅ Implemented | Verifies period boundary enforcement             |
| Upgrade adjustment reduces usage     | ✅ Implemented | Verifies mid-cycle upgrade gives remaining quota |
| Downgrade adjustment increases usage | ✅ Implemented | Verifies downgrade handling                      |
| Usage count accuracy                 | ✅ Implemented | Verifies count matches actual entries            |
| Mind maps count                      | ✅ Implemented | Verifies map count accuracy                      |

---

## Overview

Current permission test coverage has gaps, particularly around **Commentator role functionality** and **Viewer restrictions** for comment/AI features.

---

## Missing Tests by Role

### Viewer Role (View Access)

| Test                        | Priority  | Status      | Notes                                        |
| --------------------------- | --------- | ----------- | -------------------------------------------- |
| Cannot add comments         | 🔴 High   | `test.skip` | Comments button should be hidden             |
| Cannot view comment threads | 🟡 Medium | `test.skip` | Unclear if viewers can see existing comments |

### Commentator Role (Comment Access)

| Test                           | Priority  | Status      | Notes                                   |
| ------------------------------ | --------- | ----------- | --------------------------------------- |
| Can open Comments panel        | 🔴 High   | `test.skip` | Core commentator functionality          |
| Can add new comment thread     | 🔴 High   | `test.skip` | Core commentator functionality          |
| Can reply to existing comment  | 🔴 High   | `test.skip` | Core commentator functionality          |
| Can add emoji reactions        | 🟡 Medium | `test.skip` | Part of comment interactions            |
| Cannot delete others' comments | 🔴 High   | `test.skip` | Permission boundary                     |
| Real-time sync for comments    | 🟡 Medium | Not added   | Owner adds comment, commentator sees it |

### Editor Role (Edit Access)

| Test                | Priority  | Status      | Notes                                               |
| ------------------- | --------- | ----------- | --------------------------------------------------- |
| Can drag nodes      | 🟡 Medium | `test.skip` | Already exists, skipped due to React Flow flakiness |
| Can resize nodes    | 🟢 Low    | Not added   | Lower priority                                      |
| Can add comments    | 🟢 Low    | Not added   | Should work, lower priority to verify               |
| Can use AI features | 🟢 Low    | Not added   | Should work, lower priority to verify               |

---

## Implementation Notes

### Prerequisites for Comment Tests

1. **Page Object needed**: `comments-panel.page.ts`
   - Methods: `openPanel()`, `addComment(nodeId, text)`, `replyToComment(commentId, text)`, `addReaction(commentId, emoji)`, `deleteComment(commentId)`

2. **Fixtures**: May need to create comments via API in `beforeAll` for "reply" and "delete" tests

3. **Real-time considerations**: Comment sync tests need similar 2-3 second waits as node sync tests

---

## Quick Reference: Current Test Counts

| Role        | Tested        | Missing | Total Expected |
| ----------- | ------------- | ------- | -------------- |
| Viewer      | 15            | 2       | 17             |
| Editor      | 7 (1 skipped) | 4       | 12             |
| Commentator | 6             | 6       | 12             |
| **Total**   | **28**        | **12**  | **40**         |

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
