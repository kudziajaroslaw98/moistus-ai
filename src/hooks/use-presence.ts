import { useEffect, useCallback } from 'react';
import useAppStore from '@/contexts/mind-map/mind-map-store';

import { 
  UsePresenceReturn,
  UpdatePresenceRequest
} from '@/types/collaboration-types';

export function usePresence(mapId?: string): UsePresenceReturn {
  const {
    activeUsers,
    activeCollaborationUser,
    isConnected,
    joinMap,
    leaveMap,
    updatePresence: storeUpdatePresence,
    getActiveCollaborationUser
  } = useAppStore();

  // Join map with presence tracking
  const joinMapWithPresence = useCallback(async (targetMapId: string) => {
    try {
      await joinMap(targetMapId);
    } catch (error) {
      console.error('Failed to join map with presence:', error);
      throw error;
    }
  }, [joinMap]);

  // Leave map and cleanup presence
  const leaveMapWithPresence = useCallback(async () => {
    try {
      await leaveMap();
    } catch (error) {
      console.error('Failed to leave map:', error);
    }
  }, [leaveMap]);

  // Update presence
  const updatePresence = useCallback(async (updates: Partial<UpdatePresenceRequest>) => {
    await storeUpdatePresence(updates);
  }, [storeUpdatePresence]);

  // Auto-join when mapId is provided and user is available
  useEffect(() => {
    if (mapId && activeCollaborationUser && !isConnected) {
      joinMapWithPresence(mapId);
    }
  }, [mapId, activeCollaborationUser, isConnected, joinMapWithPresence]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isConnected) {
        leaveMapWithPresence();
      }
    };
  }, []);

  // Track user activity for automatic status updates
  useEffect(() => {
    let idleTimer: NodeJS.Timeout;
    let awayTimer: NodeJS.Timeout;

    const resetTimers = () => {
      clearTimeout(idleTimer);
      clearTimeout(awayTimer);
      
      // Set to active if not already
      if (activeCollaborationUser?.presence.status !== 'active') {
        updatePresence({ status: 'active' });
      }
      
      // Set idle timer (5 minutes)
      idleTimer = setTimeout(() => {
        updatePresence({ status: 'idle' });
        
        // Set away timer (additional 5 minutes)
        awayTimer = setTimeout(() => {
          updatePresence({ status: 'away' });
        }, 5 * 60 * 1000);
      }, 5 * 60 * 1000);
    };

    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'click', 'touchstart'];
    
    activityEvents.forEach(event => {
      document.addEventListener(event, resetTimers, { passive: true });
    });

    // Initialize timers
    resetTimers();

    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, resetTimers);
      });
      clearTimeout(idleTimer);
      clearTimeout(awayTimer);
    };
  }, [activeCollaborationUser, updatePresence]);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        updatePresence({ status: 'away' });
      } else {
        updatePresence({ status: 'active' });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [updatePresence]);

  return {
    activeUsers,
    currentUser: getActiveCollaborationUser(),
    updatePresence,
    joinMap: joinMapWithPresence,
    leaveMap: leaveMapWithPresence
  };
}