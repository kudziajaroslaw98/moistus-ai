# Realtime Form System

A comprehensive realtime collaborative form system built on top of Supabase Realtime, featuring conflict resolution, field locking, and multiple merge strategies.

## Features

- **Real-time Collaboration**: Multiple users can edit forms simultaneously
- **Conflict Resolution**: Automatic and manual conflict resolution strategies
- **Field Locking**: Prevent editing conflicts by locking fields in use
- **Merge Strategies**: Multiple strategies for handling concurrent edits
- **Optimistic Updates**: Immediate UI feedback with rollback capabilities
- **Presence Tracking**: See who's actively editing the form
- **Debounced Broadcasting**: Efficient network usage with configurable debouncing

## Quick Start

### Basic Usage

```tsx
import { useRealtimeFormEnhanced } from '@/hooks/realtime/use-realtime-form-enhanced';

function MyForm() {
  const {
    formState,
    updateField,
    isConnected,
    activeUsers,
  } = useRealtimeFormEnhanced('my-form-room', {
    title: '',
    description: '',
  });

  return (
    <div>
      <input
        value={formState.fields.title?.value || ''}
        onChange={(e) => updateField('title', e.target.value)}
      />
      <textarea
        value={formState.fields.description?.value || ''}
        onChange={(e) => updateField('description', e.target.value)}
      />
      <p>Connected: {isConnected ? 'Yes' : 'No'}</p>
      <p>Active users: {activeUsers.length}</p>
    </div>
  );
}
```

### Advanced Configuration

```tsx
const {
  formState,
  updateField,
  lockField,
  unlockField,
  isFieldLocked,
  conflicts,
  resolveConflict,
} = useRealtimeFormEnhanced('advanced-form', initialData, {
  mergeStrategy: 'newest-timestamp',
  debounceMs: 500,
  enableFieldLocking: true,
  onConflict: (conflict) => {
    // Custom conflict resolution logic
    return conflict.remoteTimestamp > conflict.localTimestamp ? 'remote' : 'local';
  },
  onFieldLocked: (fieldName, lockedBy) => {
    console.log(`Field ${fieldName} locked by ${lockedBy}`);
  },
  onFieldUnlocked: (fieldName) => {
    console.log(`Field ${fieldName} unlocked`);
  },
});
```

## Configuration Options

### RealtimeFormConfig

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `mergeStrategy` | `MergeStrategy` | `'newest-timestamp'` | Strategy for resolving conflicts |
| `debounceMs` | `number` | `300` | Debounce delay for broadcasts in milliseconds |
| `enableFieldLocking` | `boolean` | `true` | Enable field locking functionality |
| `onConflict` | `function` | `undefined` | Custom conflict resolution handler |
| `onFieldLocked` | `function` | `undefined` | Callback when a field is locked |
| `onFieldUnlocked` | `function` | `undefined` | Callback when a field is unlocked |
| `syncOnMount` | `boolean` | `true` | Sync with other clients on mount |

## Merge Strategies

### 1. Newest Timestamp (`newest-timestamp`)
Uses the timestamp of when the field was last modified to determine which value to keep.

```tsx
// Field modified at 10:30:45 wins over field modified at 10:30:30
```

### 2. Last Writer Wins (`last-writer-wins`)
Uses version numbers to determine precedence. Higher version numbers win.

```tsx
// Version 5 wins over Version 3
```

### 3. Manual Resolution (`manual`)
All conflicts are marked for manual resolution by the user.

```tsx
// User must choose between conflicting values
```

### 4. Field Level (`field-level`)
Applies field-specific logic, falling back to newest timestamp.

```tsx
// Custom logic per field type
```

## Field Locking

Field locking prevents editing conflicts by temporarily locking fields when users are actively editing them.

### Using Field Locking

```tsx
const { lockField, unlockField, isFieldLocked, getFieldLocker } = useRealtimeFormEnhanced(
  'room-name',
  initialData,
  { enableFieldLocking: true }
);

// Lock a field when user starts editing
const handleFieldFocus = (fieldName: string) => {
  lockField(fieldName);
};

// Unlock when done editing
const handleFieldBlur = (fieldName: string) => {
  unlockField(fieldName);
};

// Check if field is locked
const isLocked = isFieldLocked('title');
const lockedBy = getFieldLocker('title');
```

### Field Lock UI Indicators

```tsx
{isFieldLocked('title') && (
  <Badge variant="destructive">
    <Lock className="h-3 w-3 mr-1" />
    Locked by {getUserName(getFieldLocker('title'))}
  </Badge>
)}
```

## Conflict Resolution

### Automatic Resolution

Configure automatic conflict resolution with the `onConflict` callback:

```tsx
const config = {
  onConflict: (conflict: FormConflict) => {
    // Always prefer the newest change
    if (conflict.remoteTimestamp > conflict.localTimestamp) {
      return 'remote';
    }
    return 'local';
  }
};
```

### Manual Resolution

Handle conflicts manually through the UI:

