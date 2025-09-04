# Node Editor Development Guidelines

This file provides critical guidelines for AI assistants working on the node-editor component to prevent architectural issues and code duplication.

## ⚠️ CRITICAL ISSUES TO FIX FIRST

### Current Problems That Need Immediate Attention:

1. **DUPLICATE COMMAND SYSTEMS** - We have TWO command registries:
   - `commands/command-registry.ts` - Complete CommandRegistry class
   - `commands/default-commands.ts` - ANOTHER CommandRegistry class
   - **THESE COMPETE WITH EACH OTHER** causing $task completion to break

2. **MASSIVE TEST DUPLICATION** - Same functionality tested in 6+ files:
   - `__tests__/command-parser.test.ts` (567 lines)
   - `commands/__tests__/command-registry.test.ts`
   - `commands/__tests__/default-commands.test.ts`
   - `__tests__/command-system-integration.test.tsx`
   - `__tests__/quick-input-commands.test.tsx`
   - `__tests__/enhanced-input-commands.test.tsx`
   - `codemirror/__tests__/command-integration.test.ts`

3. **BROKEN FEATURES**:
   - $task command completion doesn't work (due to duplicate registries)
   - Node type switching broken (competing implementations)
   - Syntax Help missing $ commands (no parsingPatterns)

## 🚨 EMERGENCY RULES - READ BEFORE CODING

### Rule #1: NO MORE DUPLICATES
Before creating ANY new file, search for existing implementations:
```bash
# Always search first!
grep -r "CommandRegistry" src/components/node-editor/
grep -r "detectNodeTypeSwitch" src/components/node-editor/
```

### Rule #2: ONE SOURCE OF TRUTH
- Commands: `commands/command-registry.ts` ONLY
- Parsing: `parsers/command-parser.ts` ONLY  
- Types: `types.ts` ONLY
- **Never create competing implementations**

### Rule #3: CONSOLIDATE BEFORE ADDING
If you find duplicate code, FIX IT FIRST before adding features.

## 📁 FILE ORGANIZATION RULES

### Correct Structure:
```
src/components/node-editor/
├── CLAUDE.md                    # This file - READ IT!
├── types.ts                     # All TypeScript types
├── commands/                    # Command system (1 registry only!)
│   ├── command-registry.ts      # THE command registry
│   ├── types.ts                 # Command-specific types
│   └── __tests__/
│       └── command-registry.test.ts
├── parsers/                     # Text parsing logic
│   ├── command-parser.ts        # Command detection
│   ├── index.ts                 # Parser exports
│   └── __tests__/
│       └── command-parser.test.ts
├── codemirror/                  # CodeMirror integrations
│   ├── command-completions.ts   # Autocomplete
│   ├── command-decorations.ts   # Visual decorations
│   └── __tests__/
│       └── codemirror-extensions.test.ts
├── components/                  # UI components
│   ├── input-section.tsx
│   └── parsing-legend.tsx
├── enhanced-input/              # Rich text input
│   └── enhanced-input.tsx
├── __tests__/                   # INTEGRATION tests only
│   └── integration.test.tsx
├── quick-input.tsx              # Main component
└── command-palette.tsx          # Command selection UI
```

### ❌ NEVER CREATE:
- `default-commands.ts` (when registry exists)
- `command-utils.ts` (vague utility files)
- `helpers/` folders (usually code smells)
- Multiple test files for same functionality

## 🧪 TESTING GUIDELINES

### Test Hierarchy (Test once, at the right level):
```
Unit Tests (Pure logic):
├── parsers/__tests__/command-parser.test.ts
├── commands/__tests__/command-registry.test.ts
└── codemirror/__tests__/extensions.test.ts

Integration Tests (Component behavior):
└── __tests__/integration.test.tsx
```

### ❌ DON'T TEST:
- Same command detection in 3+ different files
- Registry operations in multiple test suites
- UI interactions that are already covered

### ✅ DO TEST:
- Each function once, at the appropriate level
- Integration flows end-to-end
- Error cases and edge conditions

## ⚙️ COMMAND SYSTEM RULES

