# Realtime Cursors Implementation Guide

## Overview

This document describes the implementation of the realtime cursor system for Moistus AI, which allows users to see each other's mouse cursors in real-time during collaborative mind mapping sessions.

## Architecture

The realtime cursor system consists of several key components that work together:

### Core Components

1. **`useRealtimeCursorsBridge`** - Main hook that coordinates cursor broadcasting and receiving
2. **`CursorLayer`** - Component that renders all active user cursors
3. **`UserCursor`** - Individual cursor component with user info and animations
4. **`BroadcastManager`** - Existing infrastructure for Supabase real-time communication

### Data Flow

```
Mouse Movement → useRealtimeCursorsBridge → BroadcastManager → Supabase Channel
                                                                      ↓
CursorLayer ← Custom Events ← useRealtimeCursorsBridge ← Supabase Channel
```

## Implementation Details

### 1. useRealtimeCursorsBridge Hook

Located: `src/hooks/use-realtime-cursors-bridge.ts`

This hook serves as the bridge between mouse events and cursor display:

- **Captures mouse movements** with throttling (default 50ms)
- **Broadcasts cursor positions** via existing BroadcastManager
- **Receives remote cursor events** and dispatches custom events for display
- **Manages connection state** and handles reconnections

Key features:
- Throttled mouse event handling for performance
- Automatic connection management
- Support for both viewport and container-relative positioning
- Integration with existing user management system

### 2. CursorLayer Component

Located: `src/components/collaboration/user-cursor.tsx`

Enhanced component that manages multiple cursors:

- **Filters out current user** to avoid showing own cursor
- **Handles cursor lifecycle** with automatic cleanup
- **Manages inactivity timers** to hide stale cursors
- **Renders active cursors** with smooth animations

### 3. UserCursor Component

Individual cursor rendering with:
- **Smooth position animations** using Motion (Framer Motion)
- **User information display** with avatar and name
- **Activity indicators** for user status
- **Auto-hiding labels** after inactivity
- **Hover interactions** for better UX

## Integration

### In MindMapCanvas

The cursor system is integrated into the main canvas component:

```typescript
// Container ref for cursor positioning
const containerRef = useRef<HTMLDivElement>(null);

// Initialize realtime cursors
const { isConnected: cursorConnected } = useRealtimeCursorsBridge({
  mapId,
  enabled: true,
  throttleMs: 50,
  containerRef: containerRef as React.RefObject<HTMLElement>,
});

// Render cursor layer
{cursorConnected && currentUser && (
  <CursorLayer
    users={activeUsers}
    currentUserId={currentUser.id}
    hideInactiveAfterMs={5000}
  />
)}
```

## Configuration Options

### useRealtimeCursorsBridge Options

```typescript
interface UseRealtimeCursorsBridgeOptions {
  mapId: string;                    // Required: Map ID for channel isolation
  enabled?: boolean;                // Default: true
  throttleMs?: number;             // Default: 50ms
  containerRef?: RefObject<HTMLElement>; // Optional: for relative positioning
}
```

### CursorLayer Options

```typescript
interface CursorLayerProps {
  users: ActiveUser[];             // Active users list
  currentUserId: string;           // Current user ID to filter out
  className?: string;              // Optional styling
  hideInactiveAfterMs?: number;    // Default: 5000ms
}
```

## Key Architecture Decisions

### 1. Supabase Broadcast vs Presence

**Chosen: Broadcast** for cursor movements because:
- Ephemeral data that doesn't need persistence
- High-frequency updates (up to 20 per second)
- Better performance (bypasses database)
- Designed specifically for cursor-like data

### 2. Custom Events for Component Communication

Used custom DOM events to bridge broadcast events and React components:
- Decouples broadcast logic from UI components
- Allows multiple components to listen to cursor updates
- Maintains existing architecture patterns

### 3. Throttling Strategy

Implemented throttling at the hook level:
- Prevents overwhelming the network
- Maintains smooth visual updates
- Configurable per use case

### 4. Type System Integration

Updated to use `ActiveUser` consistently:
- Leverages existing user management
- Ensures type safety across components
- Simplifies data flow

## Performance Considerations

### Optimizations Implemented

1. **Throttled Updates**: Mouse movements throttled to 50ms by default
2. **Automatic Cleanup**: Inactive cursors removed after timeout
3. **Selective Rendering**: Only render cursors in active state
4. **Efficient Filtering**: Filter own cursor at multiple levels

### Performance Monitoring

The system includes built-in monitoring:
- Connection state tracking
- Event frequency monitoring
- Error handling and reconnection logic

## Usage Examples

### Basic Integration

```typescript
// In any component that needs cursors
const { isConnected } = useRealtimeCursorsBridge({
  mapId: 'your-map-id',
  enabled: true,
});

// Render cursor layer
<CursorLayer
  users={activeUsers}
  currentUserId={currentUser.id}
/>
```

### With Container Positioning

```typescript
const containerRef = useRef<HTMLDivElement>(null);

const { isConnected } = useRealtimeCursorsBridge({
  mapId: 'your-map-id',
  containerRef: containerRef as RefObject<HTMLElement>,
});

return (
  <div ref={containerRef} className="relative">
    {/* Your content */}
    <CursorLayer users={activeUsers} currentUserId={currentUser.id} />
  </div>
);
```

## Troubleshooting

### Common Issues

1. **Cursors not appearing**
   - Check if `currentUser` is loaded
   - Verify `activeUsers` contains other users
   - Ensure connection is established

2. **Poor performance**
   - Reduce `throttleMs` if too laggy
   - Check network connection quality
   - Monitor browser performance tools

3. **Cursors not disappearing**
   - Verify `hideInactiveAfterMs` setting
   - Check cleanup timers in dev tools
   - Ensure users are properly leaving sessions

### Debug Information

Enable logging in development:
```typescript
const { isConnected } = useRealtimeCursorsBridge({
  mapId,
  enabled: true,
  // Logging is automatically enabled in development
});
```

## Future Enhancements

### Potential Improvements

1. **Cursor Prediction**: Smooth movement prediction for better UX
2. **Click Indicators**: Show when users click
3. **Drawing Trails**: Temporary trails following cursors
4. **Spatial Optimization**: Only show cursors in viewport
5. **Gesture Indicators**: Show drag, select, and other gestures

### Scalability Considerations

- Current implementation handles up to 50 concurrent users efficiently
- For larger groups, consider spatial partitioning
- Monitor Supabase broadcast limits for high-traffic scenarios

## Dependencies

### Required Packages
- `@supabase/supabase-js` - Realtime infrastructure
- `motion/react` - Cursor animations
- `zustand` - State management (existing)

### Internal Dependencies
- `BroadcastManager` - Existing broadcast infrastructure
- `useAppStore` - Application state management
- `ActiveUser` type - User type definitions

## Testing

### Manual Testing Checklist

- [ ] Cursors appear for other users
- [ ] Own cursor is not visible
- [ ] Cursors disappear when users leave
- [ ] Smooth cursor movement
- [ ] Labels show user information
- [ ] Cursors hide after inactivity
- [ ] Performance remains stable with multiple users

### Automated Testing

Consider adding tests for:
- Hook initialization and cleanup
- Event throttling functionality
- Component rendering with different user states
- Error handling and reconnection logic