```tsx
const { conflicts, resolveConflict } = useRealtimeFormEnhanced(/* ... */);

return (
  <div>
    {conflicts.map((conflict) => (
      <ConflictResolutionUI
        key={conflict.fieldName}
        conflict={conflict}
        onResolve={(resolution) =>
          resolveConflict(conflict.fieldName, resolution)
        }
      />
    ))}
  </div>
);
```

### Conflict Object Structure

```typescript
interface FormConflict {
  fieldName: string;
  localValue: any;
  remoteValue: any;
  localTimestamp: number;
  remoteTimestamp: number;
  localUser: string;
  remoteUser: string;
}
```

## Form State Structure

```typescript
interface RealtimeFormState {
  user_id: string;
  map_id: string;
  fields: Record<string, RealtimeFormFieldState>;
  activeFields: Record<string, string>; // fieldName -> userId
  metadata: {
    lastSyncedAt: number;
    version: number;
  };
}

interface RealtimeFormFieldState {
  value: any;
  lastModified: number;
  lastModifiedBy: string;
  version: number;
}
```

## Best Practices

### 1. Room Naming
Use descriptive, unique room names:

```tsx
// Good
const roomName = `form:${projectId}:${formId}`;

// Avoid
const roomName = 'form';
```

### 2. Initial Data
Provide complete initial data structure:

```tsx
const initialData = {
  title: '',
  description: '',
  priority: 'medium',
  tags: [],
  // Include all expected fields
};
```

### 3. Field Locking UX
Provide clear visual feedback for locked fields:

```tsx
<Input
  disabled={isFieldLocked('title')}
  className={isFieldLocked('title') ? 'opacity-50 cursor-not-allowed' : ''}
  onFocus={() => lockField('title')}
  onBlur={() => unlockField('title')}
/>
```

### 4. Error Handling
Handle connection issues gracefully:

```tsx
const { isConnected } = useRealtimeFormEnhanced(/* ... */);

if (!isConnected) {
  return <OfflineIndicator />;
}
```

### 5. Performance
Use appropriate debounce values:

```tsx
// For typing-heavy fields
{ debounceMs: 300 }

// For complex fields or slow networks
{ debounceMs: 1000 }
```

## Common Patterns

### Form with Field Locking

```tsx
function CollaborativeForm() {
  const {
    formState,
    updateField,
    lockField,
    unlockField,
    isFieldLocked,
  } = useRealtimeFormEnhanced('form-room', {
    title: '',
    content: '',
  });

  const handleFieldChange = (field: string, value: string) => {
    updateField(field, value);
  };

  return (
    <form>
      <Input
        value={formState.fields.title?.value || ''}
        onChange={(e) => handleFieldChange('title', e.target.value)}
        onFocus={() => lockField('title')}
        onBlur={() => unlockField('title')}
        disabled={isFieldLocked('title')}
      />
      {/* More fields... */}
    </form>
  );
}
```

### Conflict Resolution UI

```tsx
function ConflictResolutionCard({ conflict, onResolve }) {
  return (
    <Card className="border-orange-200">
      <CardHeader>
        <CardTitle>Conflict in "{conflict.fieldName}"</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="font-medium">Your version:</p>
            <p className="bg-blue-50 p-2 rounded">{conflict.localValue}</p>
          </div>
          <div>
            <p className="font-medium">Their version:</p>
            <p className="bg-green-50 p-2 rounded">{conflict.remoteValue}</p>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Button onClick={() => onResolve('local')}>Keep Mine</Button>
          <Button onClick={() => onResolve('remote')}>Accept Theirs</Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

## API Reference

### useRealtimeFormEnhanced

Returns an object with the following properties and methods:

| Property | Type | Description |
|----------|------|-------------|
| `formState` | `RealtimeFormState` | Current form state |
| `updateField` | `(fieldName: string, value: any) => void` | Update a field value |
| `lockField` | `(fieldName: string) => void` | Lock a field for editing |
| `unlockField` | `(fieldName: string) => void` | Unlock a field |
| `isFieldLocked` | `(fieldName: string) => boolean` | Check if field is locked |
| `getFieldLocker` | `(fieldName: string) => string \| null` | Get who locked the field |
| `forceSync` | `() => void` | Force synchronization with remote state |
| `isConnected` | `boolean` | Connection status |
| `activeUsers` | `string[]` | List of active user IDs |
| `conflicts` | `FormConflict[]` | Current unresolved conflicts |
| `resolveConflict` | `(fieldName: string, resolution: 'local' \| 'remote') => void` | Resolve a conflict |

## Troubleshooting

### Common Issues

1. **Fields not syncing**: Check network connection and Supabase configuration
2. **Conflicts not resolving**: Ensure `resolveConflict` is called properly
3. **Performance issues**: Increase `debounceMs` value
4. **Lock not releasing**: Ensure `unlockField` is called in cleanup

### Debug Information

Access debug information through the form state:

```tsx
const { formState } = useRealtimeFormEnhanced(/* ... */);

console.log('Debug info:', {
  lastSynced: formState.metadata.lastSyncedAt,
  version: formState.metadata.version,
  activeFields: formState.activeFields,
});
```

## Examples

See `RealtimeFormExample` component for a complete working example with all features demonstrated.