### Single Registry Pattern:
```typescript
// ✅ CORRECT - Use the singleton
import { commandRegistry } from './commands/command-registry';

// ❌ WRONG - Don't create new registries
class MyCommandRegistry { }
```

### Command Definition:
```typescript
// ✅ All commands go in command-registry.ts
private initializeDefaultCommands(): void {
  this.registerCommand({
    id: '$task',
    trigger: '$task',
    nodeType: 'taskNode',
    // ...
  });
}
```

### Node Type Mapping (ONE PLACE):
```typescript
// ✅ In command-registry.ts only
private getNodeTypeFromTrigger(trigger: string): AvailableNodeTypes {
  const mapping: Record<string, AvailableNodeTypes> = {
    '$task': 'taskNode',
    '$note': 'defaultNode',
    // ...
  };
  return mapping[trigger] || 'defaultNode';
}
```

## 🚩 RED FLAGS - STOP IF YOU SEE THESE

1. **Multiple files with similar names**:
   - `command-*.ts` appearing in different folders
   - `*-commands.test.tsx` everywhere

2. **Duplicate imports**:
   ```typescript
   // 🚩 If you see this pattern in multiple files:
   import { detectNodeTypeSwitch } from '../parser';
   import { commandRegistry } from '../registry';
   ```

3. **Component doing too much**:
   ```typescript
   // 🚩 Components shouldn't register commands:
   useEffect(() => {
     commandRegistry.register(/*...*/);
   }, []);
   ```

4. **Test files bigger than implementation**:
   - If test file is >500 lines, probably testing duplicates

5. **"Utils" or "helpers" doing core logic**:
   - Core logic should be in properly named modules

## ✅ BEFORE YOU CODE CHECKLIST

- [ ] Searched for existing implementations of this feature
- [ ] Checked if tests already exist for this behavior
- [ ] Identified the single correct location for new code
- [ ] Verified no circular dependencies will be created
- [ ] Planned to update user documentation (Syntax Help)
- [ ] Confirmed this doesn't duplicate existing functionality
- [ ] Considered consolidating existing code instead of adding new

## 🔧 FIXING CURRENT ISSUES

### Priority Order:
1. **Consolidate Command Systems**: Choose one registry, delete the other
2. **Deduplicate Tests**: Keep ~3 test files instead of 7+
3. **Fix $task Command**: Ensure completions use correct registry
4. **Add Syntax Help**: Include $ commands in parsingPatterns
5. **Test Integration**: Verify end-to-end functionality works

### Command System Fix:
```typescript
// Delete default-commands.ts entirely
// Update command-completions.ts to use:
import { commandRegistry } from '../commands/command-registry';

// Instead of importing from default-commands
```

## 📚 ARCHITECTURAL PRINCIPLES

1. **Separation of Concerns**:
   - Parsing logic ≠ Registry logic ≠ UI logic
   - Each has its own folder and tests

2. **Single Responsibility**:
   - One file, one clear purpose
   - `command-registry.ts` manages commands
   - `command-parser.ts` parses text
   - `quick-input.tsx` handles user input

3. **No Circular Dependencies**:
   ```
   parsers → commands → codemirror → components
   (Never backwards!)
   ```

4. **Test at the Right Level**:
   - Unit tests for pure functions
   - Integration tests for component interactions
   - Don't test implementation details

## 💡 FUTURE DEVELOPMENT TIPS

1. **Before adding a feature**: Check if it already exists partially
2. **Before writing tests**: Check what's already tested
3. **Before creating files**: Consider if existing files could be extended
4. **When stuck**: Look at the working parts of the system first
5. **When refactoring**: Remove code, don't just add to it

## 📈 SUCCESS METRICS

You're doing it right if:
- ✅ $task completion works
- ✅ Syntax Help shows $ commands  
- ✅ Tests run fast (<1s for unit tests)
- ✅ No duplicate implementations
- ✅ Clear file organization
- ✅ Features work end-to-end

You're doing it wrong if:
- ❌ Multiple files doing same thing
- ❌ Tests take forever to run
- ❌ Features partially work
- ❌ Circular dependencies
- ❌ "Utils" files everywhere

---

**Remember: This codebase needs CONSOLIDATION, not more features.**
**Fix the architecture first, then add capabilities.**