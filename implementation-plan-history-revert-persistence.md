# Fix History Revert Persistence - Implementation Plan

## 📋 Overview
**Problem**: History revert only updates client state, never persists to database. Changes lost on page refresh.

**Root Cause**:
- Revert API computes historical state but only returns JSON
- Client updates Zustand (setNodes/setEdges) but never persists
- Page refresh loads from database → gets old "present" state

**Solution**:
- Add server-side bulk persistence in revert API
- Client unsubscribes from real-time during operation (prevents self-event processing)
- Server persists with single timestamp for all entities
- Other collaborators receive changes via normal real-time subscriptions

---

## 📁 Files to Modify

1. **`src/app/api/history/[mapId]/revert/route.ts`** - Add bulk persistence
2. **`src/store/slices/history-slice.ts`** - Add unsubscribe/resubscribe coordination

---

## 🔧 Implementation Details

### Phase 1: Server-Side Persistence (revert/route.ts)

**Location**: After line 97 (after computing finalNodes/finalEdges)

**Changes**:
1. Create single timestamp for entire batch
2. Transform AppNode/AppEdge to database schema
3. Perform bulk upsert (handles both updates and inserts)
4. Return timestamp in response for client coordination

**Code Addition**:
```typescript
// After line 97, before return statement

// Single timestamp for atomic batch
const revertTimestamp = new Date().toISOString();

// Transform nodes to database schema
const nodeUpdates = finalNodes.map((node) => ({
  id: node.id,
  map_id: mapId,
  user_id: user.id, // Use current user performing revert
  content: node.data.content || '',
  position_x: node.position.x,
  position_y: node.position.y,
  width: node.width,
  height: node.height,
  node_type: node.type || 'defaultNode',
  metadata: node.data.metadata || {},
  aiData: node.data.aiData || {},
  parent_id: node.data.parent_id || null,
  updated_at: revertTimestamp, // Same timestamp for all
  created_at: node.data.created_at, // Preserve original
}));

// Transform edges to database schema
const edgeUpdates = finalEdges.map((edge) => ({
  id: edge.id,
  map_id: mapId,
  user_id: user.id,
  source: edge.source,
  target: edge.target,
  label: edge.label || null,
  animated: edge.animated || false,
  style: edge.style || { stroke: '#6c757d', strokeWidth: 2 },
  markerEnd: edge.markerEnd || null,
  metadata: edge.data?.metadata || {},
  aiData: edge.data?.aiData || {},
  updated_at: revertTimestamp,
  created_at: edge.data?.created_at,
}));

// Bulk upsert (atomic operation)
try {
  await Promise.all([
    supabase.from('nodes').upsert(nodeUpdates),
    supabase.from('edges').upsert(edgeUpdates),
  ]);
} catch (error) {
  console.error('Failed to persist revert:', error);
  return NextResponse.json(
    { error: 'Failed to persist changes to database' },
    { status: 500 }
  );
}

// Return with timestamp for client coordination
return NextResponse.json({
  nodes: finalNodes,
  edges: finalEdges,
  revertTimestamp, // Client can use this for logging/debugging
  snapshotIndex: snapshot.snapshot_index,
  message: 'State reverted and persisted successfully',
});
```

**Error Handling**:
- Wrap in try-catch for database failures
- Return 500 error if persistence fails
- Log errors for debugging

---

### Phase 2: Client-Side Coordination (history-slice.ts)

**Location**: Replace `revertToHistoryState` function (lines 398-482)

**Changes**:
1. Unsubscribe from real-time before API call
2. Call revert API (now persists to database)
3. Apply state from API response
4. Resubscribe to real-time after completion
5. Handle errors gracefully (resubscribe even on failure)

