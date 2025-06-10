'use client';

import useAppStore from '@/contexts/mind-map/mind-map-store';
import { BroadcastManager } from '@/lib/collaboration/broadcast-manager';
import { ActiveUser } from '@/types/collaboration-types';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Throttle a callback to a certain delay
 */
const useThrottleCallback = <Params extends unknown[], Return>(
  callback: (...args: Params) => Return,
  delay: number
) => {
  const lastCall = useRef(0);
  const timeout = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    (...args: Params) => {
      const now = Date.now();
      const remainingTime = delay - (now - lastCall.current);

      if (remainingTime <= 0) {
        if (timeout.current) {
          clearTimeout(timeout.current);
          timeout.current = null;
        }
        lastCall.current = now;
        callback(...args);
      } else if (!timeout.current) {
        timeout.current = setTimeout(() => {
          lastCall.current = Date.now();
          timeout.current = null;
          callback(...args);
        }, remainingTime);
      }
    },
    [callback, delay]
  );
};

interface CursorPosition {
  x: number;
  y: number;
}

interface UseRealtimeCursorsBridgeOptions {
  mapId: string;
  enabled?: boolean;
  throttleMs?: number;
  containerRef?: React.RefObject<HTMLElement>;
}

export function useRealtimeCursorsBridge({
  mapId,
  enabled = true,
  throttleMs = 50,
  containerRef,
}: UseRealtimeCursorsBridgeOptions) {
  const { currentUser, activeUsers } = useAppStore();
  const [isConnected, setIsConnected] = useState(false);
  const broadcastManagerRef = useRef<BroadcastManager | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Initialize broadcast manager
  useEffect(() => {
    if (!enabled || !mapId || !currentUser?.id) {
      return;
    }

    const initializeBroadcastManager = async () => {
      try {
        const broadcastManager = new BroadcastManager({
          mapId,
          userId: currentUser.id,
          throttleMs,
          enableLogging: process.env.NODE_ENV === 'development',
        });

        broadcastManagerRef.current = broadcastManager;

        // Connect to broadcast channel
        await broadcastManager.connect();
        setIsConnected(true);

        // Subscribe to cursor move events
        const unsubscribe = broadcastManager.subscribe('cursor_move', (event) => {
          // Don't process our own events
          if (event.userId === currentUser.id) return;

          // Find the user in activeUsers
          const eventUser = activeUsers.find(u => u.user_id === event.userId);
          if (!eventUser) return;

          // Dispatch custom event for CursorLayer to consume
          const cursorUpdateEvent = new CustomEvent('cursorUpdate', {
            detail: {
              userId: event.userId,
              position: event.data.position,
              user: eventUser,
              timestamp: event.timestamp,
            },
          });

          window.dispatchEvent(cursorUpdateEvent);
        });

        unsubscribeRef.current = unsubscribe;

        // Subscribe to connection changes
        broadcastManager.subscribe('all', (event) => {
          if (event.data?.eventName === 'connection_change') {
            setIsConnected(event.data.connected);
          }
        });

      } catch (error) {
        console.error('Failed to initialize cursor broadcast:', error);
        setIsConnected(false);
      }
    };

    initializeBroadcastManager();

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      if (broadcastManagerRef.current) {
        broadcastManagerRef.current.disconnect();
        broadcastManagerRef.current = null;
      }
      setIsConnected(false);
    };
  }, [enabled, mapId, currentUser?.id, throttleMs, activeUsers]);

  // Broadcast cursor position
  const broadcastCursorPosition = useCallback(
    async (position: CursorPosition) => {
      if (!broadcastManagerRef.current || !isConnected) return;

      try {
        await broadcastManagerRef.current.broadcastCursorMove({
          position,
          // You can add viewport info here if needed
          // viewport: { x: 0, y: 0, zoom: 1 }
        });
      } catch (error) {
        console.error('Failed to broadcast cursor position:', error);
      }
    },
    [isConnected]
  );

  // Throttled cursor broadcast
  const throttledBroadcast = useThrottleCallback(broadcastCursorPosition, throttleMs);

  // Handle mouse move events
  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!enabled || !isConnected || !currentUser?.id) return;

      let position: CursorPosition;

      if (containerRef?.current) {
        // Calculate position relative to container
        const rect = containerRef.current.getBoundingClientRect();
        position = {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        };
      } else {
        // Use viewport coordinates
        position = {
          x: event.clientX,
          y: event.clientY,
        };
      }

      throttledBroadcast(position);
    },
    [enabled, isConnected, currentUser?.id, containerRef, throttledBroadcast]
  );

  // Add mouse event listeners
  useEffect(() => {
    if (!enabled || !isConnected) return;

    const target = containerRef?.current || window;
    
    target.addEventListener('mousemove', handleMouseMove as EventListener);

    return () => {
      target.removeEventListener('mousemove', handleMouseMove as EventListener);
    };
  }, [enabled, isConnected, handleMouseMove, containerRef]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      if (broadcastManagerRef.current) {
        broadcastManagerRef.current.disconnect();
      }
    };
  }, []);

  return {
    isConnected,
    broadcastCursorPosition,
    // Expose broadcast manager for advanced usage if needed
    broadcastManager: broadcastManagerRef.current,
  };
}