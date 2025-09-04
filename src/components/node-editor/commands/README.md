# Enhanced Command Registry System

This enhanced command registry system provides a comprehensive foundation for managing node type switching and command palette functionality in the node editor. It replaces the basic command system with a sophisticated, extensible architecture.

## Overview

The command registry system is designed to handle:
- **Node type switching** with `$nodeType` triggers (e.g., `$task`, `$note`)
- **Slash commands** with `/` triggers (e.g., `/date`, `/priority`)
- **Command search and filtering** with fuzzy matching
- **Category-based organization** for better UI grouping
- **Event system** for registry changes
- **Built-in validation** and error handling

## Architecture

### Core Components

1. **`types.ts`** - Complete TypeScript type definitions
2. **`command-registry.ts`** - Main registry class with singleton pattern
3. **`index.ts`** - Public API and utility functions
4. **`legacy-bridge.ts`** - Integration with existing node-commands system

### Key Features

- **Singleton Pattern**: Global access to command registry
- **Event System**: Listen for registry changes
- **Search & Filtering**: Find commands by query, category, trigger type
- **Validation**: Built-in command validation before registration
- **Extensibility**: Easy to register custom commands

## Usage

### Basic Usage

```typescript
import { commandRegistry } from './commands';

// Search for commands
const taskCommands = commandRegistry.searchCommands({ query: 'task' });

// Execute a command
const context = {
  currentText: '$task Buy milk; Send email',
  cursorPosition: 25
};
const result = await commandRegistry.executeCommand('$task', context);

// Register a custom command
commandRegistry.registerCommand({
  id: 'my-custom-command',
  trigger: '/custom',
  label: 'Custom Command',
  description: 'My custom command',
  icon: MyIcon,
  category: 'pattern',
  triggerType: 'slash',
  action: (context) => ({
    replacement: `Custom: ${context.currentText}`,
    closePanel: true
  })
});
```

### Command Categories

Commands are organized into four categories:

- **`node-type`** - Node type switching commands (`$note`, `$task`, etc.)
- **`pattern`** - Pattern insertion commands (`/date`, `/priority`, etc.)
- **`format`** - Text formatting commands (`bold`, `italic`, etc.)
- **`template`** - Content template commands (`/meeting`, `/checklist`, etc.)

### Command Triggers

Commands support three trigger types:

- **`node-type`** - Triggered by `$nodeType` patterns
- **`slash`** - Triggered by `/command` patterns  
- **`shortcut`** - Triggered by keyboard shortcuts

## Command Interface

Each command must implement the `Command` interface:

```typescript
interface Command {
  id: string;              // Unique identifier
  trigger: string;         // Trigger pattern (e.g., '$task', '/date')
  label: string;           // Display name
  description: string;     // Detailed description
  icon: LucideIcon;        // Visual icon
  category: CommandCategory;  // Organization category
  triggerType: CommandTrigger; // Trigger type
  action: CommandAction;   // Execution function
  keywords?: string[];     // Search keywords
  shortcuts?: string[];    // Keyboard shortcuts
  isPro?: boolean;         // Pro subscription required
  examples?: string[];     // Usage examples
  priority?: number;       // Sort priority (lower = higher)
}
```

## Command Actions

Command actions receive a `CommandContext` and return a `CommandResult`:

```typescript
// Context provided to actions
interface CommandContext {
  currentText: string;        // Current editor text
  cursorPosition: number;     // Current cursor position
  selection?: {               // Selected text (if any)
    from: number;
    to: number;
    text: string;
  };
  nodeType?: AvailableNodeTypes;  // Current node type
  editorView?: EditorView;    // CodeMirror editor instance
  metadata?: Record<string, any>; // Additional data
}

// Result returned by actions
interface CommandResult {
  replacement?: string;       // New text content
  cursorPosition?: number;    // New cursor position
  nodeType?: AvailableNodeTypes; // Switch to node type
  nodeData?: Record<string, any>; // Node data to set
  closePanel?: boolean;       // Close command palette
  message?: string;           // Success/error message
}
```

## Default Commands

The registry comes with pre-registered default commands:

### Node Type Commands
- `$note` - Switch to note node type
- `$task` - Switch to task list node type
- `$code` - Switch to code block node type
- `$image` - Switch to image node type
- `$link` - Switch to resource link node type
- `$question` - Switch to question node type
- `$annotation` - Switch to annotation node type
- `$text` - Switch to text node type

### Pattern Commands
- `/date` - Insert current date
- `/priority` - Insert priority marker
- `/tag` - Insert tag marker
- `/assignee` - Insert assignee marker
- `/color` - Insert color marker

### Format Commands
- `bold` - Make text bold
- `italic` - Make text italic
- `align-left` - Align text left
- `align-center` - Center align text
- `align-right` - Align text right