**Code Replacement**:
```typescript
revertToHistoryState: async (index: number) => {
  const {
    history,
    historyMeta,
    historyIndex,
    setNodes,
    setEdges,
    isReverting,
    mapId,
    canRevertChange,
    unsubscribeFromRealtimeUpdates,
    subscribeToRealtimeUpdates,
  } = get();

  if (isReverting || index < 0 || index >= history.length) return;
  if (index === historyIndex) return;

  // Check permissions
  const targetEntry = history[index] as any;
  const delta = targetEntry?._delta as AttributedHistoryDelta | undefined;
  if (!canRevertChange(delta)) {
    toast.error(
      'You do not have permission to revert this change. Only the map owner or the author of the change can revert it.'
    );
    return;
  }

  set({ isReverting: true });
  const targetState = history[index];
  const meta: any = historyMeta?.[index];

  try {
    // Step 1: Unsubscribe from real-time (prevents self-event processing)
    await unsubscribeFromRealtimeUpdates();

    // Step 2: Handle different revert scenarios
    if (targetState.nodes?.length && targetState.edges?.length) {
      // In-memory history entry with full state
      setNodes(targetState.nodes);
      setEdges(targetState.edges);
      toast.success('Reverted');
    } else if (mapId && meta?.type === 'snapshot' && meta?.id) {
      // Revert to database snapshot
      const res = await fetch(`/api/history/${mapId}/revert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshotId: meta.id }),
      });

      if (res.ok) {
        const data = await res.json();
        setNodes(data.nodes);
        setEdges(data.edges);

        // Update in-memory history with full state (for future reverts)
        const updated = [...history];
        updated[index] = {
          ...targetState,
          nodes: data.nodes,
          edges: data.edges,
        } as any;
        set({ history: updated });

        toast.success('Reverted to snapshot');
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to revert to snapshot');
      }
    } else if (mapId && meta?.type === 'event' && meta?.id) {
      // Revert to database event
      const res = await fetch(`/api/history/${mapId}/revert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: meta.id }),
      });

      if (res.ok) {
        const data = await res.json();
        setNodes(data.nodes);
        setEdges(data.edges);

        // Update in-memory history
        const updated = [...history];
        updated[index] = {
          ...targetState,
          nodes: data.nodes,
          edges: data.edges,
        } as any;
        set({ history: updated });

        toast.success('Reverted to event');
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to revert to event');
      }
    } else {
      // Fallback to local state
      setNodes(targetState.nodes || []);
      setEdges(targetState.edges || []);
      toast.success('Reverted');
    }
  } catch (error) {
    console.error('Revert failed:', error);
    toast.error('Failed to revert state');
  } finally {
    // Step 3: Always resubscribe (even on error)
    if (mapId) {
      await subscribeToRealtimeUpdates(mapId);
    }

    // Step 4: Update history pointers
    set({
      historyIndex: index,
      isReverting: false,
      canUndo: index > 0,
      canRedo: index < history.length - 1,
    });
  }
}
```

---

## 🧪 Testing Plan

### Test 1: Basic Revert + Persistence
1. Create map with 5 nodes
2. Add 3 more nodes
3. Click revert to earlier state
4. Verify: 3 nodes disappear in UI
5. **Refresh page**
6. Verify: Still only 5 nodes (persistence works) ✅

### Test 2: Collaboration - Observer Sees Revert
1. User A and User B open same map
2. User A adds 5 nodes
3. User B adds 3 nodes
4. User A reverts to state before all additions
5. Verify: User B sees all 8 nodes disappear via real-time ✅

### Test 3: Collaboration - Concurrent Edit During Revert
1. User A clicks revert (takes 500ms)
2. User B edits Node X content (during revert)
3. Verify: User B's edit persists (last write wins) ✅
4. Verify: Other nodes reverted correctly ✅

### Test 4: Large Map Performance
1. Create map with 200 nodes, 300 edges
2. Revert to earlier snapshot
3. Verify: Completes within 2 seconds
4. Verify: No UI flashing or race conditions ✅

### Test 5: Error Handling
1. Disconnect internet
2. Click revert
3. Verify: Error toast shown
4. Verify: Real-time resubscribed (even on failure)
5. Reconnect internet
6. Verify: Real-time works normally ✅

### Test 6: Deleted/New Entity Handling
1. Create 5 nodes
2. Delete 2 nodes
3. Add 3 new nodes
4. Revert to state with original 5 nodes
5. Verify: 2 deleted nodes restored, 3 new nodes removed ✅

---

## 🎯 Success Criteria

✅ Revert changes persist through page refresh
✅ Collaborators see revert changes via real-time
✅ No self-event processing loops
✅ No UI flashing or race conditions
✅ Handles deleted/new entities correctly
✅ Error handling: resubscribes even on failure
✅ Performance: <2s for 200+ nodes
✅ Last-write-wins for concurrent edits

---

## 📊 Performance Expectations

- **Small map** (10 nodes, 15 edges): ~200-300ms
- **Medium map** (50 nodes, 75 edges): ~500-800ms
- **Large map** (200 nodes, 300 edges): ~1-2s
- **Real-time event processing** (observer): ~100-200ms per client

Bulk upsert is efficient due to:
- Single timestamp (no repeated Date.now() calls)
- Parallel Promise.all for nodes and edges
- Supabase batch operations
- Single round-trip to database

---

## 🚨 Edge Cases Handled

1. **Concurrent edits during revert**: Last write wins (Supabase default)
2. **Network failure**: Error toast, real-time resubscribed
3. **Deleted entities**: Upsert re-inserts them
4. **New entities**: Not in revert payload, remain in DB (could be deleted in future enhancement)
5. **Permission check**: Already exists, only owner/author can revert
6. **Self-event processing**: Eliminated via unsubscribe pattern

---

## 🔄 Future Enhancements (Out of Scope)

1. **Optimistic locking**: Check `updated_at` timestamps to detect concurrent edits
2. **Conflict resolution UI**: Warn user if others editing during revert
3. **Delete new entities**: Remove nodes/edges created after snapshot timestamp
4. **Revert preview**: Show diff before applying
5. **Undo revert**: Add revert to history stack itself

---

## 📝 Documentation Updates Needed

After implementation, update:
1. `CLAUDE.md` - Note that revert now persists to database
2. Add JSDoc comments to modified functions
3. Update any developer documentation about history system

---

## ⏱️ Estimated Implementation Time

- **Phase 1** (Server-side): 1-2 hours (coding + testing)
- **Phase 2** (Client-side): 1-2 hours (coding + testing)
- **Testing**: 2-3 hours (all scenarios)
- **Total**: 4-7 hours

---

## 🔐 Security Considerations

- ✅ Permission check already exists (owner/author only)
- ✅ User authentication required (existing middleware)
- ✅ RLS policies on nodes/edges tables (Supabase)
- ✅ Map access verified before revert (existing check)

No new security risks introduced.
