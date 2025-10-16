# History System Refactoring - Detailed Implementation Plan

**Status**: 🔴 Not Started
**Priority**: High
**Estimated Time**: 2.5 - 3 hours
**Last Updated**: 2025-10-12

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Current State Analysis](#current-state-analysis)
3. [Architecture Design](#architecture-design)
4. [Phase 1: Database Schema](#phase-1-database-schema)
5. [Phase 2: API Routes](#phase-2-api-routes)
6. [Phase 3: Store Refactoring](#phase-3-store-refactoring)
7. [Phase 4: Component Refactoring](#phase-4-component-refactoring)
8. [Phase 5: Types & Helpers](#phase-5-types--helpers)
9. [Phase 6: Cleanup & Monitoring](#phase-6-cleanup--monitoring)
10. [Testing Strategy](#testing-strategy)
11. [Rollout Plan](#rollout-plan)
12. [Success Metrics](#success-metrics)

---

## Overview

### Problem Statement

The current history implementation stores full snapshots of all nodes and edges in memory for every action. This creates:

- **Memory leaks** for large maps (500+ nodes = 25MB+ just for history)
- **No persistence** across sessions (history lost on refresh)
- **Inefficient duplicate detection** via JSON.stringify
- **No cleanup strategy** (unbounded growth)
- **Animation violations** (hardcoded 'easeOut' instead of cubic-bezier)
- **Monolithic component** (175 lines, mixing concerns)

### Solution Overview

Implement a hybrid event-sourced system with:

- **Snapshots** (periodic full state backups) + **Events** (incremental deltas)
- **Database persistence** via Supabase
- **Two-tier retention policies** (free: 24h, pro: 14 days)
- **In-memory cache** for instant undo/redo (last 10-20 states)
- **Background sync** to avoid blocking UI
- **Proper theming** (glassmorphism) and animations (cubic-bezier, 0.3s max)

### Expected Impact

- **80-95% memory reduction** (25MB → 1-5MB for large maps)
- **Persistent history** across sessions
- **< 100ms load time** for recent history
- **Sustainable storage costs** (~$0.0003/user/month free, ~$0.003/user/month pro)
- **Clear upgrade path** (24h → 14 days retention)

---

## Current State Analysis

### Existing Files to Modify

```
src/
├── components/
│   └── history-sidebar.tsx                    # ❌ DELETE - Monolithic, 175 lines
├── store/
│   └── slices/
│       └── history-slice.ts                    # ✏️ MODIFY - Add DB persistence
├── types/
│   └── history-state.ts                        # ✏️ MODIFY - Add new interfaces
```

### Current Usage Patterns

History is triggered from 11 different actions:

```typescript
// From analysis of addStateToHistory calls:
1. acceptMerge                  - suggestions-slice.ts:629
2. addNode                       - nodes-slice.ts:366
3. deleteNode                    - nodes-slice.ts:506
4. collapseNode/expandNode       - nodes-slice.ts:682
5. applyLayout                   - layout-slice.ts:73
6. applyAdvancedLayout           - layout-slice.ts:120
7. addEdge                       - edges-slice.ts:289
8. deleteEdge                    - edges-slice.ts:339
9. updateEdge (x2)               - edges-slice.ts:398, 487
10. setParentConnection          - edges-slice.ts:546
```

### Current History State (in-memory only)

```typescript
// src/types/history-state.ts
export interface HistoryState {
	nodes: Node<NodeData>[]; // Full snapshot
	edges: AppEdge[]; // Full snapshot
	actionName?: string;
	timestamp: number;
}

// src/store/slices/history-slice.ts
export interface HistorySlice {
	history: ReadonlyArray<HistoryState>; // In-memory array
	historyIndex: number;
	isReverting: boolean;
	canUndo: boolean;
	canRedo: boolean;
	// Methods: addStateToHistory, handleUndo, handleRedo, revertToHistoryState
}
```

---

## Architecture Design

### Hybrid Event Sourcing Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                        In-Memory Cache                       │
│  Last 10-20 states for instant undo/redo (no DB roundtrip)  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Background Sync Queue                     │
│      Debounced writes to DB (every 30s or on idle)          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────┬──────────────────────────────────────┐
│   Snapshots Table    │         Events Table                 │
│  (Full state every   │    (Deltas between snapshots)        │
│   10 actions or      │                                      │
│   15-30 min)         │  - Add/Update/Delete operations      │
│                      │  - Only changed fields stored        │
│  - 20 max (free)     │  - 5-20 events per snapshot          │
│  - 100 max (pro)     │                                      │
└──────────────────────┴──────────────────────────────────────┘
```

### Data Flow

**Write Path:**

```
User Action → addStateToHistory()
              ↓
         In-Memory Cache (immediate)
              ↓
         Debounced Sync Queue
              ↓
         Calculate Delta
              ↓
    DB Write (snapshot or event)
```

**Read Path (Undo/Redo):**

```
handleUndo() → Check In-Memory Cache
                     ↓
              Found? Use immediately
                     ↓
              Not Found? Fetch from DB
                     ↓
              Reconstruct state from snapshot + events
```

**Read Path (History List):**

```
Open Sidebar → Fetch recent snapshots + events
                     ↓
              Merge with in-memory cache
                     ↓
              Render list with metadata only
                     ↓
              On revert: Load full state
```

### Retention Policies

```typescript
const RETENTION_POLICIES = {
	free: {
		maxAge: 24 * 60 * 60 * 1000, // 24 hours
		maxSnapshots: 20, // 20 snapshots max
		maxEventsPerSnapshot: 5, // 5 events between snapshots
		inMemoryCache: 10, // Last 10 states cached
		storageQuota: 5 * 1024 * 1024, // 5MB total
		cleanupInterval: 60 * 60 * 1000, // Cleanup every hour
		snapshotFrequency: {
			byActions: 10, // Every 10 actions
			byTime: 30 * 60 * 1000, // OR every 30 minutes
		},
	},
	pro: {
		maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days
		maxSnapshots: 100, // 100 snapshots max
		maxEventsPerSnapshot: 20, // 20 events between snapshots
		inMemoryCache: 20, // Last 20 states cached
		storageQuota: 50 * 1024 * 1024, // 50MB total
		cleanupInterval: 24 * 60 * 60 * 1000, // Cleanup daily
		snapshotFrequency: {
			byActions: 10, // Every 10 actions
			byTime: 15 * 60 * 1000, // OR every 15 minutes
		},
		allowManualCheckpoints: true, // Manual "save points"
	},
};
```

---

## Phase 1: Database Schema

**Time Estimate**: 20 minutes
**Files Created**: 1 migration file

### Step 1.1: Create Migration File

Create new migration file using Supabase MCP:

```typescript
// Use mcp__supabase__apply_migration tool
// Name: create_history_system
```

### Step 1.2: SQL Schema

```sql
-- ============================================================================
-- HISTORY SYSTEM SCHEMA
-- Hybrid event sourcing: Snapshots (full state) + Events (deltas)
-- ============================================================================

-- Table 1: Snapshots (periodic full state backups)
CREATE TABLE map_history_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id UUID NOT NULL REFERENCES mind_maps(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Snapshot metadata
  snapshot_index INTEGER NOT NULL,
  action_name TEXT NOT NULL,

  -- Full state (compressed JSONB)
  nodes JSONB NOT NULL,
  edges JSONB NOT NULL,

  -- Metrics for quota enforcement
  node_count INTEGER NOT NULL,
  edge_count INTEGER NOT NULL,
  size_bytes INTEGER,

  -- Flags
  is_major BOOLEAN DEFAULT FALSE,          -- Manual checkpoint or pre-major-operation
  compressed BOOLEAN DEFAULT FALSE,        -- Whether JSONB is gzipped

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_map_snapshot UNIQUE(map_id, snapshot_index),
  CONSTRAINT positive_counts CHECK (node_count >= 0 AND edge_count >= 0)
);

-- Table 2: Events (incremental changes between snapshots)
CREATE TABLE map_history_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id UUID NOT NULL REFERENCES mind_maps(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_id UUID NOT NULL REFERENCES map_history_snapshots(id) ON DELETE CASCADE,

  -- Event metadata
  event_index INTEGER NOT NULL,
  action_name TEXT NOT NULL,

  -- Operation details
  operation_type TEXT NOT NULL,            -- 'add', 'update', 'delete', 'batch'
  entity_type TEXT NOT NULL,               -- 'node', 'edge', 'mixed'

  -- Delta data (only changed fields)
  changes JSONB NOT NULL,

  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_map_event UNIQUE(map_id, snapshot_id, event_index),
  CONSTRAINT valid_operation CHECK (operation_type IN ('add', 'update', 'delete', 'batch')),
  CONSTRAINT valid_entity CHECK (entity_type IN ('node', 'edge', 'mixed'))
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Snapshots: Most queries fetch recent history by map
CREATE INDEX idx_snapshots_map_created
  ON map_history_snapshots(map_id, created_at DESC);

-- Snapshots: Find major checkpoints
CREATE INDEX idx_snapshots_major
  ON map_history_snapshots(map_id, is_major)
  WHERE is_major = TRUE;

-- Snapshots: User-specific queries
CREATE INDEX idx_snapshots_user
  ON map_history_snapshots(user_id, created_at DESC);

-- Events: Fetch events for a snapshot
CREATE INDEX idx_events_snapshot
  ON map_history_events(snapshot_id, event_index);

-- Events: Map-level queries
CREATE INDEX idx_events_map_created
  ON map_history_events(map_id, created_at DESC);

-- Events: Cleanup by timestamp
CREATE INDEX idx_events_created
  ON map_history_events(created_at);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE map_history_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE map_history_events ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own history
CREATE POLICY "Users can view own snapshots"
  ON map_history_snapshots FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    map_id IN (
      SELECT map_id
      FROM share_access
      WHERE user_id = auth.uid()
        AND status = 'active'
    )
  );

CREATE POLICY "Users can view own events"
  ON map_history_events FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    map_id IN (
      SELECT map_id
      FROM share_access
      WHERE user_id = auth.uid()
        AND status = 'active'
    )
  );

-- Policy: Users can insert their own history
CREATE POLICY "Users can insert own snapshots"
  ON map_history_snapshots FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can insert own events"
  ON map_history_events FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Policy: Users can delete their own history
CREATE POLICY "Users can delete own snapshots"
  ON map_history_snapshots FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own events"
  ON map_history_events FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- AUTOMATED CLEANUP FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_history()
RETURNS TABLE(
  deleted_snapshots INTEGER,
  deleted_events INTEGER,
  execution_time_ms INTEGER
) AS $$
DECLARE
  start_time TIMESTAMPTZ := clock_timestamp();
  free_cutoff TIMESTAMPTZ := NOW() - INTERVAL '24 hours';
  pro_cutoff TIMESTAMPTZ := NOW() - INTERVAL '14 days';
  snapshots_deleted INTEGER;
  events_deleted INTEGER;
BEGIN
  -- Cleanup free tier users (keep only last 24h, non-major snapshots)
  WITH deleted_free AS (
    DELETE FROM map_history_snapshots
    WHERE created_at < free_cutoff
      AND is_major = FALSE
      AND user_id IN (
        SELECT us.user_id
        FROM user_subscriptions us
        JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE sp.name = 'free'
      )
    RETURNING id
  )
  SELECT COUNT(*) INTO snapshots_deleted FROM deleted_free;

  -- Cleanup pro tier users (keep only last 14 days, non-major snapshots)
  WITH deleted_pro AS (
    DELETE FROM map_history_snapshots
    WHERE created_at < pro_cutoff
      AND is_major = FALSE
      AND user_id IN (
        SELECT us.user_id
        FROM user_subscriptions us
        JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE sp.name = 'pro'
      )
    RETURNING id
  )
  SELECT COUNT(*) INTO STRICT snapshots_deleted FROM deleted_pro;

  -- Events are cascade-deleted, but count orphaned events (shouldn't happen)
  WITH deleted_orphans AS (
    DELETE FROM map_history_events
    WHERE snapshot_id NOT IN (SELECT id FROM map_history_snapshots)
    RETURNING id
  )
  SELECT COUNT(*) INTO events_deleted FROM deleted_orphans;

  -- Return results
  RETURN QUERY SELECT
    snapshots_deleted,
    events_deleted,
    EXTRACT(MILLISECONDS FROM clock_timestamp() - start_time)::INTEGER;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (for manual cleanup calls)
GRANT EXECUTE ON FUNCTION cleanup_old_history() TO authenticated;

-- ============================================================================
-- STORAGE QUOTA ENFORCEMENT FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_history_storage(p_user_id UUID)
RETURNS TABLE(
  total_snapshots INTEGER,
  total_events INTEGER,
  total_size_bytes BIGINT,
  quota_bytes BIGINT,
  usage_percentage NUMERIC
) AS $$
DECLARE
  user_plan TEXT;
  quota BIGINT;
BEGIN
  -- Get user's plan
  SELECT sp.name INTO user_plan
  FROM user_subscriptions us
  JOIN subscription_plans sp ON us.plan_id = sp.id
  WHERE us.user_id = p_user_id
  LIMIT 1;

  -- Set quota based on plan
  quota := CASE
    WHEN user_plan = 'pro' THEN 50 * 1024 * 1024  -- 50MB
    ELSE 5 * 1024 * 1024                          -- 5MB for free
  END;

  -- Calculate usage
  RETURN QUERY
  SELECT
    COUNT(DISTINCT s.id)::INTEGER AS total_snapshots,
    COUNT(DISTINCT e.id)::INTEGER AS total_events,
    COALESCE(SUM(s.size_bytes), 0) AS total_size_bytes,
    quota AS quota_bytes,
    ROUND((COALESCE(SUM(s.size_bytes), 0)::NUMERIC / quota::NUMERIC) * 100, 2) AS usage_percentage
  FROM map_history_snapshots s
  LEFT JOIN map_history_events e ON e.snapshot_id = s.id
  WHERE s.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_history_storage(UUID) TO authenticated;

-- ============================================================================
-- TRIGGER: Update size_bytes on insert
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_snapshot_size()
RETURNS TRIGGER AS $$
BEGIN
  -- Estimate size as length of JSONB text representation
  NEW.size_bytes := LENGTH(NEW.nodes::TEXT) + LENGTH(NEW.edges::TEXT);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_snapshot_size
  BEFORE INSERT OR UPDATE ON map_history_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION calculate_snapshot_size();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE map_history_snapshots IS
  'Stores periodic full-state snapshots of mind maps for undo/redo history. '
  'Snapshots are created every 10 actions or 15-30 minutes (plan-dependent).';

COMMENT ON TABLE map_history_events IS
  'Stores incremental changes (deltas) between snapshots. '
  'Events contain only modified fields to minimize storage.';

COMMENT ON COLUMN map_history_snapshots.is_major IS
  'Manual checkpoints or pre-major-operation snapshots (preserved longer during cleanup)';

COMMENT ON COLUMN map_history_snapshots.compressed IS
  'Whether the JSONB data is gzip-compressed (for old snapshots to save space)';

COMMENT ON FUNCTION cleanup_old_history IS
  'Automated cleanup function to enforce retention policies. '
  'Free: 24h retention. Pro: 14 days retention. Major snapshots preserved longer.';
```

### Step 1.3: Test Schema

```typescript
// Use Supabase MCP tools to verify
await mcp__supabase__list_tables({ project_id: 'xxx', schemas: ['public'] });

// Should see:
// - map_history_snapshots (19 columns)
// - map_history_events (10 columns)

// Test cleanup function
await mcp__supabase__execute_sql({
	project_id: 'xxx',
	query: 'SELECT * FROM cleanup_old_history();',
});
```

---

## Phase 2: API Routes

**Time Estimate**: 30 minutes
**Files Created**: 4 route files

### Directory Structure

```
src/app/api/history/[mapId]/
├── list/
│   └── route.ts                 # GET - Paginated history list
├── snapshot/
│   └── route.ts                 # POST - Create manual checkpoint (pro only)
├── revert/
│   └── route.ts                 # POST - Revert to specific state
└── cleanup/
    └── route.ts                 # POST - Trigger cleanup (internal)
```

### Route 2.1: List History

**File**: `src/app/api/history/[mapId]/list/route.ts`

```typescript
import { withAuthValidation } from '@/helpers/api/with-auth-validation';
import { createServerClient } from '@/helpers/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/history/[mapId]/list
 *
 * Fetches paginated history for a map.
 * Returns both snapshots and events, merged and sorted by timestamp.
 *
 * Query params:
 * - limit: number (default: 50, max: 100)
 * - offset: number (default: 0)
 * - startDate: ISO timestamp (optional)
 * - endDate: ISO timestamp (optional)
 * - actionName: string (optional filter, pro only)
 *
 * Response:
 * {
 *   items: HistoryItem[],
 *   total: number,
 *   hasMore: boolean,
 *   snapshots: number,
 *   events: number
 * }
 */
export const GET = withAuthValidation(
	async (req: NextRequest, { params, user }) => {
		const mapId = params.mapId as string;
		const { searchParams } = new URL(req.url);

		const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
		const offset = parseInt(searchParams.get('offset') || '0');
		const startDate = searchParams.get('startDate');
		const endDate = searchParams.get('endDate');
		const actionName = searchParams.get('actionName');

		const supabase = createServerClient();

		// Verify user has access to this map
		const { data: map } = await supabase
			.from('mind_maps')
			.select('id, user_id')
			.eq('id', mapId)
			.single();

		if (!map) {
			return NextResponse.json({ error: 'Map not found' }, { status: 404 });
		}

		// Check if user owns map or has share access
		const hasAccess =
			map.user_id === user.id ||
			(
				await supabase
					.from('share_access')
					.select('id')
					.eq('map_id', mapId)
					.eq('user_id', user.id)
					.eq('status', 'active')
					.single()
			).data;

		if (!hasAccess) {
			return NextResponse.json({ error: 'Access denied' }, { status: 403 });
		}

		// Build query for snapshots
		let snapshotQuery = supabase
			.from('map_history_snapshots')
			.select(
				'id, snapshot_index, action_name, node_count, edge_count, is_major, created_at',
				{ count: 'exact' }
			)
			.eq('map_id', mapId)
			.order('created_at', { ascending: false })
			.range(offset, offset + limit - 1);

		if (startDate) snapshotQuery = snapshotQuery.gte('created_at', startDate);
		if (endDate) snapshotQuery = snapshotQuery.lte('created_at', endDate);
		if (actionName) snapshotQuery = snapshotQuery.eq('action_name', actionName);

		const { data: snapshots, count: snapshotCount } = await snapshotQuery;

		// Get events for these snapshots
		const snapshotIds = snapshots?.map((s) => s.id) || [];
		const { data: events } = await supabase
			.from('map_history_events')
			.select(
				'id, snapshot_id, event_index, action_name, operation_type, entity_type, created_at'
			)
			.in('snapshot_id', snapshotIds)
			.order('created_at', { ascending: false });

		// Merge and format
		const items = [
			...(snapshots?.map((s) => ({
				id: s.id,
				type: 'snapshot' as const,
				snapshotIndex: s.snapshot_index,
				actionName: s.action_name,
				nodeCount: s.node_count,
				edgeCount: s.edge_count,
				isMajor: s.is_major,
				timestamp: new Date(s.created_at).getTime(),
			})) || []),
			...(events?.map((e) => ({
				id: e.id,
				type: 'event' as const,
				snapshotId: e.snapshot_id,
				eventIndex: e.event_index,
				actionName: e.action_name,
				operationType: e.operation_type,
				entityType: e.entity_type,
				timestamp: new Date(e.created_at).getTime(),
			})) || []),
		].sort((a, b) => b.timestamp - a.timestamp);

		return NextResponse.json({
			items,
			total: snapshotCount || 0,
			hasMore: offset + limit < (snapshotCount || 0),
			snapshots: snapshots?.length || 0,
			events: events?.length || 0,
		});
	}
);
```

### Route 2.2: Create Snapshot (Manual Checkpoint)

**File**: `src/app/api/history/[mapId]/snapshot/route.ts`

```typescript
import { withAuthValidation } from '@/helpers/api/with-auth-validation';
import { createServerClient } from '@/helpers/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/history/[mapId]/snapshot
 *
 * Creates a manual checkpoint (major snapshot).
 * PRO ONLY feature.
 *
 * Body:
 * {
 *   actionName: string (e.g., "Manual Checkpoint"),
 *   nodes: AppNode[],
 *   edges: AppEdge[]
 * }
 *
 * Response:
 * {
 *   snapshotId: string,
 *   snapshotIndex: number,
 *   message: string
 * }
 */
export const POST = withAuthValidation(
	async (req: NextRequest, { params, user }) => {
		const mapId = params.mapId as string;
		const body = await req.json();
		const { actionName, nodes, edges } = body;

		const supabase = createServerClient();

		// Check if user has pro plan
		const { data: subscription } = await supabase
			.from('user_subscriptions')
			.select('plan:subscription_plans(name)')
			.eq('user_id', user.id)
			.single();

		const planName = subscription?.plan?.name;
		if (planName !== 'pro') {
			return NextResponse.json(
				{ error: 'Manual checkpoints are only available on Pro plan' },
				{ status: 403 }
			);
		}

		// Verify map ownership
		const { data: map } = await supabase
			.from('mind_maps')
			.select('id, user_id')
			.eq('id', mapId)
			.single();

		if (!map || map.user_id !== user.id) {
			return NextResponse.json(
				{ error: 'Map not found or access denied' },
				{ status: 404 }
			);
		}

		// Get current snapshot index
		const { data: lastSnapshot } = await supabase
			.from('map_history_snapshots')
			.select('snapshot_index')
			.eq('map_id', mapId)
			.order('snapshot_index', { ascending: false })
			.limit(1)
			.single();

		const nextIndex = (lastSnapshot?.snapshot_index ?? -1) + 1;

		// Create snapshot
		const { data: snapshot, error } = await supabase
			.from('map_history_snapshots')
			.insert({
				map_id: mapId,
				user_id: user.id,
				snapshot_index: nextIndex,
				action_name: actionName || 'Manual Checkpoint',
				nodes: nodes,
				edges: edges,
				node_count: nodes.length,
				edge_count: edges.length,
				is_major: true, // Manual checkpoints are always major
			})
			.select()
			.single();

		if (error) {
			console.error('Failed to create snapshot:', error);
			return NextResponse.json(
				{ error: 'Failed to create snapshot' },
				{ status: 500 }
			);
		}

		return NextResponse.json({
			snapshotId: snapshot.id,
			snapshotIndex: snapshot.snapshot_index,
			message: 'Checkpoint created successfully',
		});
	}
);
```

### Route 2.3: Revert to State

**File**: `src/app/api/history/[mapId]/revert/route.ts`

```typescript
import { withAuthValidation } from '@/helpers/api/with-auth-validation';
import { createServerClient } from '@/helpers/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/history/[mapId]/revert
 *
 * Reverts map to a specific historical state.
 * Reconstructs state from snapshot + events if needed.
 *
 * Body:
 * {
 *   snapshotId?: string,  // Revert to snapshot
 *   eventId?: string,     // Revert to specific event
 * }
 *
 * Response:
 * {
 *   nodes: AppNode[],
 *   edges: AppEdge[],
 *   snapshotIndex: number,
 *   message: string
 * }
 */
export const POST = withAuthValidation(
	async (req: NextRequest, { params, user }) => {
		const mapId = params.mapId as string;
		const body = await req.json();
		const { snapshotId, eventId } = body;

		if (!snapshotId && !eventId) {
			return NextResponse.json(
				{ error: 'Either snapshotId or eventId is required' },
				{ status: 400 }
			);
		}

		const supabase = createServerClient();

		// Verify map access
		const { data: map } = await supabase
			.from('mind_maps')
			.select('id, user_id')
			.eq('id', mapId)
			.single();

		if (!map) {
			return NextResponse.json({ error: 'Map not found' }, { status: 404 });
		}

		const hasAccess =
			map.user_id === user.id ||
			(
				await supabase
					.from('share_access')
					.select('id')
					.eq('map_id', mapId)
					.eq('user_id', user.id)
					.eq('status', 'active')
					.single()
			).data;

		if (!hasAccess) {
			return NextResponse.json({ error: 'Access denied' }, { status: 403 });
		}

		// Get target snapshot
		let targetSnapshotId = snapshotId;

		if (eventId) {
			// Get snapshot for this event
			const { data: event } = await supabase
				.from('map_history_events')
				.select('snapshot_id')
				.eq('id', eventId)
				.single();

			if (!event) {
				return NextResponse.json({ error: 'Event not found' }, { status: 404 });
			}

			targetSnapshotId = event.snapshot_id;
		}

		// Fetch snapshot
		const { data: snapshot } = await supabase
			.from('map_history_snapshots')
			.select('*')
			.eq('id', targetSnapshotId)
			.single();

		if (!snapshot) {
			return NextResponse.json(
				{ error: 'Snapshot not found' },
				{ status: 404 }
			);
		}

		// If reverting to event, need to apply events up to that point
		let finalNodes = snapshot.nodes;
		let finalEdges = snapshot.edges;

		if (eventId) {
			// Get all events up to target event
			const { data: events } = await supabase
				.from('map_history_events')
				.select('*')
				.eq('snapshot_id', targetSnapshotId)
				.order('event_index', { ascending: true });

			// Apply events until we reach target
			for (const event of events || []) {
				if (event.id === eventId) break;

				// Apply delta (implement delta application logic)
				// This would need the applyDelta helper function
				const result = applyDelta(finalNodes, finalEdges, event.changes);
				finalNodes = result.nodes;
				finalEdges = result.edges;
			}
		}

		return NextResponse.json({
			nodes: finalNodes,
			edges: finalEdges,
			snapshotIndex: snapshot.snapshot_index,
			message: 'State reverted successfully',
		});
	}
);

// Helper function to apply delta changes
function applyDelta(nodes: any[], edges: any[], changes: any) {
	// Implementation would depend on delta format
	// See Phase 5 for detailed delta application logic
	return { nodes, edges };
}
```

### Route 2.4: Cleanup History

**File**: `src/app/api/history/[mapId]/cleanup/route.ts`

```typescript
import { withApiValidation } from '@/helpers/api/with-api-validation';
import { createServerClient } from '@/helpers/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/history/[mapId]/cleanup
 *
 * Triggers cleanup for a specific map or all user maps.
 * Can be called manually or scheduled via cron.
 *
 * Body:
 * {
 *   mapId?: string,  // Optional: cleanup specific map only
 *   force?: boolean  // Force cleanup even if not due
 * }
 *
 * Response:
 * {
 *   deletedSnapshots: number,
 *   deletedEvents: number,
 *   executionTimeMs: number
 * }
 */
export const POST = withApiValidation(async (req: NextRequest, { user }) => {
	const body = await req.json();
	const { mapId, force } = body;

	const supabase = createServerClient();

	// Call the cleanup function
	const { data, error } = await supabase.rpc('cleanup_old_history');

	if (error) {
		console.error('Cleanup failed:', error);
		return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
	}

	return NextResponse.json({
		deletedSnapshots: data[0].deleted_snapshots,
		deletedEvents: data[0].deleted_events,
		executionTimeMs: data[0].execution_time_ms,
	});
});
```

---

## Phase 3: Store Refactoring

**Time Estimate**: 45 minutes
**Files Modified**: 1 (history-slice.ts)

### Step 3.1: Update History Slice Interface

**File**: `src/store/slices/history-slice.ts`

Add new state and methods:

```typescript
export interface HistorySlice {
	// ===== Existing State =====
	history: ReadonlyArray<HistoryState>;
	historyIndex: number;
	isReverting: boolean;
	canUndo: boolean;
	canRedo: boolean;

	// ===== New State =====
	inMemoryCache: HistoryState[]; // Last 10-20 states for instant undo/redo
	syncQueue: HistoryState[]; // Pending writes to DB
	lastSnapshotIndex: number; // Track when to create next snapshot
	actionsSinceSnapshot: number; // Counter for snapshot frequency
	lastSnapshotTime: number; // Timestamp of last snapshot
	isSyncing: boolean; // Background sync in progress
	syncError: string | null; // Last sync error

	// ===== Existing Methods (Modified) =====
	addStateToHistory: (
		actionName?: string,
		stateOverride?: { nodes?: AppNode[]; edges?: AppEdge[] }
	) => Promise<void>; // Now async for DB writes

	handleUndo: () => Promise<void>;
	handleRedo: () => Promise<void>;
	revertToHistoryState: (index: number) => Promise<void>;

	// ===== New Methods =====
	// Initialization
	loadHistoryFromDB: (mapId: string) => Promise<void>;

	// Snapshot management
	createSnapshot: (actionName: string, isMajor?: boolean) => Promise<void>;
	shouldCreateSnapshot: () => boolean;

	// Event management
	createEvent: (actionName: string, delta: HistoryDelta) => Promise<void>;

	// Delta calculation
	calculateDelta: (
		oldState: { nodes: AppNode[]; edges: AppEdge[] },
		newState: { nodes: AppNode[]; edges: AppEdge[] }
	) => HistoryDelta | null;

	// Sync management
	startBackgroundSync: () => void;
	stopBackgroundSync: () => void;
	flushSyncQueue: () => Promise<void>;

	// Cleanup
	triggerCleanup: () => Promise<void>;

	// Getters
	getCurrentHistoryState: () => HistoryState | undefined;
	getRetentionPolicy: () => RetentionPolicy;
}
```

### Step 3.2: Implement Core Logic

Key implementation details:

```typescript
export const createHistorySlice: StateCreator<
	AppState,
	[],
	[],
	HistorySlice
> = (set, get) => {
	// Background sync interval
	let syncInterval: NodeJS.Timeout | null = null;

	return {
		// ===== Initial State =====
		history: [],
		historyIndex: -1,
		isReverting: false,
		canUndo: false,
		canRedo: false,
		inMemoryCache: [],
		syncQueue: [],
		lastSnapshotIndex: -1,
		actionsSinceSnapshot: 0,
		lastSnapshotTime: Date.now(),
		isSyncing: false,
		syncError: null,

		// ===== Load History from DB =====
		loadHistoryFromDB: async (mapId: string) => {
			try {
				const response = await fetch(`/api/history/${mapId}/list?limit=20`);
				const data = await response.json();

				// Reconstruct in-memory cache from recent snapshots
				const recentStates: HistoryState[] = data.items
					.filter((item: any) => item.type === 'snapshot')
					.slice(0, 10)
					.map((item: any) => ({
						id: item.id,
						isSnapshot: true,
						nodes: [], // Will be loaded on demand
						edges: [],
						actionName: item.actionName,
						timestamp: item.timestamp,
						nodeCount: item.nodeCount,
						edgeCount: item.edgeCount,
						isMajor: item.isMajor,
					}));

				set({
					inMemoryCache: recentStates,
					history: recentStates,
					historyIndex: recentStates.length - 1,
					canUndo: recentStates.length > 1,
					canRedo: false,
				});
			} catch (error) {
				console.error('Failed to load history:', error);
				set({ syncError: 'Failed to load history' });
			}
		},

		// ===== Add State to History (Modified) =====
		addStateToHistory: async (
			actionName?: string,
			stateOverride?: { nodes?: AppNode[]; edges?: AppEdge[] }
		) => {
			const {
				nodes,
				edges,
				mapId,
				currentUser,
				inMemoryCache,
				lastSnapshotIndex,
				actionsSinceSnapshot,
				lastSnapshotTime,
				shouldCreateSnapshot,
				createSnapshot,
				createEvent,
				calculateDelta,
				syncQueue,
			} = get();

			if (!mapId || !currentUser) return;

			const nodesToSave = stateOverride?.nodes ?? nodes;
			const edgesToSave = stateOverride?.edges ?? edges;

			const newState: HistoryState = {
				id: crypto.randomUUID(),
				isSnapshot: false, // Will be determined later
				nodes: nodesToSave,
				edges: edgesToSave,
				timestamp: Date.now(),
				actionName: actionName || 'unknown',
				nodeCount: nodesToSave.length,
				edgeCount: edgesToSave.length,
				userId: currentUser.id,
			};

			// Check if duplicate
			const lastState = inMemoryCache[inMemoryCache.length - 1];
			if (lastState && areStatesEqual(lastState, newState)) {
				return; // Skip duplicate
			}

			// Add to in-memory cache
			const newCache = [...inMemoryCache, newState];
			const policy = get().getRetentionPolicy();

			// Trim cache to max size
			if (newCache.length > policy.inMemoryCache) {
				newCache.shift(); // Remove oldest
			}

			set({
				inMemoryCache: newCache,
				history: newCache,
				historyIndex: newCache.length - 1,
				canUndo: true,
				canRedo: false,
				actionsSinceSnapshot: actionsSinceSnapshot + 1,
			});

			// Determine if we should create snapshot or event
			if (shouldCreateSnapshot()) {
				await createSnapshot(actionName || 'auto', false);
			} else {
				// Calculate delta and create event
				if (lastState) {
					const delta = calculateDelta(
						{ nodes: lastState.nodes || [], edges: lastState.edges || [] },
						{ nodes: nodesToSave, edges: edgesToSave }
					);

					if (delta) {
						await createEvent(actionName || 'unknown', delta);
					}
				}
			}
		},

		// ===== Should Create Snapshot =====
		shouldCreateSnapshot: () => {
			const { actionsSinceSnapshot, lastSnapshotTime } = get();
			const policy = get().getRetentionPolicy();
			const timeSinceSnapshot = Date.now() - lastSnapshotTime;

			return (
				actionsSinceSnapshot >= policy.snapshotFrequency.byActions ||
				timeSinceSnapshot >= policy.snapshotFrequency.byTime
			);
		},

		// ===== Create Snapshot =====
		createSnapshot: async (actionName: string, isMajor: boolean = false) => {
			const { nodes, edges, mapId, currentUser, lastSnapshotIndex } = get();

			if (!mapId || !currentUser) return;

			const nextIndex = lastSnapshotIndex + 1;

			try {
				const response = await fetch(`/api/history/${mapId}/snapshot`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						actionName,
						nodes,
						edges,
						isMajor,
					}),
				});

				if (!response.ok) throw new Error('Failed to create snapshot');

				const data = await response.json();

				set({
					lastSnapshotIndex: data.snapshotIndex,
					actionsSinceSnapshot: 0,
					lastSnapshotTime: Date.now(),
				});
			} catch (error) {
				console.error('Snapshot creation failed:', error);
				set({ syncError: 'Failed to create snapshot' });
			}
		},

		// ===== Create Event =====
		createEvent: async (actionName: string, delta: HistoryDelta) => {
			const { mapId, syncQueue } = get();

			if (!mapId) return;

			// Add to sync queue (will be flushed by background sync)
			set({
				syncQueue: [
					...syncQueue,
					{
						id: crypto.randomUUID(),
						isSnapshot: false,
						changes: delta,
						actionName,
						timestamp: Date.now(),
						nodeCount: 0,
						edgeCount: 0,
					},
				],
			});
		},

		// ===== Calculate Delta =====
		calculateDelta: (oldState, newState) => {
			// See Phase 5 for full implementation
			// This is a simplified version

			const changes: HistoryDelta['changes'] = [];

			// Find changed nodes
			const oldNodeMap = new Map(oldState.nodes.map((n) => [n.id, n]));
			const newNodeMap = new Map(newState.nodes.map((n) => [n.id, n]));

			// Added nodes
			for (const [id, node] of newNodeMap) {
				if (!oldNodeMap.has(id)) {
					changes.push({
						id,
						type: 'node',
						after: node,
					});
				}
			}

			// Deleted nodes
			for (const [id, node] of oldNodeMap) {
				if (!newNodeMap.has(id)) {
					changes.push({
						id,
						type: 'node',
						before: node,
					});
				}
			}

			// Updated nodes (compare only changed fields)
			for (const [id, newNode] of newNodeMap) {
				const oldNode = oldNodeMap.get(id);
				if (oldNode) {
					const changedFields = getChangedFields(oldNode, newNode);
					if (Object.keys(changedFields.before).length > 0) {
						changes.push({
							id,
							type: 'node',
							before: changedFields.before,
							after: changedFields.after,
						});
					}
				}
			}

			// Same logic for edges...

			if (changes.length === 0) return null;

			return {
				operation:
					changes.length === 1
						? changes[0].before && changes[0].after
							? 'update'
							: changes[0].before
								? 'delete'
								: 'add'
						: 'batch',
				entityType: changes.every((c) => c.type === 'node')
					? 'node'
					: changes.every((c) => c.type === 'edge')
						? 'edge'
						: 'mixed',
				changes,
			};
		},

		// ===== Background Sync =====
		startBackgroundSync: () => {
			if (syncInterval) return;

			syncInterval = setInterval(async () => {
				await get().flushSyncQueue();
			}, 30000); // Every 30 seconds
		},

		stopBackgroundSync: () => {
			if (syncInterval) {
				clearInterval(syncInterval);
				syncInterval = null;
			}
		},

		flushSyncQueue: async () => {
			const { syncQueue, mapId, isSyncing } = get();

			if (isSyncing || syncQueue.length === 0 || !mapId) return;

			set({ isSyncing: true });

			try {
				// Batch write events to DB
				const supabase = get().supabase;

				const eventsToWrite = syncQueue.map((item) => ({
					map_id: mapId,
					user_id: get().currentUser?.id,
					action_name: item.actionName,
					operation_type: item.changes?.operation || 'update',
					entity_type: item.changes?.entityType || 'mixed',
					changes: item.changes,
				}));

				const { error } = await supabase
					.from('map_history_events')
					.insert(eventsToWrite);

				if (error) throw error;

				// Clear queue on success
				set({ syncQueue: [], syncError: null });
			} catch (error) {
				console.error('Sync failed:', error);
				set({ syncError: 'Sync failed' });
			} finally {
				set({ isSyncing: false });
			}
		},

		// ===== Get Retention Policy =====
		getRetentionPolicy: () => {
			const { currentUser, supabase } = get();

			// This would ideally be cached in subscription slice
			// For now, default to free
			return RETENTION_POLICIES.free;
		},

		// ===== Existing methods (mostly unchanged) =====
		handleUndo: async () => {
			// Implementation similar to current, but check in-memory cache first
			// If not in cache, fetch from DB
		},

		handleRedo: async () => {
			// Similar to handleUndo
		},

		revertToHistoryState: async (index: number) => {
			// Fetch full state from DB if not in cache
			// Apply to current state
		},

		getCurrentHistoryState: () => {
			const { inMemoryCache, historyIndex } = get();
			return inMemoryCache[historyIndex];
		},

		triggerCleanup: async () => {
			const { mapId } = get();
			if (!mapId) return;

			try {
				await fetch(`/api/history/${mapId}/cleanup`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ mapId }),
				});
			} catch (error) {
				console.error('Cleanup failed:', error);
			}
		},
	};
};

// ===== Helper Functions =====

function areStatesEqual(a: HistoryState, b: HistoryState): boolean {
	return (
		a.nodeCount === b.nodeCount &&
		a.edgeCount === b.edgeCount &&
		JSON.stringify(a.nodes) === JSON.stringify(b.nodes) &&
		JSON.stringify(a.edges) === JSON.stringify(b.edges)
	);
}

function getChangedFields(
	oldObj: any,
	newObj: any
): { before: any; after: any } {
	const before: any = {};
	const after: any = {};

	const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

	for (const key of allKeys) {
		if (JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key])) {
			before[key] = oldObj[key];
			after[key] = newObj[key];
		}
	}

	return { before, after };
}
```

---

## Phase 4: Component Refactoring

**Time Estimate**: 40 minutes
**Files Created**: 8 component files
**Files Deleted**: 1 (history-sidebar.tsx)

### Directory Structure

```
src/components/history/
├── history-sidebar.tsx          # Main container (150 lines → 80 lines)
├── history-list.tsx             # Virtualized list (100 lines)
├── history-item.tsx             # Individual entry (120 lines)
├── history-timeline.tsx         # Visual timeline (80 lines)
├── history-filters.tsx          # Filters (pro only) (60 lines)
├── history-empty-state.tsx      # Empty state (40 lines)
├── history-actions.tsx          # Bulk actions (50 lines)
└── history-item-skeleton.tsx    # Loading skeleton (30 lines)
```

### Component 4.1: Main Container

**File**: `src/components/history/history-sidebar.tsx`

```typescript
'use client';

import useAppStore from '@/store/mind-map-store';
import { useEffect } from 'react';
import { SidePanel } from '../side-panel';
import { HistoryActions } from './history-actions';
import { HistoryEmptyState } from './history-empty-state';
import { HistoryFilters } from './history-filters';
import { HistoryList } from './history-list';
import { HistoryTimeline } from './history-timeline';

export function HistorySidebar() {
  const popoverOpen = useAppStore((state) => state.popoverOpen);
  const setPopoverOpen = useAppStore((state) => state.setPopoverOpen);
  const loadHistoryFromDB = useAppStore((state) => state.loadHistoryFromDB);
  const history = useAppStore((state) => state.history);
  const mapId = useAppStore((state) => state.mapId);
  const userProfile = useAppStore((state) => state.userProfile);

  const isPro = userProfile?.subscription?.plan === 'pro';

  useEffect(() => {
    if (popoverOpen.history && mapId) {
      loadHistoryFromDB(mapId);
    }
  }, [popoverOpen.history, mapId, loadHistoryFromDB]);

  const handleClose = () => {
    setPopoverOpen({ history: false });
  };

  return (
    <SidePanel
      isOpen={popoverOpen.history}
      onClose={handleClose}
      title="Mind Map History"
      className="w-[400px]"
    >
      <div className="flex h-full flex-col gap-4">
        {/* Filters (Pro only) */}
        {isPro && <HistoryFilters />}

        {/* Timeline visualization */}
        <HistoryTimeline />

        {/* Main content */}
        {history.length === 0 ? (
          <HistoryEmptyState />
        ) : (
          <>
            <HistoryList />
            <HistoryActions />
          </>
        )}
      </div>
    </SidePanel>
  );
}
```

### Component 4.2: History List (Virtualized)

**File**: `src/components/history/history-list.tsx`

```typescript
'use client';

import useAppStore from '@/store/mind-map-store';
import GlassmorphismTheme from '@/components/nodes/themes/glassmorphism-theme';
import { motion, AnimatePresence } from 'motion/react';
import { useEffect, useState } from 'react';
import { HistoryItem } from './history-item';
import { HistoryItemSkeleton } from './history-item-skeleton';

export function HistoryList() {
  const history = useAppStore((state) => state.history);
  const historyIndex = useAppStore((state) => state.historyIndex);
  const isLoading = useAppStore((state) => state.loadingStates.isStateLoading);
  const [filteredHistory, setFilteredHistory] = useState(history);

  // Filter out noisy actions (nodeChange, edgeChange)
  useEffect(() => {
    const filterNames = ['nodeChange', 'edgeChange'];
    setFilteredHistory(
      history.filter((item) => !filterNames.includes(item.actionName || ''))
    );
  }, [history]);

  // Reverse for newest at top
  const reversedHistory = [...filteredHistory].reverse();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <HistoryItemSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      className="flex-grow overflow-y-auto pr-2"
      style={{
        backgroundColor: GlassmorphismTheme.elevation[0],
      }}
      layout
      initial={false}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {reversedHistory.map((state, index) => {
          // Map reversed index to original index
          const originalIndex = history.length - 1 - index;
          const isCurrent = originalIndex === historyIndex;

          return (
            <HistoryItem
              key={state.id || `${state.timestamp}-${originalIndex}`}
              state={state}
              originalIndex={originalIndex}
              isCurrent={isCurrent}
            />
          );
        })}
      </AnimatePresence>
    </motion.div>
  );
}
```

### Component 4.3: History Item

**File**: `src/components/history/history-item.tsx`

```typescript
'use client';

import useAppStore from '@/store/mind-map-store';
import GlassmorphismTheme from '@/components/nodes/themes/glassmorphism-theme';
import { cn } from '@/utils/cn';
import { motion } from 'motion/react';
import { HistoryState } from '@/types/history-state';
import { Button } from '../ui/button';
import {
  Clock,
  GitCommit,
  Milestone,
} from 'lucide-react';

interface HistoryItemProps {
  state: HistoryState;
  originalIndex: number;
  isCurrent: boolean;
}

export function HistoryItem({ state, originalIndex, isCurrent }: HistoryItemProps) {
  const isLoading = useAppStore((state) => state.loadingStates.isStateLoading);
  const revertToHistoryState = useAppStore((state) => state.revertToHistoryState);

  const handleRevert = () => {
    if (!isLoading) {
      revertToHistoryState(originalIndex);
    }
  };

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = Date.now();
    const diff = now - timestamp;

    // Show relative time for recent items
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;

    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getActionDisplayName = (actionName?: string): string => {
    if (!actionName) return 'Unknown Action';

    const nameMap: Record<string, string> = {
      initialLoad: 'Initial Load',
      addNode: 'Add Node',
      deleteNode: 'Delete Node',
      saveNodeProperties: 'Update Node',
      addEdge: 'Add Edge',
      deleteEdge: 'Delete Edge',
      saveEdgeProperties: 'Update Edge',
      applyLayoutTB: 'Layout (Top-Bottom)',
      applyLayoutLR: 'Layout (Left-Right)',
      nodeChange: 'Node Change',
      edgeChange: 'Edge Change',
      groupNodes: 'Group Nodes',
      pasteNodes: 'Paste Nodes',
      collapseNode: 'Collapse Node',
      expandNode: 'Expand Node',
      acceptMerge: 'Accept AI Suggestion',
    };

    return nameMap[actionName] || actionName.replace(/([A-Z])/g, ' $1').trim();
  };

  const getActionIcon = (actionName?: string) => {
    if (state.isMajor) return <Milestone className="h-4 w-4" />;
    if (state.isSnapshot) return <GitCommit className="h-4 w-4" />;
    return <Clock className="h-4 w-4" />;
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{
        ease: [0.215, 0.61, 0.355, 1], // ease-out-cubic
        duration: 0.3,
      }}
      className={cn(
        'flex items-start gap-3 rounded-lg border p-3 transition-all',
        'hover:scale-[1.01]',
        isCurrent
          ? 'border-teal-500 bg-teal-900/20 shadow-[0_0_0_1px_rgba(96,165,250,0.3)]'
          : 'border-white/6 bg-[#1E1E1E] hover:border-white/10 hover:bg-[#222222]'
      )}
      style={{
        backgroundColor: isCurrent
          ? 'rgba(20, 184, 166, 0.1)'
          : GlassmorphismTheme.elevation[1],
        borderColor: isCurrent
          ? GlassmorphismTheme.borders.selected
          : GlassmorphismTheme.borders.default,
        transition: GlassmorphismTheme.effects.transition,
      }}
    >
      {/* Icon */}
      <div
        className={cn(
          'mt-0.5 flex-shrink-0',
          isCurrent ? 'text-teal-400' : 'text-zinc-400'
        )}
      >
        {getActionIcon(state.actionName)}
      </div>

      {/* Content */}
      <div className="flex-grow">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-grow">
            <h4
              className={cn(
                'text-sm font-medium',
                isCurrent ? 'text-teal-300' : 'text-white/87'
              )}
            >
              {getActionDisplayName(state.actionName)}
            </h4>
            <p className="text-xs text-white/60">
              {formatTimestamp(state.timestamp)}
            </p>
            <div className="mt-1 flex gap-3 text-xs text-white/38">
              <span>Nodes: {state.nodeCount}</span>
              <span>Edges: {state.edgeCount}</span>
            </div>
          </div>

          {/* Action button */}
          {!isCurrent && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleRevert}
              disabled={isLoading}
              className={cn(
                'h-6 px-2 text-xs',
                'border-white/10 text-white/87',
                'hover:border-white/20 hover:bg-white/5'
              )}
              style={{
                backgroundColor: GlassmorphismTheme.buttons.standard.background,
                borderColor: GlassmorphismTheme.buttons.standard.border,
              }}
            >
              Revert
            </Button>
          )}

          {isCurrent && (
            <span className="text-xs font-semibold text-teal-400">Current</span>
          )}
        </div>

        {/* Major checkpoint badge */}
        {state.isMajor && (
          <div className="mt-2">
            <span
              className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium"
              style={{
                backgroundColor: 'rgba(96, 165, 250, 0.15)',
                color: 'rgba(96, 165, 250, 0.87)',
              }}
            >
              <Milestone className="h-3 w-3" />
              Checkpoint
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
```

### Component 4.4: Other Components

Create remaining components:

- **history-timeline.tsx**: Visual timeline showing snapshots over time
- **history-filters.tsx**: Filter by date range, action type (pro only)
- **history-empty-state.tsx**: Empty state with call-to-action
- **history-actions.tsx**: Bulk actions (clear history, export - pro only)
- **history-item-skeleton.tsx**: Loading skeleton with pulsing animation

_Note: Due to length constraints, full implementations for these components follow the same patterns as above with proper theming and animations._

---

## Phase 5: Types & Helpers

**Time Estimate**: 15 minutes
**Files Modified**: 1
**Files Created**: 3

### File 5.1: Update History Types

**File**: `src/types/history-state.ts`

```typescript
import { Node } from '@xyflow/react';
import { AppEdge } from './app-edge';
import { NodeData } from './node-data';

// Base history state
export interface HistoryState {
	id: string; // UUID for DB persistence
	snapshotId?: string; // Reference to snapshot if this is an event
	isSnapshot: boolean; // True if full snapshot, false if event

	// Full state (only for snapshots or in-memory cache)
	nodes?: Node<NodeData>[];
	edges?: AppEdge[];

	// Delta (only for events)
	changes?: HistoryDelta;

	// Metadata
	actionName: string;
	timestamp: number;
	userId?: string;
	nodeCount: number;
	edgeCount: number;
	isMajor?: boolean; // User-triggered checkpoints
}

// Delta change structure
export interface HistoryDelta {
	operation: 'add' | 'update' | 'delete' | 'batch';
	entityType: 'node' | 'edge' | 'mixed';
	changes: Array<{
		id: string;
		type: 'node' | 'edge';
		before?: Partial<Node<NodeData> | AppEdge>;
		after?: Partial<Node<NodeData> | AppEdge>;
	}>;
}

// API response types
export interface HistoryListResponse {
	items: HistoryItem[];
	total: number;
	hasMore: boolean;
	snapshots: number;
	events: number;
}

export interface HistoryItem {
	id: string;
	type: 'snapshot' | 'event';
	snapshotIndex?: number;
	snapshotId?: string;
	eventIndex?: number;
	actionName: string;
	nodeCount?: number;
	edgeCount?: number;
	operationType?: string;
	entityType?: string;
	isMajor?: boolean;
	timestamp: number;
}

// Retention policy types
export interface RetentionPolicy {
	maxAge: number; // milliseconds
	maxSnapshots: number;
	maxEventsPerSnapshot: number;
	inMemoryCache: number;
	storageQuota: number; // bytes
	cleanupInterval: number; // milliseconds
	snapshotFrequency: {
		byActions: number;
		byTime: number; // milliseconds
	};
	allowManualCheckpoints?: boolean;
}

// Constants
export const RETENTION_POLICIES: Record<'free' | 'pro', RetentionPolicy> = {
	free: {
		maxAge: 24 * 60 * 60 * 1000, // 24 hours
		maxSnapshots: 20,
		maxEventsPerSnapshot: 5,
		inMemoryCache: 10,
		storageQuota: 5 * 1024 * 1024, // 5MB
		cleanupInterval: 60 * 60 * 1000, // 1 hour
		snapshotFrequency: {
			byActions: 10,
			byTime: 30 * 60 * 1000, // 30 minutes
		},
	},
	pro: {
		maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days
		maxSnapshots: 100,
		maxEventsPerSnapshot: 20,
		inMemoryCache: 20,
		storageQuota: 50 * 1024 * 1024, // 50MB
		cleanupInterval: 24 * 60 * 60 * 1000, // 24 hours
		snapshotFrequency: {
			byActions: 10,
			byTime: 15 * 60 * 1000, // 15 minutes
		},
		allowManualCheckpoints: true,
	},
};
```

### File 5.2: Delta Calculator

**File**: `src/helpers/history/delta-calculator.ts`

```typescript
import { AppEdge } from '@/types/app-edge';
import { AppNode } from '@/types/app-node';
import { HistoryDelta } from '@/types/history-state';

/**
 * Calculates the delta (difference) between two states.
 * Only stores changed fields to minimize storage.
 */
export function calculateDelta(
	oldState: { nodes: AppNode[]; edges: AppEdge[] },
	newState: { nodes: AppNode[]; edges: AppEdge[] }
): HistoryDelta | null {
	const changes: HistoryDelta['changes'] = [];

	// Process nodes
	const oldNodeMap = new Map(oldState.nodes.map((n) => [n.id, n]));
	const newNodeMap = new Map(newState.nodes.map((n) => [n.id, n]));

	// Added nodes
	for (const [id, node] of newNodeMap) {
		if (!oldNodeMap.has(id)) {
			changes.push({
				id,
				type: 'node',
				after: node,
			});
		}
	}

	// Deleted nodes
	for (const [id, node] of oldNodeMap) {
		if (!newNodeMap.has(id)) {
			changes.push({
				id,
				type: 'node',
				before: node,
			});
		}
	}

	// Updated nodes
	for (const [id, newNode] of newNodeMap) {
		const oldNode = oldNodeMap.get(id);
		if (oldNode) {
			const changedFields = getChangedFields(oldNode, newNode);
			if (Object.keys(changedFields.before).length > 0) {
				changes.push({
					id,
					type: 'node',
					before: changedFields.before,
					after: changedFields.after,
				});
			}
		}
	}

	// Process edges (same logic)
	const oldEdgeMap = new Map(oldState.edges.map((e) => [e.id, e]));
	const newEdgeMap = new Map(newState.edges.map((e) => [e.id, e]));

	for (const [id, edge] of newEdgeMap) {
		if (!oldEdgeMap.has(id)) {
			changes.push({
				id,
				type: 'edge',
				after: edge,
			});
		}
	}

	for (const [id, edge] of oldEdgeMap) {
		if (!newEdgeMap.has(id)) {
			changes.push({
				id,
				type: 'edge',
				before: edge,
			});
		}
	}

	for (const [id, newEdge] of newEdgeMap) {
		const oldEdge = oldEdgeMap.get(id);
		if (oldEdge) {
			const changedFields = getChangedFields(oldEdge, newEdge);
			if (Object.keys(changedFields.before).length > 0) {
				changes.push({
					id,
					type: 'edge',
					before: changedFields.before,
					after: changedFields.after,
				});
			}
		}
	}

	if (changes.length === 0) return null;

	// Determine operation type
	const operation =
		changes.length === 1
			? changes[0].before && changes[0].after
				? 'update'
				: changes[0].before
					? 'delete'
					: 'add'
			: 'batch';

	// Determine entity type
	const entityType = changes.every((c) => c.type === 'node')
		? 'node'
		: changes.every((c) => c.type === 'edge')
			? 'edge'
			: 'mixed';

	return {
		operation,
		entityType,
		changes,
	};
}

/**
 * Applies a delta to a state, reconstructing the state at that point.
 */
export function applyDelta(
	baseState: { nodes: AppNode[]; edges: AppEdge[] },
	delta: HistoryDelta
): { nodes: AppNode[]; edges: AppEdge[] } {
	let nodes = [...baseState.nodes];
	let edges = [...baseState.edges];

	for (const change of delta.changes) {
		if (change.type === 'node') {
			if (change.before && !change.after) {
				// Delete
				nodes = nodes.filter((n) => n.id !== change.id);
			} else if (!change.before && change.after) {
				// Add
				nodes.push(change.after as AppNode);
			} else if (change.before && change.after) {
				// Update
				const index = nodes.findIndex((n) => n.id === change.id);
				if (index !== -1) {
					nodes[index] = {
						...nodes[index],
						...change.after,
					};
				}
			}
		} else if (change.type === 'edge') {
			if (change.before && !change.after) {
				edges = edges.filter((e) => e.id !== change.id);
			} else if (!change.before && change.after) {
				edges.push(change.after as AppEdge);
			} else if (change.before && change.after) {
				const index = edges.findIndex((e) => e.id === change.id);
				if (index !== -1) {
					edges[index] = {
						...edges[index],
						...change.after,
					};
				}
			}
		}
	}

	return { nodes, edges };
}

/**
 * Gets only the changed fields between two objects.
 * Deep comparison for nested objects.
 */
function getChangedFields(
	oldObj: any,
	newObj: any
): { before: any; after: any } {
	const before: any = {};
	const after: any = {};

	const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

	for (const key of allKeys) {
		// Skip React Flow internal keys
		if (key === 'selected' || key === 'dragging' || key === 'measured') {
			continue;
		}

		const oldVal = oldObj[key];
		const newVal = newObj[key];

		// Deep comparison
		if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
			before[key] = oldVal;
			after[key] = newVal;
		}
	}

	return { before, after };
}

/**
 * Compresses a snapshot by removing redundant data.
 * Can be used before storing old snapshots to save space.
 */
export function compressSnapshot(state: {
	nodes: AppNode[];
	edges: AppEdge[];
}): { nodes: any[]; edges: any[] } {
	// Remove React Flow internals and redundant fields
	const nodes = state.nodes.map((node) => ({
		id: node.id,
		type: node.type,
		position: node.position,
		data: node.data,
		width: node.measured?.width,
		height: node.measured?.height,
		parentId: node.parentId,
	}));

	const edges = state.edges.map((edge) => ({
		id: edge.id,
		source: edge.source,
		target: edge.target,
		type: edge.type,
		data: edge.data,
		label: edge.label,
	}));

	return { nodes, edges };
}
```

### File 5.3: Compression Helper

**File**: `src/helpers/history/compression.ts`

```typescript
/**
 * Compression utilities for history storage.
 * Uses simple string-based compression for JSONB data.
 */

/**
 * Compresses a JSON object to a string.
 * In a production environment, consider using:
 * - pako (gzip compression)
 * - lz-string (LZ-based compression)
 *
 * For now, we use JSON.stringify with minification.
 */
export function compressJSON(data: any): string {
	return JSON.stringify(data);
}

/**
 * Decompresses a string back to JSON.
 */
export function decompressJSON<T = any>(compressed: string): T {
	return JSON.parse(compressed);
}

/**
 * Estimates the size of a history state in bytes.
 */
export function estimateStateSize(state: {
	nodes: any[];
	edges: any[];
}): number {
	const json = JSON.stringify(state);
	return new Blob([json]).size;
}

/**
 * Checks if a state exceeds the size limit.
 */
export function exceedsSizeLimit(
	state: { nodes: any[]; edges: any[] },
	limitBytes: number
): boolean {
	return estimateStateSize(state) > limitBytes;
}
```

### File 5.4: Retention Enforcer

**File**: `src/helpers/history/retention-enforcer.ts`

```typescript
import { RetentionPolicy, RETENTION_POLICIES } from '@/types/history-state';

/**
 * Enforces retention policies for history storage.
 */

/**
 * Gets the retention policy for a user based on their plan.
 */
export function getRetentionPolicy(planName: string): RetentionPolicy {
	return planName === 'pro' ? RETENTION_POLICIES.pro : RETENTION_POLICIES.free;
}

/**
 * Checks if a snapshot should be cleaned up based on retention policy.
 */
export function shouldCleanupSnapshot(
	snapshotAge: number,
	isMajor: boolean,
	policy: RetentionPolicy
): boolean {
	// Major snapshots are preserved longer
	if (isMajor) {
		return snapshotAge > policy.maxAge * 2;
	}

	return snapshotAge > policy.maxAge;
}

/**
 * Calculates the cleanup priority for a snapshot.
 * Lower number = higher priority to delete.
 */
export function getCleanupPriority(
	snapshot: {
		created_at: string;
		is_major: boolean;
		size_bytes: number;
	},
	policy: RetentionPolicy
): number {
	const age = Date.now() - new Date(snapshot.created_at).getTime();
	const ageRatio = age / policy.maxAge;

	// Factors:
	// - Age (older = higher priority)
	// - Major flag (major = lower priority)
	// - Size (larger = higher priority for space)

	let priority = ageRatio * 100;

	if (snapshot.is_major) {
		priority *= 0.5; // Major snapshots have half the priority
	}

	if (snapshot.size_bytes > 1024 * 1024) {
		// > 1MB
		priority *= 1.2; // Large snapshots prioritized for cleanup
	}

	return priority;
}

/**
 * Checks if user has exceeded their storage quota.
 */
export async function checkStorageQuota(
	userId: string,
	supabase: any
): Promise<{
	exceeded: boolean;
	usage: number;
	quota: number;
	percentage: number;
}> {
	const { data } = await supabase.rpc('get_user_history_storage', {
		p_user_id: userId,
	});

	if (!data || data.length === 0) {
		return {
			exceeded: false,
			usage: 0,
			quota: RETENTION_POLICIES.free.storageQuota,
			percentage: 0,
		};
	}

	const result = data[0];
	return {
		exceeded: result.usage_percentage > 100,
		usage: result.total_size_bytes,
		quota: result.quota_bytes,
		percentage: result.usage_percentage,
	};
}
```

---

## Phase 6: Cleanup & Monitoring

**Time Estimate**: 20 minutes
**Files Created**: 2

### File 6.1: Scheduled Cleanup Job

**File**: `src/app/api/cron/cleanup-history/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/helpers/supabase/server';

/**
 * POST /api/cron/cleanup-history
 *
 * Scheduled cleanup job for history retention.
 * Should be called by:
 * - Vercel Cron (vercel.json)
 * - Supabase Edge Function with pg_cron
 * - External scheduler (e.g., GitHub Actions)
 *
 * Security: Use bearer token or IP whitelist
 */
export async function POST(req: NextRequest) {
	// Verify cron secret
	const authHeader = req.headers.get('authorization');
	const cronSecret = process.env.CRON_SECRET;

	if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const supabase = createServerClient();

	try {
		// Call cleanup function
		const { data, error } = await supabase.rpc('cleanup_old_history');

		if (error) throw error;

		console.log('History cleanup completed:', {
			deletedSnapshots: data[0].deleted_snapshots,
			deletedEvents: data[0].deleted_events,
			executionTimeMs: data[0].execution_time_ms,
		});

		return NextResponse.json({
			success: true,
			deletedSnapshots: data[0].deleted_snapshots,
			deletedEvents: data[0].deleted_events,
			executionTimeMs: data[0].execution_time_ms,
		});
	} catch (error) {
		console.error('Cleanup failed:', error);
		return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
	}
}
```

### File 6.2: Storage Monitoring

**File**: `src/app/api/history/storage-usage/route.ts`

```typescript
import { withAuthValidation } from '@/helpers/api/with-auth-validation';
import { createServerClient } from '@/helpers/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { checkStorageQuota } from '@/helpers/history/retention-enforcer';

/**
 * GET /api/history/storage-usage
 *
 * Returns storage usage stats for the current user.
 * Used to show quota warnings in UI.
 */
export const GET = withAuthValidation(async (req: NextRequest, { user }) => {
	const supabase = createServerClient();

	try {
		const quotaInfo = await checkStorageQuota(user.id, supabase);

		return NextResponse.json({
			...quotaInfo,
			warnings: getStorageWarnings(quotaInfo.percentage),
		});
	} catch (error) {
		console.error('Failed to check storage:', error);
		return NextResponse.json(
			{ error: 'Failed to check storage usage' },
			{ status: 500 }
		);
	}
});

function getStorageWarnings(percentage: number): string[] {
	const warnings: string[] = [];

	if (percentage >= 100) {
		warnings.push(
			'Storage quota exceeded. Oldest history will be automatically cleaned up.'
		);
	} else if (percentage >= 90) {
		warnings.push('Storage quota is 90% full. Consider upgrading to Pro.');
	} else if (percentage >= 80) {
		warnings.push('Storage quota is 80% full.');
	}

	return warnings;
}
```

### File 6.3: Add to vercel.json

**File**: `vercel.json`

```json
{
	"crons": [
		{
			"path": "/api/cron/cleanup-history",
			"schedule": "0 */6 * * *"
		}
	]
}
```

---

## Testing Strategy

### Unit Tests

```typescript
// src/__tests__/helpers/delta-calculator.test.ts
describe('calculateDelta', () => {
	it('should detect added nodes', () => {
		// Test implementation
	});

	it('should detect deleted nodes', () => {
		// Test implementation
	});

	it('should detect updated nodes with only changed fields', () => {
		// Test implementation
	});

	it('should handle batch operations', () => {
		// Test implementation
	});
});

// src/__tests__/helpers/retention-enforcer.test.ts
describe('getCleanupPriority', () => {
	it('should prioritize old snapshots over recent ones', () => {
		// Test implementation
	});

	it('should deprioritize major snapshots', () => {
		// Test implementation
	});
});
```

### Integration Tests

```typescript
// src/__tests__/api/history.test.ts
describe('History API', () => {
	it('should list history with pagination', async () => {
		// Test implementation
	});

	it('should create manual checkpoint for pro users', async () => {
		// Test implementation
	});

	it('should deny manual checkpoint for free users', async () => {
		// Test implementation
	});

	it('should revert to historical state', async () => {
		// Test implementation
	});
});
```

### E2E Tests (Playwright)

```typescript
// e2e/history-sidebar.spec.ts
test('should show history in sidebar', async ({ page }) => {
	// Navigate to map
	// Open history sidebar
	// Verify history items displayed
	// Test revert functionality
});

test('should respect retention policies', async ({ page }) => {
	// Create 25 history entries as free user
	// Verify only 20 are kept
});
```

---

## Rollout Plan

### Phase 1: Database Migration (Week 1)

- ✅ Apply migration to dev environment
- ✅ Test with sample data
- ✅ Verify RLS policies work correctly
- ✅ Monitor performance of indexes

### Phase 2: Backend Implementation (Week 1-2)

- ✅ Implement API routes
- ✅ Update history slice
- ✅ Test sync queue and background sync
- ✅ Verify cleanup function works

### Phase 3: Frontend Components (Week 2)

- ✅ Refactor components
- ✅ Apply theming and animations
- ✅ Test with real data
- ✅ Verify virtualization performance

### Phase 4: Testing (Week 3)

- ✅ Write unit tests
- ✅ Write integration tests
- ✅ Manual QA testing
- ✅ Performance testing with large maps

### Phase 5: Gradual Rollout (Week 3-4)

- ✅ Deploy to 10% of users (canary)
- ✅ Monitor error rates and performance
- ✅ Deploy to 50% of users
- ✅ Full rollout

### Phase 6: Monitoring (Ongoing)

- ✅ Set up dashboards for storage usage
- ✅ Monitor cleanup job execution
- ✅ Track conversion metrics (free → pro)
- ✅ Gather user feedback

---

## Success Metrics

### Performance Metrics

- **Memory Usage**: < 5MB for large maps (down from 25MB+)
- **Load Time**: < 100ms for recent history
- **Sync Latency**: < 50ms for in-memory operations
- **DB Query Time**: < 200ms for paginated list

### Business Metrics

- **Storage Costs**: < $0.0003/user/month (free), < $0.003/user/month (pro)
- **Conversion Rate**: 5-10% of free users hitting 24h limit upgrade to pro
- **User Satisfaction**: > 4.5/5 for history feature

### Technical Metrics

- **Cleanup Success Rate**: > 99.9%
- **Sync Error Rate**: < 0.1%
- **RLS Policy Violations**: 0
- **P99 API Latency**: < 500ms

---

## Rollback Plan

If critical issues arise:

1. **Immediate**: Feature flag to disable DB persistence, fall back to in-memory only
2. **Short-term**: Revert to previous version via Git
3. **Long-term**: Fix issues and re-deploy with additional safeguards

---

## Future Enhancements

1. **Branching History**: Allow users to create branches from historical states
2. **Collaborative History**: See who made each change in shared maps
3. **Export/Import**: Export history as JSON for backup
4. **Advanced Filters**: Filter by user, date range, entity type
5. **Visual Diff**: Show visual diff between states
6. **History Analytics**: Charts showing activity over time

---

## Appendix

### Animation Guidelines Reference

From `animation-guidelines.md`:

```typescript
// ✅ CORRECT animations
transition={{
  ease: [0.215, 0.61, 0.355, 1], // ease-out-cubic
  duration: 0.3, // Max 0.3s for UI
}}

// ❌ WRONG animations
transition={{
  ease: 'easeOut' as const, // Don't use string literals
  duration: 0.5, // Too slow
}}
```

### Glassmorphism Theme Reference

```typescript
import GlassmorphismTheme from '@/components/nodes/themes/glassmorphism-theme';

// Use theme values instead of hardcoding
style={{
  backgroundColor: GlassmorphismTheme.elevation[1],
  borderColor: GlassmorphismTheme.borders.default,
  color: GlassmorphismTheme.text.high,
}}
```

### Supabase MCP Tools Reference

```typescript
// List tables
await mcp__supabase__list_tables({
	project_id: 'ujnxxmstknvitruemeai',
	schemas: ['public'],
});

// Apply migration
await mcp__supabase__apply_migration({
	project_id: 'ujnxxmstknvitruemeai',
	name: 'create_history_system',
	query: '/* SQL here */',
});

// Execute SQL
await mcp__supabase__execute_sql({
	project_id: 'ujnxxmstknvitruemeai',
	query: 'SELECT * FROM cleanup_old_history();',
});
```

---

## Contact & Questions

If you encounter issues during implementation:

1. **Review this document** for implementation details
2. **Check existing code patterns** in the codebase
3. **Consult animation-guidelines.md** for animation rules
4. **Consult glassmorphism-theme.ts** for theming
5. **Test with Supabase MCP** before production deployment

---

**Document Version**: 1.0
**Last Updated**: 2025-10-12
**Status**: Ready for Implementation ✅