### Template Commands
- `/meeting` - Insert meeting notes template
- `/checklist` - Insert checklist template

## Search and Filtering

The registry provides powerful search capabilities:

```typescript
// Search by query
const results = commandRegistry.searchCommands({
  query: 'task',
  category: 'node-type',
  triggerType: 'node-type',
  limit: 10,
  includePro: false
});

// Find by specific triggers
const nodeCommands = commandRegistry.getCommandsByTriggerType('node-type');
const slashCommands = commandRegistry.getCommandsByTriggerType('slash');

// Find matching triggers in input
const matches = commandRegistry.findMatchingCommands('$task some content');
```

## Event System

Listen for registry events:

```typescript
commandRegistry.addEventListener('command-registered', (event) => {
  console.log('Command registered:', event.commandId);
});

commandRegistry.addEventListener('command-executed', (event) => {
  console.log('Command executed:', event.commandId);
});
```

## Legacy Integration

The system includes a legacy bridge for backward compatibility:

```typescript
import { registerLegacyCommands } from './commands/legacy-bridge';

// Register existing NodeCommand objects
registerLegacyCommands();

// Execute legacy commands through new system
const result = await executeLegacyCommand('taskNode', context);
```

## Extension Examples

### Custom Node Type Command

```typescript
commandRegistry.registerCommand({
  id: 'diagram-node',
  trigger: '$diagram',
  label: 'Diagram',
  description: 'Create a diagram node',
  icon: Shapes,
  category: 'node-type',
  triggerType: 'node-type',
  keywords: ['diagram', 'flowchart', 'visual'],
  action: (context) => ({
    replacement: '',
    nodeType: 'diagramNode',
    nodeData: { 
      diagramType: 'flowchart',
      elements: []
    },
    closePanel: true
  })
});
```

### Custom Pattern Command

```typescript
commandRegistry.registerCommand({
  id: 'timestamp',
  trigger: '/now',
  label: 'Timestamp',
  description: 'Insert current timestamp',
  icon: Clock,
  category: 'pattern',
  triggerType: 'slash',
  action: (context) => {
    const timestamp = new Date().toISOString();
    const newText = context.currentText.replace('/now', timestamp);
    return {
      replacement: newText,
      cursorPosition: newText.length,
      closePanel: true
    };
  }
});
```

### Custom Formatting Command

```typescript
commandRegistry.registerCommand({
  id: 'highlight',
  trigger: 'highlight',
  label: 'Highlight',
  description: 'Highlight selected text',
  icon: Highlighter,
  category: 'format',
  triggerType: 'shortcut',
  shortcuts: ['Ctrl+H', 'Cmd+H'],
  action: (context) => {
    if (!context.selection) {
      return { message: 'No text selected' };
    }

    const { from, to, text } = context.selection;
    const highlightedText = `===${text}===`;
    const newText = context.currentText.substring(0, from) + 
                    highlightedText + 
                    context.currentText.substring(to);

    return {
      replacement: newText,
      cursorPosition: from + highlightedText.length,
      closePanel: true
    };
  }
});
```

## Integration with UI Components

The registry integrates seamlessly with existing UI components:

### Command Palette Integration

```typescript
// In command palette component
const [query, setQuery] = useState('');
const commands = commandRegistry.searchCommands({ query });

const handleCommandSelect = async (command: Command) => {
  const context = createContextFromEditor();
  const result = await commandRegistry.executeCommand(command.id, context);
  if (result) {
    applyResultToEditor(result);
  }
};
```

### CodeMirror Integration

```typescript
// In CodeMirror completion system
const getCompletions = (input: string) => {
  const matchingCommands = commandRegistry.findMatchingCommands(input);
  return matchingCommands.map(cmd => ({
    label: cmd.label,
    detail: cmd.description,
    info: cmd.examples?.join(', '),
    apply: (view: EditorView) => executeCommand(cmd, view)
  }));
};
```

## Testing

The registry includes comprehensive tests covering:
- Command registration and unregistration
- Search and filtering functionality
- Command execution
- Event system
- Error handling
- Statistics

Run tests with:
```bash
npm test -- --testPathPatterns="command-registry.test.ts"
```

## Performance Considerations

- **Singleton Pattern**: Single registry instance for entire application
- **Efficient Search**: Optimized string matching and filtering
- **Lazy Loading**: Default commands registered on first access
- **Event Cleanup**: Proper event listener management

## Future Extensions

The registry is designed to support:
- **Plugin System**: Dynamic command loading from plugins
- **User Commands**: User-defined custom commands
- **Command History**: Track and replay command usage
- **Async Commands**: Support for async command execution
- **Command Composition**: Combine multiple commands
- **Context-Aware Commands**: Commands that adapt to current context