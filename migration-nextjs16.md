# Next.js 16.0.3 + React 19.2 + React Compiler Migration Plan

**Project**: Moistus AI Mind Map
**Date**: 2025-11-22
**Current Stack**: Next.js 15.5.5, React 19.2.0, TypeScript 5.9.2
**Target Stack**: Next.js 16.0.3, React 19.2.0, React Compiler enabled
**Migration Complexity**: MEDIUM
**Estimated Time**: 6 hours
**Risk Level**: LOW-MEDIUM

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Breaking Changes Analysis](#breaking-changes-analysis)
3. [Pre-Migration Checklist](#pre-migration-checklist)
4. [Migration Steps](#migration-steps)
5. [React Compiler Setup](#react-compiler-setup)
6. [Testing & Verification](#testing--verification)
7. [Rollback Plan](#rollback-plan)
8. [Post-Migration Optimization](#post-migration-optimization)
9. [Known Issues & Workarounds](#known-issues--workarounds)

---

## Executive Summary

### Current State
- **Next.js**: 15.5.5
- **React**: 19.2.0 (already on latest)
- **TypeScript**: 5.9.2 ✅ (compatible)
- **Node.js**: No version file (20.9.0+ required for Next.js 16)
- **Package Manager**: pnpm@10.16.1

### Migration Goals
- ✅ Upgrade to Next.js 16.0.3 for Turbopack stability & performance
- ✅ Enable React Compiler for automatic optimizations
- ✅ Maintain backward compatibility with existing features
- ✅ Ensure all real-time collaboration features work
- ✅ Verify Supabase authentication & database operations

### Good News
**Your codebase is well-prepared!** Most async patterns are already correctly implemented:
- ✅ 12/13 API routes already use `await params`
- ✅ All page components use correct async patterns
- ✅ Supabase client already awaits `cookies()`
- ✅ No deprecated PPR experimental flags
- ✅ Modern dependency versions
- ✅ Clean Next.js configuration

### Changes Required
1. **Rename middleware** → proxy (1 file)
2. **Fix 1 API route** with incorrect params usage
3. **Remove --turbopack flag** from dev script
4. **Enable React Compiler** in config
5. **Test all functionality** thoroughly

---

## Breaking Changes Analysis

### 1. Async Request APIs ⚠️ CRITICAL

Next.js 16 **removes synchronous access** to dynamic APIs. All must be awaited.

#### 1.1 `params` Prop

**Status**: ✅ **MOSTLY READY** (12/13 routes correct)

**Already Migrated Files** (✅ No changes needed):
```
✅ src/app/api/user/[userId]/public-profile/route.ts
✅ src/app/api/subscriptions/[id]/cancel/route.ts
✅ src/app/api/subscriptions/[id]/reactivate/route.ts
✅ src/app/api/history/[mapId]/snapshot/route.ts
✅ src/app/api/history/[mapId]/list/route.ts
✅ src/app/api/history/[mapId]/revert/route.ts
✅ src/app/api/history/[mapId]/delta/[id]/route.ts
✅ src/app/api/comments/[id]/route.ts
✅ src/app/api/comments/[id]/reactions/route.ts
✅ src/app/api/comments/[id]/messages/route.ts
✅ src/app/api/comments/[id]/messages/[messageId]/route.ts
✅ src/app/join/[token]/page.tsx (uses React.use())
```

**Needs Fix** (⚠️ 1 file):

**File**: `src/app/api/maps/[id]/route.ts`

**Current Implementation** (Lines 17-18):
```typescript
export async function GET(request: NextRequest) {
    const url = new URL(request.url);
    const id = url.pathname.split('/').filter(Boolean)[2]; // ❌ Manual parsing
    // ...
}
```

**Required Fix**:
```typescript
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params; // ✅ Correct Next.js 16 pattern
    // ...
}
```

**Also affects**: PUT and DELETE handlers in same file

#### 1.2 `searchParams` Prop

**Status**: ✅ **READY** (all correct)

All usages either:
- Use client-side `useSearchParams()` hook ✅
- Extract from `request.nextUrl.searchParams` ✅

No changes needed.

#### 1.3 `cookies()` from next/headers

**Status**: ✅ **ALREADY MIGRATED**

**File**: `src/helpers/supabase/server.ts`
```typescript
import { cookies } from 'next/headers';

export async function createClient() {
    const cookieStore = await cookies(); // ✅ Already correct
    // ...
}
```

#### 1.4 `headers()` from next/headers

**Status**: ✅ **NOT USED**

No files use `headers()` from next/headers. No changes needed.

#### 1.5 `draftMode()` from next/headers

**Status**: ✅ **NOT USED**

No files use `draftMode()`. No changes needed.

---

### 2. Middleware → Proxy Rename ⚠️ REQUIRED

**Breaking Change**: Next.js 16 renames `middleware.ts` → `proxy.ts`

**Current**: `src/middleware.ts` (82 lines)
- Handles Supabase auth session management
- Protects routes requiring authentication
- Uses Edge runtime

**Required Actions**:
1. Rename file: `src/middleware.ts` → `src/proxy.ts`
2. **Keep export name as `middleware`** (Next.js 16 still uses this export)
3. Update any imports if needed (unlikely)

**Export Signature** (remains unchanged):
```typescript
export async function middleware(req: NextRequest) {
    // ... auth logic
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
```

**Note**: According to Next.js 16 docs, the file is renamed to `proxy.ts` but the **export function name remains `middleware`**.

---

### 3. Turbopack (Now Stable & Default)

**Status**: ✅ Optional cleanup

**Current**: Dev script uses `--turbopack` flag
```json
"dev": "next dev --turbopack"
```

**Next.js 16 Change**: Turbopack is now the default bundler for both dev and production.

**Action**: Remove flag for cleaner config
```json
"dev": "next dev"
```

**Benefits**:
- Cleaner script
- Relies on Next.js 16 defaults
- Functionally identical (Turbopack still used)

**Performance Gains** (Next.js 15 → 16):
- 2-5× faster builds
- 10× faster Fast Refresh
- Stable for production

---

### 4. React Compiler (New Feature)

**Status**: 🆕 **ENABLING** (your choice)

**What it does**:
- Automatic memoization of components
- Reduces unnecessary re-renders
- Zero manual code changes required
- Powered by Babel (temporary, SWC support coming)

**Build Impact**:
- Development: ~10-20% slower compile times
- Production build: Slightly longer first build
- Runtime: **Faster** (fewer re-renders)

**Configuration** (to be added):
```typescript
// next.config.ts
const nextConfig: NextConfig = {
    reactStrictMode: true,
    reactCompiler: true, // 🆕 Enable automatic optimizations
    // ... rest of config
};
```

**Next.js 16 Optimizations**:
- Only compiles files with JSX or React Hooks
- Skips non-React files for minimal impact
- Smart caching reduces rebuild times

**Future-Proof**: Next.js team working on native SWC/OXC support (no Babel dependency in future).

---

### 5. Minimum Version Requirements

| Requirement | Current | Required | Status |
|------------|---------|----------|--------|
| Node.js | Unknown | 20.9.0+ | ⚠️ Verify |
| TypeScript | 5.9.2 | 5.1.0+ | ✅ Compatible |
| React | 19.2.0 | 18.2.0+ | ✅ Latest |
| Browser: Chrome | - | 111+ | ✅ Modern |
| Browser: Safari | - | 16.4+ | ✅ Modern |

**Action**: No changes needed (skipping .nvmrc per your choice)

---

### 6. Third-Party Dependencies

**Analysis**: ✅ All compatible

| Package | Current | React 19 | Next.js 16 | Risk |
|---------|---------|----------|------------|------|
| @supabase/ssr | 0.6.1 | ✅ | ✅ | LOW |
| @supabase/supabase-js | 2.49.4 | ✅ | ✅ | LOW |
| @xyflow/react | 12.8.6 | ✅ | ✅ | LOW |
| motion | 12.23.22 | ✅ | ✅ | LOW |
| ai (Vercel AI SDK) | 5.0.5 | ✅ | ⚡ Test | MEDIUM |
| stripe | 19.3.1 | ✅ | ✅ | LOW |
| Radix UI (all) | Latest | ✅ | ✅ | LOW |
| zustand | 5.0.7 | ✅ | ✅ | LOW |

**Note on AI SDK**: Streaming features need testing post-migration. Version 5.0.5 is recent and should work.

---

### 7. Image Components

**Status**: ✅ **COMPATIBLE**

**6 files using next/image**:
- `src/components/nodes/image-node.tsx`
- `src/components/nodes/resource-node.tsx`
- `src/components/mind-map/react-flow-area.tsx`
- `src/components/history/history-item.tsx`
- `src/components/dashboard/dashboard-layout.tsx`
- `src/app/(landing)/page.tsx`

**Configuration** (already Next.js 16 compatible):
```typescript
images: {
    remotePatterns: [
        { protocol: 'https', hostname: '**.**' },
        { protocol: 'https', hostname: 'images.pexels.com' },
        { protocol: 'https', hostname: 'media2.dev.to' },
        { protocol: 'https', hostname: 'cdn.discordapp.com' },
        { protocol: 'https', hostname: 'api.dicebear.com' },
    ],
}
```

No changes needed. ✅

---

### 8. Caching & Dynamic Rendering

**Status**: ✅ **CLEAN**

**Next.js 16 introduces**:
- Cache Components with `"use cache"` directive (opt-in)
- Replaces implicit caching from App Router

**Your codebase**:
- ❌ No experimental PPR flags
- ❌ No custom caching configs
- ❌ No `revalidate` exports found
- ❌ No `fetchCache` configurations

**Recommendation**: Stay with Next.js 16 defaults. Explore Cache Components later if needed.

---

## Pre-Migration Checklist

### ✅ Before You Start

- [ ] **Create feature branch**
  ```bash
  git checkout -b migration/nextjs-16
  ```

- [ ] **Ensure clean working directory**
  ```bash
  git status
  # Should show: nothing to commit, working tree clean
  ```

- [ ] **Backup current state**
  ```bash
  git tag pre-nextjs16-migration
  git push origin pre-nextjs16-migration
  ```

- [ ] **Verify Node.js version**
  ```bash
  node --version
  # Should be >= 20.9.0
  ```

- [ ] **Clear existing builds**
  ```bash
  rm -rf .next
  rm -rf node_modules/.cache
  ```

- [ ] **Run current build (baseline)**
  ```bash
  pnpm type-check
  pnpm build
  # Document any existing warnings/errors
  ```

---

## Migration Steps

### Phase 1: Code Changes (Before Upgrade)

#### Step 1.1: Rename Middleware File

**Time**: 2 minutes

```bash
# Rename the file
git mv src/middleware.ts src/proxy.ts
```

**Verify**: File renamed, export signature unchanged:
```typescript
// src/proxy.ts
export async function middleware(req: NextRequest) { /* ... */ }
export const config = { /* ... */ };
```

**No changes to exports required** - Next.js 16 still uses `middleware` export name.

---

#### Step 1.2: Fix Maps API Route

**Time**: 5 minutes

**File**: `src/app/api/maps/[id]/route.ts`

**Find all handlers**: GET, PUT, DELETE (Lines ~17, ~45, ~70)

**Current Pattern** (❌ Incorrect):
```typescript
export async function GET(request: NextRequest) {
    const url = new URL(request.url);
    const id = url.pathname.split('/').filter(Boolean)[2];
    // ...
}
```

**Updated Pattern** (✅ Correct):
```typescript
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    // ... rest of logic unchanged
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    // ... rest of logic unchanged
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    // ... rest of logic unchanged
}
```

**Impact**:
- Remove URL parsing logic
- Use proper params from Next.js
- Type-safe with Promise<{ id: string }>

---

#### Step 1.3: Update package.json Scripts

**Time**: 1 minute

**File**: `package.json`

**Current**:
```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    // ...
  }
}
```

**Updated**:
```json
{
  "scripts": {
    "dev": "next dev",
    // ...
  }
}
```

**Reason**: Turbopack is now default in Next.js 16. Flag no longer needed.

---

#### Step 1.4: Update next.config.ts

**Time**: 2 minutes

**File**: `next.config.ts`

**Current**:
```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
	reactStrictMode: true,
	devIndicators: {
		position: 'bottom-right',
	},
	images: {
		remotePatterns: [
			// ... existing patterns
		],
	},
};

export default nextConfig;
```

**Updated** (add React Compiler):
```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
	reactStrictMode: true,
	reactCompiler: true, // 🆕 Enable React Compiler
	devIndicators: {
		position: 'bottom-right',
	},
	images: {
		remotePatterns: [
			// ... existing patterns
		],
	},
};

export default nextConfig;
```

---

#### Step 1.5: Commit Pre-Migration Changes

**Time**: 2 minutes

```bash
git add .
git commit -m "chore: prepare for Next.js 16 migration

- Rename middleware.ts to proxy.ts (Next.js 16 requirement)
- Fix maps/[id]/route.ts to use async params properly
- Remove --turbopack flag from dev script (now default)
- Enable React Compiler in next.config.ts
"
```

---

### Phase 2: Dependency Upgrade

#### Step 2.1: Upgrade Next.js

**Time**: 2-5 minutes (depending on network)

**Option A: Automatic (Recommended)**
```bash
npx @next/codemod@canary upgrade latest
```

This will:
- Update Next.js to 16.0.3
- Update React packages if needed
- Run codemods for common patterns
- Update ESLint config

**Option B: Manual**
```bash
pnpm add next@16.0.3
pnpm add -D eslint-config-next@16.0.3
```

**Verify versions**:
```bash
pnpm list next react react-dom
# Expected:
# next@16.0.3
# react@19.2.0
# react-dom@19.2.0
```

---

#### Step 2.2: Install Dependencies

**Time**: 2-3 minutes

```bash
pnpm install
```

**Expected Output**:
- New lock file entries for Next.js 16
- Potential peer dependency warnings (normal)
- No errors

---

#### Step 2.3: Commit Dependency Changes

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: upgrade to Next.js 16.0.3

- Update Next.js from 15.5.5 to 16.0.3
- Update eslint-config-next to 16.0.3
- React remains at 19.2.0 (already latest)
"
```

---

### Phase 3: Testing & Verification

#### Step 3.1: TypeScript Type Checking

**Time**: 1-2 minutes

```bash
pnpm type-check
```

**Expected**: ✅ No errors

**If errors occur**:
1. Check `params` types in API routes
2. Verify async/await patterns
3. Check for any deprecated Next.js types

**Common Issues & Fixes**:

```typescript
// ❌ Error: Property 'params' does not exist
export async function GET(request: NextRequest) {
    const { id } = params; // Error
}

// ✅ Fix: Add params to function signature
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params; // Works
}
```

---

#### Step 3.2: Production Build Test

**Time**: 5-10 minutes (first build with React Compiler)

```bash
pnpm build
```

**Expected Behavior**:
1. ⏱️ Slightly longer build time (React Compiler overhead)
2. ✅ No build errors
3. ℹ️ May see React Compiler optimization messages
4. ✅ Build completes successfully

**Build Output to Watch**:
```
Route (app)                              Size     First Load JS
┌ ○ /                                    X kB          XX kB
├ ○ /join                                X kB          XX kB
├ ○ /join/[token]                        X kB          XX kB
└ ○ /mind-map/[id]                       X kB          XX kB
```

**React Compiler Messages** (informational):
```
React Compiler optimized XX components
```

**If build fails**:
1. Check error messages for specific files
2. Look for syntax errors in recent changes
3. Verify all async patterns are correct
4. Check for incompatible dependencies

---

#### Step 3.3: Development Server Test

**Time**: 5 minutes

```bash
pnpm dev
```

**Verify**:
- [ ] Server starts without errors
- [ ] Navigate to `http://localhost:3000`
- [ ] Landing page loads correctly
- [ ] Check browser console for errors
- [ ] Hot reload works (make a small change, save)

**First Dev Server Start**:
- May be slower (React Compiler + Turbopack initialization)
- Subsequent starts should be fast
- Fast Refresh should be noticeably quicker

---

#### Step 3.4: Critical Feature Testing

**Time**: 30-45 minutes

Use this checklist to verify all critical features work:

##### Authentication & User Flow
- [ ] **Anonymous user creation**
  - Open incognito/private window
  - Navigate to app
  - Verify anonymous user created
  - Check browser console for Supabase errors

- [ ] **User authentication**
  - Sign up with email
  - Sign in with existing account
  - Verify session persistence
  - Check cookies are set correctly

- [ ] **Protected routes**
  - Try accessing `/mind-map/[id]` without auth
  - Verify redirect works
  - Check middleware (proxy) functionality

##### Mind Map Core Features
- [ ] **Create new mind map**
  - Click "New Map"
  - Verify map creation
  - Check database entry in Supabase

- [ ] **Add nodes**
  - Create default node
  - Create task node
  - Create code node
  - Create question node
  - Verify all node types render

- [ ] **Connect nodes**
  - Create edge between nodes
  - Verify edge rendering
  - Check parent-child relationships

- [ ] **Node operations**
  - Edit node content
  - Delete node
  - Duplicate node (clipboard)
  - Move node position
  - Collapse/expand node

- [ ] **Group operations**
  - Create group
  - Add nodes to group
  - Ungroup nodes

- [ ] **Layout features**
  - Auto-layout (horizontal)
  - Auto-layout (vertical)
  - Auto-layout (radial)

##### AI Features
- [ ] **AI suggestions**
  - Select node
  - Request AI suggestions
  - Verify ghost nodes appear
  - Accept suggestion
  - Verify streaming works

- [ ] **AI chat** (if re-enabled)
  - Open AI chat panel
  - Send message
  - Verify response streams
  - Check context awareness

- [ ] **Generate content**
  - Use AI to generate node content
  - Verify API route works
  - Check Gemini/OpenAI integration

##### Real-time Collaboration
- [ ] **Sharing**
  - Create share link
  - Open in another browser
  - Verify room code works
  - Check anonymous join flow

- [ ] **Live updates**
  - Edit node in one browser
  - Verify update in other browser
  - Check Supabase Realtime connection

- [ ] **Active users**
  - Join room from 2+ browsers
  - Verify avatar stack shows all users
  - Check live cursors appear

- [ ] **Conflict resolution**
  - Edit same node simultaneously
  - Verify conflict detection
  - Check merge behavior

##### History & Undo/Redo
- [ ] **Undo/Redo**
  - Make changes
  - Press Ctrl+Z (undo)
  - Press Ctrl+Shift+Z (redo)
  - Verify state reverts correctly

- [ ] **History snapshots**
  - Check history panel
  - Verify snapshots created
  - Revert to previous snapshot

##### Subscription & Billing
- [ ] **Stripe integration**
  - Navigate to subscription page
  - Verify plan details load
  - Check Stripe publishable key works
  - Test upgrade flow (use Stripe test mode)

- [ ] **Usage limits**
  - Create nodes (check limits)
  - Test AI suggestions (check limits)
  - Verify limit enforcement

##### Image & Media
- [ ] **Image nodes**
  - Create image node
  - Add image URL
  - Verify image loads
  - Check next/image optimization

- [ ] **Resource nodes**
  - Create resource node with image
  - Verify thumbnail renders

##### Performance
- [ ] **Large maps**
  - Create map with 50+ nodes
  - Verify smooth panning/zooming
  - Check no performance degradation

- [ ] **Fast Refresh**
  - Make code change
  - Verify hot reload works
  - Check state preservation

##### Browser Compatibility
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari 16.4+ (if on macOS)

---

#### Step 3.5: Build Output Analysis

**Time**: 5 minutes

Compare build sizes before/after:

**Pre-Migration** (Next.js 15.5.5):
```bash
# Run on main branch
git checkout main
pnpm build
# Note bundle sizes
```

**Post-Migration** (Next.js 16.0.3):
```bash
# Run on migration branch
git checkout migration/nextjs-16
pnpm build
# Compare bundle sizes
```

**Expected Changes**:
- 📦 Slightly smaller bundles (Turbopack optimizations)
- ⚡ Faster build time (2-5× improvement)
- 🎯 Better tree-shaking

**React Compiler Impact**:
- May slightly increase bundle size (compiler runtime)
- Should improve runtime performance (fewer re-renders)

---

### Phase 4: Commit & Deploy

#### Step 4.1: Final Commit

```bash
git add .
git commit -m "feat: complete Next.js 16 migration

Upgraded to Next.js 16.0.3 with following improvements:

Breaking Changes:
- Renamed middleware.ts to proxy.ts (Next.js 16 requirement)
- Updated maps/[id]/route.ts to use async params

New Features:
- Enabled React Compiler for automatic optimizations
- Turbopack now stable for production builds
- Removed --turbopack flag (now default)

Testing:
- ✅ All type checks pass
- ✅ Production build successful
- ✅ Dev server works correctly
- ✅ Critical features verified (auth, real-time, AI, etc.)

Performance:
- 2-5× faster builds
- 10× faster Fast Refresh
- Automatic component memoization

Dependencies:
- Next.js: 15.5.5 → 16.0.3
- React: 19.2.0 (unchanged)
- TypeScript: 5.9.2 (compatible)
"
```

---

#### Step 4.2: Push to Remote

```bash
git push origin migration/nextjs-16
```

---

#### Step 4.3: Create Pull Request

**PR Title**: `feat: Upgrade to Next.js 16.0.3 + Enable React Compiler`

**PR Description Template**:

```markdown
## Migration Summary

Upgrades the project from Next.js 15.5.5 to 16.0.3 with React Compiler enabled.

## Changes

### Breaking Changes
- 🔄 Renamed `middleware.ts` → `proxy.ts` (Next.js 16 requirement)
- 🔄 Fixed `maps/[id]/route.ts` to use async params properly

### New Features
- ✨ Enabled React Compiler for automatic optimizations
- ✨ Turbopack now stable for production (default bundler)
- ✨ Removed `--turbopack` flag from dev script

### Performance Improvements
- ⚡ 2-5× faster production builds
- ⚡ 10× faster Fast Refresh in development
- ⚡ Automatic component memoization (React Compiler)

## Testing

### Automated
- [x] TypeScript type checking passes
- [x] Production build successful
- [x] No ESLint errors

### Manual Verification
- [x] Authentication flow works
- [x] Mind map CRUD operations
- [x] Real-time collaboration
- [x] AI features (suggestions, chat)
- [x] Undo/Redo functionality
- [x] Image components render
- [x] Subscription/billing integration

## Rollback Plan

If issues arise:
\`\`\`bash
git revert <merge-commit>
git push origin main
\`\`\`

Or use pre-migration tag:
\`\`\`bash
git checkout pre-nextjs16-migration
\`\`\`

## Dependencies

| Package | Before | After |
|---------|--------|-------|
| next | 15.5.5 | 16.0.3 |
| eslint-config-next | 15.5.2 | 16.0.3 |
| react | 19.2.0 | 19.2.0 ✅ |
| react-dom | 19.2.0 | 19.2.0 ✅ |

## Notes

- Build times may be slightly longer initially due to React Compiler (Babel dependency)
- Runtime performance should improve from automatic memoization
- Next.js team working on SWC support for React Compiler (future: no Babel)

## References

- [Next.js 16 Release Notes](https://nextjs.org/blog/next-16)
- [Next.js 16 Migration Guide](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [React Compiler Documentation](https://react.dev/learn/react-compiler)
```

---

#### Step 4.4: Staging Deployment (Optional)

If you have staging environment:

```bash
# Deploy to staging
vercel --prod --scope=staging

# Or platform-specific command
# netlify deploy --prod
# etc.
```

**Verify staging**:
- [ ] All features work
- [ ] No console errors
- [ ] Performance is good
- [ ] Real-time works across browsers

---

#### Step 4.5: Production Deployment

Once PR is approved and merged:

```bash
git checkout main
git pull origin main

# Deploy to production
vercel --prod

# Or let CI/CD handle it
```

---

## React Compiler Setup

### What React Compiler Does

**Automatic Optimizations**:
```tsx
// Before (you had to manually optimize):
const ExpensiveComponent = React.memo(({ data }) => {
    const processed = useMemo(() => processData(data), [data]);
    const handler = useCallback(() => doSomething(), []);

    return <div>{processed}</div>;
});

// After (React Compiler handles automatically):
const ExpensiveComponent = ({ data }) => {
    const processed = processData(data); // Auto-memoized
    const handler = () => doSomething(); // Auto-memoized

    return <div>{processed}</div>; // Auto-memoized
};
```

**Benefits for Your Codebase**:
1. **Node Components** - Auto-optimized (19 slice store selectors)
2. **Real-time Updates** - Fewer re-renders on Supabase broadcasts
3. **Canvas Performance** - React Flow nodes memoized automatically
4. **AI Streaming** - Efficient updates during streaming responses

---

### Configuration Details

**File**: `next.config.ts`

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
	reactStrictMode: true,

	// 🆕 React Compiler - Automatic memoization
	reactCompiler: true,

	devIndicators: {
		position: 'bottom-right',
	},

	images: {
		remotePatterns: [
			{ protocol: 'https', hostname: '**.**' },
			{ protocol: 'https', hostname: 'images.pexels.com' },
			{ protocol: 'https', hostname: 'media2.dev.to' },
			{ protocol: 'https', hostname: 'cdn.discordapp.com' },
			{ protocol: 'https', hostname: 'api.dicebear.com' },
		],
	},
};

export default nextConfig;
```

---

### Build Impact

**Development**:
- First compile: +15-30 seconds
- Subsequent compiles: Cached, minimal impact
- Fast Refresh: Faster (React Compiler + Turbopack)

**Production Build**:
- First build: +10-20% time (Babel overhead)
- Rebuild: Faster (smart caching)
- Bundle size: +small increase (compiler runtime ~5-10KB)

**Next.js 16 Optimizations**:
```
Compiling files with React Compiler:
✓ src/components/nodes/default-node.tsx
✓ src/components/nodes/task-node.tsx
✓ src/components/mind-map/react-flow-area.tsx
✓ src/store/mind-map-store.tsx (selectors)
... (only relevant files)

Skipping non-React files:
○ src/types/*.ts
○ src/helpers/*.ts
○ src/constants/*.ts
```

---

### Runtime Benefits

**Automatic Optimizations Applied To**:

1. **Node Components** (11 types)
   - `default-node.tsx`, `task-node.tsx`, etc.
   - Auto-memoized based on props
   - Fewer re-renders during canvas operations

2. **Zustand Selectors** (19 slices)
   - Store subscriptions optimized
   - Only re-render when relevant state changes

3. **Real-time Components**
   - `live-cursors.tsx`
   - `avatar-stack.tsx`
   - `active-users.tsx`
   - Efficient updates on Supabase broadcasts

4. **AI Streaming Components**
   - `ai-chat/*.tsx`
   - `ghost-node.tsx`
   - Optimized render during streaming

5. **Large Lists**
   - Node list rendering
   - History items
   - Comment threads

**Expected Performance Gains**:
- 10-30% fewer re-renders
- Smoother canvas interactions
- Better performance with large maps
- Faster streaming updates

---

### Monitoring React Compiler

**Development Console**:
```typescript
// React Compiler adds helpful warnings
console.log('Component optimized by React Compiler');
```

**React DevTools**:
- Install React DevTools extension
- Check "Components" tab
- Look for "memo" indicators (automatic)

**Profiler**:
```typescript
// Before/after comparison
// Run Profiler in React DevTools
// Compare re-render counts
```

---

### Opt-Out (If Needed)

**Per-component opt-out**:
```tsx
// If a specific component has issues
'use no memo'; // Disables compiler for this component

export default function ProblematicComponent() {
    // Component code
}
```

**Disable entirely**:
```typescript
// next.config.ts
const nextConfig: NextConfig = {
    reactCompiler: false, // Disable if issues arise
};
```

---

### Future: Annotation Mode

**If you prefer gradual adoption**:

```typescript
// next.config.ts
const nextConfig: NextConfig = {
    reactCompiler: {
        compilationMode: 'annotation', // Opt-in per component
    },
};
```

```tsx
// Then mark components explicitly
export default function MyComponent() {
    'use memo'; // Only this component is optimized
    // ...
}
```

**Note**: We're using global mode (recommended) for automatic benefits.

---

## Testing & Verification

### Test Plan Overview

**Coverage Areas**:
1. ✅ Authentication & Session Management
2. ✅ Mind Map CRUD Operations
3. ✅ Real-time Collaboration
4. ✅ AI Features (Suggestions, Chat, Generation)
5. ✅ History & Undo/Redo
6. ✅ Subscription & Billing
7. ✅ Image Rendering
8. ✅ Performance & Responsiveness

**Testing Environments**:
- [ ] Local Development (`pnpm dev`)
- [ ] Production Build (`pnpm build` → `pnpm start`)
- [ ] Staging (if available)
- [ ] Production (after full verification)

---

### Automated Tests

#### TypeScript Compilation
```bash
pnpm type-check
```

**Expected**: No errors
**Time**: 1-2 minutes

**If errors occur**:
1. Check file paths in errors
2. Verify async/await patterns
3. Update type definitions if needed

---

#### Build Verification
```bash
pnpm build
```

**Expected**: Successful build
**Time**: 5-10 minutes (first build)

**Build Metrics to Check**:
- No build errors ✅
- Route compilation successful ✅
- Static generation works ✅
- Bundle sizes reasonable ✅

---

#### Linting
```bash
pnpm lint
```

**Expected**: No errors (warnings OK)
**Time**: 30 seconds

---

### Manual Testing Checklist

Use this comprehensive checklist. Test in order for best coverage.

#### 1. Environment Setup
- [ ] `.env.local` configured correctly
- [ ] Supabase URL/keys set
- [ ] AI API keys configured (Gemini/OpenAI)
- [ ] Stripe keys configured

#### 2. Development Server
```bash
pnpm dev
```
- [ ] Server starts without errors
- [ ] Navigate to `localhost:3000`
- [ ] No console errors
- [ ] Hot reload works

#### 3. Authentication Flow

**Anonymous Users**:
- [ ] Open incognito window
- [ ] Navigate to app
- [ ] Verify anonymous user auto-created
- [ ] Check Supabase auth table
- [ ] Cookies set correctly

**Sign Up**:
- [ ] Navigate to signup
- [ ] Create new account
- [ ] Verify email confirmation (if enabled)
- [ ] Session persists on refresh

**Sign In**:
- [ ] Sign in with existing account
- [ ] Verify redirect to dashboard
- [ ] Session cookies present

**Sign Out**:
- [ ] Sign out
- [ ] Verify redirect to landing
- [ ] Session cleared

**Protected Routes** (`src/proxy.ts` testing):
- [ ] Try accessing `/mind-map/[id]` without auth
- [ ] Verify redirect to login/home
- [ ] Sign in, access again
- [ ] Verify access granted

#### 4. Mind Map Operations

**Create Map**:
- [ ] Click "New Map"
- [ ] Map created in Supabase
- [ ] Navigate to map view
- [ ] Canvas loads

**Node Operations**:
- [ ] **Create** default node
- [ ] **Create** task node (`/task` command)
- [ ] **Create** code node (`/code` command)
- [ ] **Create** question node (`/question` command)
- [ ] **Create** annotation node
- [ ] **Create** resource node
- [ ] **Edit** node content (double-click)
- [ ] **Delete** node (select + Delete key)
- [ ] **Move** node (drag)
- [ ] **Resize** node (handles)
- [ ] **Duplicate** node (Ctrl+D)

**Edge Operations**:
- [ ] **Create** edge (connect nodes)
- [ ] **Delete** edge (select + Delete)
- [ ] **Edit** edge label
- [ ] Parent-child relationship preserved

**Group Operations**:
- [ ] **Create** group (select nodes + group button)
- [ ] **Add** node to group
- [ ] **Remove** node from group
- [ ] **Ungroup** (ungroup button)
- [ ] Group moves all children

**Collapse/Expand**:
- [ ] Collapse node (collapse button)
- [ ] Children hidden
- [ ] Expand node
- [ ] Children visible

**Layout**:
- [ ] Auto-layout: Horizontal
- [ ] Auto-layout: Vertical
- [ ] Auto-layout: Radial
- [ ] Manual position preserved after layout

#### 5. AI Features

**AI Suggestions** (`src/app/api/ai/suggestions/route.ts`):
- [ ] Select node
- [ ] Click "AI Suggestions"
- [ ] Ghost nodes appear
- [ ] Streaming works (incremental display)
- [ ] Accept suggestion
- [ ] Ghost node → real node
- [ ] Reject suggestion
- [ ] Ghost node removed

**AI Connections**:
- [ ] Select nodes
- [ ] "Suggest Connections"
- [ ] AI recommends edges
- [ ] Apply suggestions

**AI Content Generation**:
- [ ] Select node
- [ ] "Generate Content"
- [ ] Content streams in
- [ ] Node updated

**Note**: AI Chat route is currently disabled. Skip if not re-enabled.

#### 6. Real-time Collaboration

**Create Share Link**:
- [ ] Open share menu
- [ ] Create room code
- [ ] Copy share link

**Join Room**:
- [ ] Open link in incognito/another browser
- [ ] Anonymous user joins
- [ ] Both browsers show in avatar stack

**Live Updates** (Supabase Realtime):
- [ ] Edit node in Browser A
- [ ] See update in Browser B (within 1-2 seconds)
- [ ] Edit node in Browser B
- [ ] See update in Browser A
- [ ] Test with: create, update, delete, move

**Active Users**:
- [ ] Avatar stack shows all users
- [ ] Max 3 avatars + count
- [ ] Users leave → avatar removed

**Live Cursors**:
- [ ] Move cursor in Browser A
- [ ] See cursor in Browser B
- [ ] Cursor labeled with username
- [ ] Smooth movement

**Conflict Resolution**:
- [ ] Edit same node simultaneously
- [ ] Check conflict detection
- [ ] Verify last-write-wins or merge behavior

#### 7. History & Undo/Redo

**Undo/Redo** (`history-slice`):
- [ ] Make change (add node)
- [ ] Press `Ctrl+Z` (undo)
- [ ] Node removed
- [ ] Press `Ctrl+Shift+Z` (redo)
- [ ] Node re-added
- [ ] Test with multiple operations

**History Snapshots** (API routes):
- [ ] Make changes
- [ ] Check history panel
- [ ] Snapshots auto-created
- [ ] View snapshot details
- [ ] Revert to snapshot
- [ ] Map state restored

**Storage Cleanup**:
- [ ] Check `src/app/api/cron/cleanup-history/route.ts`
- [ ] Old snapshots cleaned up (background)

#### 8. Subscription & Billing

**View Plans**:
- [ ] Navigate to subscription page
- [ ] Free/Pro/Enterprise plans displayed
- [ ] Features listed correctly

**Stripe Integration**:
- [ ] Click "Upgrade to Pro"
- [ ] Stripe checkout loads
- [ ] Publishable key works
- [ ] Test card: `4242 4242 4242 4242`
- [ ] Complete checkout (test mode)

**Usage Limits**:
- [ ] Create nodes until limit
- [ ] Verify limit enforced
- [ ] Error message shown
- [ ] Upgrade prompt displayed

**Subscription Status**:
- [ ] Active subscription shown
- [ ] Usage metrics displayed
- [ ] Cancel/reactivate works

#### 9. Images & Media

**Image Nodes** (`next/image` testing):
- [ ] Create image node
- [ ] Add image URL
- [ ] Image loads and displays
- [ ] Optimization applied (check Network tab)
- [ ] Remote pattern allowed (config check)

**Resource Nodes**:
- [ ] Create resource node
- [ ] Add thumbnail URL
- [ ] Thumbnail renders

**Avatar Images**:
- [ ] User profile avatar
- [ ] Dicebear API images work
- [ ] Custom upload works (if enabled)

#### 10. Performance

**Large Maps**:
- [ ] Create 50+ nodes
- [ ] Pan canvas (smooth)
- [ ] Zoom in/out (smooth)
- [ ] Select multiple nodes (responsive)
- [ ] No lag or stuttering

**Fast Refresh** (Turbopack):
- [ ] Edit component file
- [ ] Save
- [ ] Changes reflect instantly (~100ms)
- [ ] State preserved
- [ ] No full reload

**Build Performance**:
- [ ] Note build time (should be faster than Next.js 15)
- [ ] Check bundle sizes (should be optimized)

**React Compiler Benefits**:
- [ ] Open React DevTools
- [ ] Check component re-renders
- [ ] Should see fewer re-renders vs Next.js 15

#### 11. Browser Compatibility

Test in multiple browsers:

**Chrome/Edge (Chromium 111+)**:
- [ ] All features work
- [ ] No console errors
- [ ] Smooth performance

**Firefox (111+)**:
- [ ] All features work
- [ ] Real-time works
- [ ] Canvas interactions smooth

**Safari (16.4+)** (macOS only):
- [ ] All features work
- [ ] Check image loading
- [ ] Verify real-time

#### 12. Responsive Design

Test different screen sizes:

**Desktop** (1920x1080):
- [ ] Layout correct
- [ ] Canvas full-screen
- [ ] Panels positioned correctly

**Laptop** (1366x768):
- [ ] All UI visible
- [ ] No overlapping elements

**Tablet** (iPad - 1024x768):
- [ ] Touch interactions work
- [ ] Canvas zoomable

**Mobile** (375x667):
- [ ] Responsive layout
- [ ] Touch controls work
- [ ] Viewport meta tag correct

#### 13. Error Handling

**Network Errors**:
- [ ] Disconnect network
- [ ] Trigger API call
- [ ] Error toast shown
- [ ] Reconnect
- [ ] Retry works

**API Errors**:
- [ ] Invalid input
- [ ] Error message shown
- [ ] User can recover

**Supabase Errors**:
- [ ] Invalid auth
- [ ] Error handling works
- [ ] User redirected/notified

#### 14. Accessibility

**Keyboard Navigation**:
- [ ] Tab through UI
- [ ] Focus indicators visible
- [ ] Enter activates buttons
- [ ] Escape closes modals

**Screen Reader** (basic check):
- [ ] ARIA labels present
- [ ] Buttons labeled
- [ ] Form inputs labeled

**Color Contrast**:
- [ ] Text readable
- [ ] Dark mode correct
- [ ] Focus states visible

---

### Performance Benchmarks

#### Build Time Comparison

**Measure before/after**:

```bash
# Next.js 15.5.5 (before)
time pnpm build
# Note: Real time

# Next.js 16.0.3 (after)
time pnpm build
# Note: Real time

# Expected: 2-5× faster
```

#### Bundle Size Comparison

**Check output**:

```bash
pnpm build

# Compare "First Load JS" sizes
# Should be similar or smaller with Next.js 16
```

#### Fast Refresh Speed

**Manual test**:

```bash
pnpm dev

# Edit component
# Save
# Time to browser update

# Expected: <100ms (10× faster than webpack)
```

#### Runtime Performance

**React DevTools Profiler**:

1. Open React DevTools
2. Go to "Profiler" tab
3. Click "Record"
4. Perform actions (add nodes, edit, etc.)
5. Stop recording
6. Check:
   - Component render count
   - Render duration
   - React Compiler optimizations

**Expected with React Compiler**:
- 10-30% fewer renders
- Faster render times
- Automatic memoization visible in flamegraph

---

### Regression Testing

**Critical User Flows** (end-to-end):

#### Flow 1: New User Journey
1. Land on homepage
2. Click "Get Started"
3. Anonymous user created
4. Create first mind map
5. Add nodes
6. Save map
7. Sign up for account
8. Verify map persists

#### Flow 2: Collaboration Session
1. User A creates map
2. User A generates share link
3. User B joins via link
4. User A adds node
5. User B sees node (real-time)
6. User B edits node
7. User A sees edit (real-time)
8. Both users see each other in avatar stack

#### Flow 3: AI-Assisted Mind Mapping
1. Create new map
2. Add root node "Project Planning"
3. Request AI suggestions
4. Ghost nodes appear
5. Accept 2 suggestions
6. Expand with more AI suggestions
7. Use AI to generate content for nodes
8. Save final map

#### Flow 4: Subscription Upgrade
1. Free user creates maps
2. Hit free tier limit
3. See upgrade prompt
4. Click "Upgrade to Pro"
5. Stripe checkout opens
6. Complete payment (test mode)
7. Subscription active
8. Limits increased
9. Continue working

---

### Bug Triage

If issues found during testing:

#### Severity Levels

**P0 - Blocker** (Deploy blocker):
- App doesn't start
- Auth completely broken
- Data loss
- Security vulnerability

**P1 - Critical** (Fix before deploy):
- Major feature broken
- Real-time not working
- AI features failing
- Subscription issues

**P2 - High** (Fix soon):
- Minor feature issues
- UI glitches
- Performance degradation
- Console errors

**P3 - Low** (Backlog):
- Cosmetic issues
- Edge case bugs
- Nice-to-have improvements

#### Bug Report Template

```markdown
### Bug Report

**Title**: [Brief description]

**Severity**: P0 | P1 | P2 | P3

**Environment**:
- Next.js: 16.0.3
- Browser: [Chrome 120, etc.]
- OS: [Windows 11, macOS, etc.]

**Steps to Reproduce**:
1. Step 1
2. Step 2
3. Step 3

**Expected Result**:
[What should happen]

**Actual Result**:
[What actually happens]

**Screenshots/Video**:
[Attach if applicable]

**Console Errors**:
```
[Paste console output]
```

**Additional Context**:
[Any other relevant info]
```

---

## Rollback Plan

If critical issues arise post-migration:

### Option 1: Git Revert

**If already merged to main**:

```bash
# Find the merge commit
git log --oneline --graph

# Revert the merge commit
git revert -m 1 <merge-commit-sha>

# Push
git push origin main

# Redeploy
vercel --prod # or your deployment command
```

**Downtime**: ~5-10 minutes

---

### Option 2: Use Pre-Migration Tag

**If you tagged before migration**:

```bash
# Checkout pre-migration state
git checkout pre-nextjs16-migration

# Create hotfix branch
git checkout -b hotfix/revert-to-nextjs15

# Force push to main (⚠️ use with caution)
git push origin hotfix/revert-to-nextjs15

# Or merge to main
git checkout main
git merge hotfix/revert-to-nextjs15
git push origin main
```

**Downtime**: ~10-15 minutes

---

### Option 3: Emergency Hotfix

**If one specific feature broken**:

1. **Identify issue**
   ```bash
   # Check logs
   vercel logs
   # Or check console errors
   ```

2. **Quick fix**
   ```bash
   git checkout -b hotfix/fix-issue
   # Make minimal fix
   git commit -m "hotfix: [description]"
   git push origin hotfix/fix-issue
   ```

3. **Fast-track deploy**
   ```bash
   # Merge without PR (emergency only)
   git checkout main
   git merge hotfix/fix-issue
   git push origin main
   ```

**Downtime**: Minimal (~2-5 minutes)

---

### Rollback Verification

After rollback:

- [ ] App starts successfully
- [ ] Auth works
- [ ] Real-time collaboration works
- [ ] No data loss
- [ ] Users can access existing maps
- [ ] All critical features operational

---

### Post-Rollback Action

If you had to rollback:

1. **Document the issue**
   - What broke?
   - Why did it break?
   - Steps to reproduce

2. **Fix in isolation**
   - Create new branch
   - Reproduce issue
   - Fix properly
   - Test thoroughly

3. **Re-attempt migration**
   - Apply fix
   - Test again
   - Deploy when confident

---

## Post-Migration Optimization

### 1. React Compiler Analysis

**Check which components were optimized**:

```bash
pnpm build --debug

# Look for React Compiler output:
# "Compiled XXX components"
```

**Monitor in production**:
- Use React DevTools Profiler
- Check re-render counts
- Compare to pre-migration baseline

**If performance issues**:

```tsx
// Opt-out specific components
'use no memo';

export default function ProblematicComponent() {
    // Component that has issues with compiler
}
```

---

### 2. Turbopack Fine-Tuning

**Monitor build times**:

```bash
# Track build performance
pnpm build

# Check for warnings:
# - Large bundles
# - Slow modules
# - Optimization opportunities
```

**Optimize imports**:

```tsx
// ❌ Avoid (imports entire library)
import _ from 'lodash';

// ✅ Better (imports only what's needed)
import { debounce } from 'lodash';

// ✅ Best (tree-shakeable)
import debounce from 'lodash/debounce';
```

---

### 3. Cache Components (Future)

**Next.js 16 new feature**: Cache Components with `"use cache"`

**When to explore**:
- After migration is stable
- If you need fine-grained caching control

**Example**:

```tsx
// Future optimization
'use cache';

export async function ExpensiveComponent({ userId }: Props) {
    const data = await fetchUserData(userId);
    // This component's output is cached
    return <div>{data.name}</div>;
}
```

**Resources**:
- [Cache Components Docs](https://nextjs.org/docs/app/guides/caching)
- Test in isolation first
- Monitor cache hit rates

---

### 4. Bundle Analysis

**Install analyzer**:

```bash
pnpm add -D @next/bundle-analyzer
```

**Configure**:

```typescript
// next.config.ts
import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
    enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
    // ... existing config
};

export default withBundleAnalyzer(nextConfig);
```

**Run analysis**:

```bash
ANALYZE=true pnpm build
```

**Look for**:
- Large dependencies (can they be code-split?)
- Duplicate code (can be deduplicated)
- Unused exports (can be removed)

---

### 5. Monitoring & Metrics

**Add Web Vitals tracking**:

```tsx
// app/layout.tsx (you already have web-vitals package)
import { sendWebVitals } from '@/lib/analytics';

export function reportWebVitals(metric: any) {
    // Log to analytics service
    console.log(metric);

    // Or send to your analytics
    // sendWebVitals(metric);
}
```

**Track**:
- LCP (Largest Contentful Paint)
- FID (First Input Delay)
- CLS (Cumulative Layout Shift)
- TTFB (Time to First Byte)

**Compare**:
- Before migration (Next.js 15)
- After migration (Next.js 16)
- Expect improvements!

---

### 6. Real-time Performance

**Optimize Supabase listeners**:

```typescript
// Already using proper patterns, but verify:

// ✅ Good: Unsubscribe on cleanup
useEffect(() => {
    const channel = supabase.channel('room:' + id);
    // ... setup

    return () => {
        channel.unsubscribe();
    };
}, [id]);

// React Compiler will auto-memoize this
```

**Monitor connection pooling**:
- Check Supabase dashboard
- Monitor concurrent connections
- Optimize subscription patterns if needed

---

### 7. AI Streaming Optimization

**React Compiler benefits**:

```tsx
// Your AI chat component
// React Compiler automatically optimizes:

export function AIChatMessage({ message, isStreaming }: Props) {
    // No manual memo needed
    // Compiler handles re-render optimization
    return (
        <div>
            {message.content}
            {isStreaming && <StreamingIndicator />}
        </div>
    );
}
```

**Verify streaming performance**:
- Start AI chat
- Check re-render count in React DevTools
- Should be minimal (only when new content arrives)

---

### 8. Code Splitting

**Lazy load heavy components**:

```tsx
// For large components not needed immediately
import dynamic from 'next/dynamic';

const AIChat = dynamic(() => import('@/components/ai-chat'), {
    loading: () => <LoadingSpinner />,
    ssr: false, // If client-side only
});

const CodeEditor = dynamic(() => import('@/components/code-editor'), {
    loading: () => <LoadingSpinner />,
});
```

**Good candidates**:
- AI chat panel
- Code editor (CodeMirror)
- Advanced modals
- Heavy visualizations

---

### 9. Image Optimization

**Verify next/image settings**:

```typescript
// next.config.ts
images: {
    remotePatterns: [
        // ... existing patterns
    ],
    // Add optimization settings:
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ['image/webp'], // Use WebP for better compression
},
```

**Optimize image nodes**:

```tsx
// Ensure proper sizing
<Image
    src={imageUrl}
    alt={alt}
    width={800} // Specify dimensions
    height={600}
    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
    priority={false} // Lazy load
/>
```

---

### 10. TypeScript Optimization

**Check compilation speed**:

```bash
time pnpm type-check

# If slow, consider:
# - Incremental compilation (already enabled)
# - Skip lib check (already enabled)
# - Project references (for large codebases)
```

**Your tsconfig is already optimized**:
```json
{
  "incremental": true, // ✅
  "skipLibCheck": true, // ✅
  "strict": true, // ✅
}
```

---

## Known Issues & Workarounds

### Issue 1: React Compiler Build Time

**Symptom**: First build takes longer than Next.js 15

**Cause**: React Compiler uses Babel (temporary)

**Workaround**:
```typescript
// If build time is critical, disable temporarily:
const nextConfig: NextConfig = {
    reactCompiler: process.env.CI ? false : true,
    // Enable locally, disable in CI for faster builds
};
```

**Long-term**: Next.js team working on SWC support (no Babel)

---

### Issue 2: Middleware/Proxy Confusion

**Symptom**: 404 on all routes after rename

**Cause**: Incorrect export name

**Fix**:
```typescript
// src/proxy.ts
// ✅ Correct: Keep export name as 'middleware'
export async function middleware(req: NextRequest) { /* ... */ }

// ❌ Wrong: Don't change export name to 'proxy'
export async function proxy(req: NextRequest) { /* ... */ }
```

---

### Issue 3: Params Not Awaited

**Symptom**: `TypeError: Cannot destructure property 'id' of 'params' as it is undefined.`

**Cause**: Forgot to await params

**Fix**:
```typescript
// ❌ Wrong
export async function GET(req: NextRequest, { params }) {
    const { id } = params; // Error!
}

// ✅ Correct
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params; // Works!
}
```

---

### Issue 4: Supabase Real-time Disconnects

**Symptom**: Real-time stops working after migration

**Cause**: Cookies not awaited in server.ts

**Fix**: Already handled in your code ✅
```typescript
// src/helpers/supabase/server.ts
const cookieStore = await cookies(); // ✅ Correct
```

**Verify**: Test real-time collaboration after migration

---

### Issue 5: Image Loading Errors

**Symptom**: Images fail to load, 400 errors

**Cause**: Remote pattern not matching

**Fix**:
```typescript
// next.config.ts
images: {
    remotePatterns: [
        {
            protocol: 'https',
            hostname: '**.**', // ✅ Already have wildcard
        },
        // Add specific domains if wildcard doesn't work
    ],
},
```

---

### Issue 6: Type Errors After Upgrade

**Symptom**: TypeScript errors on Next.js types

**Cause**: Cached types from Next.js 15

**Fix**:
```bash
# Clear Next.js cache
rm -rf .next

# Regenerate types
pnpm dev
# Or
pnpm build

# Restart TypeScript server in VSCode
# Cmd+Shift+P → "TypeScript: Restart TS Server"
```

---

### Issue 7: Vercel Deployment Issues

**Symptom**: Build fails on Vercel but works locally

**Cause**: Node.js version mismatch

**Fix**:
```bash
# Add to vercel.json or project settings
{
  "buildCommand": "pnpm build",
  "framework": "nextjs",
  "nodeVersion": "20.x"
}
```

Or in Vercel dashboard:
- Settings → General → Node.js Version → 20.x

---

### Issue 8: AI Streaming Broken

**Symptom**: AI responses don't stream, or get errors

**Cause**: API route not handling async properly

**Fix**:
```typescript
// src/app/api/ai/*/route.ts
// Ensure streaming response correct:

import { StreamingTextResponse } from 'ai';

export async function POST(req: Request) {
    const { prompt } = await req.json();

    // Ensure stream is returned correctly
    const stream = await getAIStream(prompt);

    return new StreamingTextResponse(stream); // ✅
}
```

---

## Summary Checklist

### Pre-Migration
- [x] Analyze codebase for breaking changes
- [x] Review third-party dependencies
- [x] Document current state
- [x] Create migration branch
- [ ] Backup production data (if applicable)

### Code Changes
- [ ] Rename `src/middleware.ts` → `src/proxy.ts`
- [ ] Fix `src/app/api/maps/[id]/route.ts` params
- [ ] Update `package.json` dev script (remove --turbopack)
- [ ] Add `reactCompiler: true` to `next.config.ts`

### Upgrade
- [ ] Run `npx @next/codemod@canary upgrade latest`
- [ ] Or manually update to Next.js 16.0.3
- [ ] Run `pnpm install`

### Testing
- [ ] TypeScript type-check passes
- [ ] Production build succeeds
- [ ] Dev server starts
- [ ] Manual feature testing (all checkboxes above)
- [ ] Performance benchmarks

### Deploy
- [ ] Commit all changes
- [ ] Push to remote
- [ ] Create PR
- [ ] Code review
- [ ] Deploy to staging (if available)
- [ ] Deploy to production

### Post-Migration
- [ ] Monitor error logs
- [ ] Check analytics/metrics
- [ ] Verify no user-reported issues
- [ ] Update documentation
- [ ] Celebrate! 🎉

---

## Resources

### Official Documentation
- [Next.js 16 Release Notes](https://nextjs.org/blog/next-16)
- [Next.js 16 Migration Guide](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [React Compiler Docs](https://react.dev/learn/react-compiler)
- [Turbopack Documentation](https://nextjs.org/docs/app/api-reference/turbopack)

### Code Examples
- [Next.js 16 Examples](https://github.com/vercel/next.js/tree/canary/examples)
- [React Compiler Playground](https://playground.react.dev/)

### Community
- [Next.js GitHub Discussions](https://github.com/vercel/next.js/discussions)
- [Next.js Discord](https://nextjs.org/discord)

### Tools
- [Next.js Codemods](https://nextjs.org/docs/app/guides/upgrading/codemods)
- [@next/bundle-analyzer](https://www.npmjs.com/package/@next/bundle-analyzer)
- [React DevTools](https://react.dev/learn/react-developer-tools)

---

## Timeline

### Recommended Schedule

**Day 1** (2-3 hours):
- Pre-migration analysis ✅ (Done!)
- Code changes (middleware, maps API, config)
- Initial commit

**Day 2** (3-4 hours):
- Dependency upgrade
- Build testing
- Basic feature testing
- Fix any immediate issues

**Day 3** (2-3 hours):
- Comprehensive manual testing
- Performance benchmarking
- Documentation updates
- PR creation

**Day 4** (Optional):
- Staging deployment
- Extended testing
- Gather feedback

**Day 5** (1 hour):
- Production deployment
- Monitoring
- Final verification

**Total**: ~8-13 hours spread over 3-5 days

---

## Contact & Support

### Internal Team
- **Developer**: [Your name]
- **Reviewer**: [Reviewer name]
- **Deployment**: [DevOps contact]

### External Support
- **Next.js**: GitHub Discussions / Discord
- **Vercel**: support@vercel.com (if hosting on Vercel)
- **Supabase**: support@supabase.com
- **Stripe**: support@stripe.com

---

## Conclusion

This migration to Next.js 16.0.3 brings significant improvements:

**Performance**:
- ⚡ 2-5× faster builds (Turbopack)
- ⚡ 10× faster Fast Refresh
- ⚡ Automatic optimizations (React Compiler)

**Developer Experience**:
- ✨ Cleaner async patterns
- ✨ Better type safety
- ✨ Improved debugging

**Future-Proof**:
- 🚀 Latest Next.js features
- 🚀 React Compiler 1.0 (stable)
- 🚀 Ready for future optimizations

**Your codebase is well-prepared** - most patterns are already correct. The migration should be smooth with minimal issues.

Good luck! 🚀

---

**Document Version**: 1.0
**Last Updated**: 2025-11-22
**Next Review**: After successful migration