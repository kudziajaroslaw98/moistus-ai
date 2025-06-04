import { useEffect, useCallback } from 'react';
import useAppStore from '@/contexts/mind-map/mind-map-store';
import { 
  UseCollaborationReturn,
  CreateActivityRequest,
  ActivityFilters,
  SelectionType,
  UpdatePresenceRequest
} from '@/types/collaboration-types';

export function useCollaboration(mapId?: string): UseCollaborationReturn {
  const {
    // Connection state
    isConnected,
    isConnecting,
    connectionError,
    connect,
    disconnect,
    
    // Presence
    activeUsers,
    activeCollaborationUser,
    joinMap,
    leaveMap,
    updatePresence: storeUpdatePresence,
    setUserStatus,
    
    // Cursors
    cursors,
    showCursors,
    updateCursor: storeUpdateCursor,
    setCursorInteractionState,
    toggleCursorVisibility,
    
    // Selections
    selections,
    nodeStates,
    selectNode: storeSelectNode,
    deselectNode: storeDeselectNode,
    clearSelections: storeClearSelections,
    setNodeEditingState,
    checkEditPermission,
    
    // Activities
    activities,
    activityFilters,
    isLoadingActivities,
    logActivity: storeLogActivity,
    loadActivities: storeLoadActivities,
    setActivityFilters,
    clearActivityFilters,
    
    // Conflicts
    conflictModal,
    
    // UI
    showActivityFeed,
    showPresenceIndicators,
    toggleActivityFeed,
    togglePresenceIndicators,
    
    // Utilities
    getUserColor,
    isUserActive,
    getNodeCollaborativeState,
    getActiveCollaborationUser
  } = useAppStore();

  // Connection management
  const connectToMap = useCallback(async (targetMapId: string) => {
    try {
      await connect(targetMapId);
    } catch (error) {
      console.error('Failed to connect to collaboration:', error);
    }
  }, [connect]);

  const disconnectFromMap = useCallback(async () => {
    try {
      await disconnect();
    } catch (error) {
      console.error('Failed to disconnect from collaboration:', error);
    }
  }, [disconnect]);

  // Presence management
  const updatePresence = useCallback(async (updates: Partial<UpdatePresenceRequest>) => {
    await storeUpdatePresence(updates);
  }, [storeUpdatePresence]);

  // Cursor tracking
  const updateCursor = useCallback((
    position: { x: number; y: number }, 
    viewport: { x: number; y: number; zoom: number }
  ) => {
    storeUpdateCursor(position, viewport);
  }, [storeUpdateCursor]);

  // Node selection
  const selectNode = useCallback(async (nodeId: string, selectionType: SelectionType = 'selected') => {
    await storeSelectNode(nodeId, selectionType);
  }, [storeSelectNode]);

  const deselectNode = useCallback(async (nodeId: string) => {
    await storeDeselectNode(nodeId);
  }, [storeDeselectNode]);

  const clearSelections = useCallback(async () => {
    await storeClearSelections();
  }, [storeClearSelections]);

  // Activity tracking
  const logActivity = useCallback(async (activity: CreateActivityRequest) => {
    try {
      await storeLogActivity(activity);
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  }, [storeLogActivity]);

  const loadActivities = useCallback(async (filters?: ActivityFilters) => {
    try {
      await storeLoadActivities(filters);
    } catch (error) {
      console.error('Failed to load activities:', error);
    }
  }, [storeLoadActivities]);

  // Conflict resolution
  const resolveConflict = useCallback(async (resolution: 'accept' | 'reject' | 'merge') => {
    console.log('Resolve conflict:', resolution);
  }, []);

  // Utility functions
  const canEditNode = useCallback((nodeId: string): boolean => {
    return checkEditPermission(nodeId);
  }, [checkEditPermission]);

  // Auto-connect when mapId is provided
  useEffect(() => {
    if (mapId && !isConnected && !isConnecting) {
      connectToMap(mapId);
    }
  }, [mapId, isConnected, isConnecting, connectToMap]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isConnected) {
        disconnectFromMap();
      }
    };
  }, []);

  // State object matching the interface
  const state = {
    isConnected,
    isConnecting,
    connectionError,
    currentSession: undefined,
    presenceChannel: null,
    activeUsers,
    currentUser: activeCollaborationUser,
    cursors,
    showCursors,
    selections,
    nodeStates,
    activities,
    activityFilters,
    isLoadingActivities,
    showActivityFeed,
    showPresenceIndicators,
    conflictModal,
    cursorUpdateThrottle: 50,
    maxActivitiesInMemory: 500
  };

  return {
    // State
    state,
    
    // Connection management
    connect: connectToMap,
    disconnect: disconnectFromMap,
    
    // Presence management
    updatePresence,
    
    // Cursor tracking
    updateCursor,
    
    // Node selection
    selectNode,
    deselectNode,
    clearSelections,
    
    // Activity tracking
    logActivity,
    loadActivities,
    
    // Conflict resolution
    resolveConflict,
    
    // Utility functions
    getUserColor,
    isUserActive,
    canEditNode: canEditNode
  };
}