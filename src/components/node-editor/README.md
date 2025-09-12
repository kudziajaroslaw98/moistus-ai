# Node Editor Component

## Overview

The Node Editor is a sophisticated input component that combines text-based parsing with visual preview capabilities. It allows users to create and edit mind map nodes using either natural text syntax or structured forms, with real-time parsing of metadata patterns.

**Key Innovation**: Universal metadata parsing and display system that works consistently across all node types, providing users with a predictable and intuitive experience regardless of which node type they're working with.

## Architecture

The Node Editor consists of four main components:
1. **Input Section** - CodeMirror-based editor with syntax highlighting
2. **Preview Section** - Real-time visualization of parsed content
3. **Syntax Legend** - Interactive help showing available patterns
4. **Header Section** - Node type switching and mode toggles

## Requirements & Features

### Input Component (CodeMirror Integration)

The input component provides:
- **Syntax Decoration Highlights** - Background highlighting for metadata fields in the text editor
- **Quick Metadata Entry** - Text-based syntax for rapid node creation without mouse interaction
- **Real-time Pattern Parsing** - Converts text patterns into structured metadata
- **Field Validation** - Immediate feedback on pattern validity
- **Smart Completions** - Context-aware pattern suggestions

#### Example Input Parsing

```text
[ ] lets go
[x] todo 2  
[x]todo 3
@2025-10-10 #asap
[ ] lets go 2
[x] lets go 3
[todo, meeting]
```

**Results in:**
- **Tasks**: 5 tasks ('lets go', 'todo 2' (completed), 'todo 3' (completed), 'lets go 2', 'lets go 3' (completed))
- **Node Metadata**: Date: 2025-10-10, Priority: asap, Tags: [todo, meeting]

> **Important**: Metadata fields are applied to the NODE LEVEL, not individual tasks.

### Preview Component

Real-time visualization showing:
- Rendered todos with completion status
- Metadata badges (priority, assignee, due date, tags)
- Visual formatting preview
- Error states and validation feedback

### Syntax Legend

Dynamic help system displaying:
- Available patterns for current node type
- Interactive examples
- Pattern validation rules
- Keyboard shortcuts

### Header Component

Controls for:
- Node type switching
- Quick input ↔ Structured form mode toggle
- Save/cancel actions
- Advanced options menu

## Universal Metadata System

### The Problem We Solved

**Before**: Users could type `@john #high ^tomorrow` in any node, but only TaskNode would display these metadata fields. This created confusion and the perception of "lost data" when metadata was parsed and stored but not visible.

**After**: All node types consistently parse, store, and display common metadata patterns, creating a unified user experience.

### Supported Universal Patterns

| Pattern | Example | Description | Supported In |
|---------|---------|-------------|--------------|
| `@assignee` | `@john`, `@sarah.wilson` | User assignment | All nodes |
| `#priority` | `#high`, `#medium`, `#low` | Priority levels | All nodes |
| `^date` | `^tomorrow`, `^2024-12-25` | Due dates | All nodes |
| `[tags]` | `[work]`, `[urgent,meeting]` | Tag categorization | All nodes |
| `color:value` | `color:red`, `color:#ff0000` | Color coding | Text nodes |
| `[ ]` / `[x]` | `[ ] task`, `[x] done` | Task checkboxes | Task nodes |

### How Universal Metadata Works

#### 1. Universal Parsing
All input text is processed through a single `parseEmbeddedPatterns()` function that extracts metadata consistently across all node types.

#### 2. Smart Display
Each node type displays metadata contextually:
- **TaskNode**: Full metadata integration with existing task display
- **DefaultNode**: Clean metadata bar below header
- **TextNode**: Subtle indicators that don't interfere with text
- **ResourceNode**: Integrated with URL metadata
- **CodeNode**: Comment-style metadata header

#### 3. Interactive Metadata
Users can:
- Click assignee badges to filter by user
- Click priority to change levels
- Hover for detailed information
- Right-click for context menus

## Migration History & Refactoring

### Major Refactoring (2024)

**Scope**: Reduced complexity from 50+ files to 25 focused files

#### Before Refactoring
- **50+ files** across multiple nested directories
- **3 completion sources** with overlapping functionality  
- **Scattered utilities** across utils/ and domain/utilities/
- **17+ test files** with redundant coverage
- **Complex domain structure** with unclear boundaries

#### After Refactoring  
- **25 focused files** with clear separation of concerns
- **Single completion source** with unified functionality
- **Consolidated utilities** in one location
- **6 comprehensive test files** covering all functionality  
- **Clean domain boundaries** with proper organization

#### Key Structural Changes

##### 1. Parser Consolidation
- **Before**: `domain/parsers/` (6 files)
- **After**: `parsers/` (3 files)
  - `index.ts` - Parser orchestration & registry
  - `common-utilities.ts` - Universal pattern extraction
  - `command-parser.ts` - Command system integration

##### 2. Validation Unification  
- **Before**: `domain/validators/` (4 files)
- **After**: Integrated validation within parsers
  - Real-time validation during parsing
  - Consistent error messaging

##### 3. Utility Consolidation
- **Before**: `utils/` + `domain/utilities/` (5 files)  
- **After**: `parsers/common-utilities.ts` (1 file)
  - All pattern matching utilities
  - Date parsing and formatting
  - Priority and color handling

##### 4. CodeMirror Simplification
- **Before**: `domain/codemirror/` (3 files)
- **After**: `codemirror/` (4 files)
  - `command-completions.ts` - Autocomplete system
  - `command-decorations.ts` - Syntax highlighting
  - Combined decoration handling

##### 5. Completion Unification  
- **Before**: `domain/completion-providers/` (7 files)
- **After**: Single integrated completion system
  - Context-aware suggestions
  - Pattern-based completions

##### 6. Test Consolidation
- **Before**: 17+ test files across 3 directories
- **After**: 6 focused test files
  - `parsers/__tests__/common-utilities.test.ts` - Pattern parsing
  - `parsers/__tests__/task-parser.test.ts` - Task-specific logic  
  - `commands/__tests__/command-registry.test.ts` - Command system
  - `__tests__/integration.test.tsx` - End-to-end flows

### Universal Metadata Implementation (December 2024)

**Why**: Address inconsistent metadata display across node types
**Who**: Requested by users experiencing "lost metadata" confusion  
**When**: December 7, 2024 - Implementation on feature/universal-metadata-display branch

#### What Changed

##### Parser Consolidation Phase
- **Removed duplicate pattern extraction** from `task-parser.ts` and `content-parsers.ts`
- **Centralized all pattern matching** in `common-utilities.parseEmbeddedPatterns()`
- **Unified metadata application** across all parsers
- **Reduced test duplication** from 7+ files to 3 focused suites

##### Universal Display Phase  
- **Created UniversalMetadataBar component** for consistent metadata rendering
- **Integrated metadata bar** into BaseNodeWrapper for all nodes
- **Implemented responsive design** (full badges → compact icons on mobile)
- **Added interactive metadata** (click to filter, edit, reassign)

#### What Was Reimplemented

1. **Metadata Rendering Logic**
   - Replaced per-node custom metadata display
   - Implemented unified MetadataBadge system
   - Added contextual display strategies

2. **Parser Architecture**  
   - Eliminated `extractMetadataFromPatterns` functions
   - Standardized on single pattern extraction flow
   - Simplified parser interfaces

3. **Test Structure**
   - Consolidated pattern testing into single suite
   - Focused integration tests on end-to-end flows
   - Removed redundant unit tests

#### Migration Path

**Phase 1**: Parser Consolidation (Automatic)
- All existing functionality preserved
- No breaking changes to public APIs
- Improved consistency in pattern handling

**Phase 2**: Universal Display (Transparent to Users)
- All nodes automatically show metadata when present
- No user action required
- Enhanced user experience with consistent display

#### Benefits Achieved

**📦 File Reduction**: 50% reduction in file count with cleaner organization
**🚀 Performance**: Single completion source and consolidated utilities  
**🧪 Testing**: Focused test coverage with comprehensive scenarios
**🔧 Maintainability**: Single source of truth for each feature
**🎯 Functionality**: All features preserved and enhanced
**👥 User Experience**: Consistent metadata display across all nodes

## File Structure

```
src/components/node-editor/
├── README.md                    # This comprehensive guide
├── CLAUDE.md                    # AI development guidelines  
├── types.ts                     # TypeScript definitions
├── commands/                    # Command system
│   ├── command-registry.ts      # Command registration and management
│   ├── types.ts                 # Command-specific types
│   └── __tests__/
│       └── command-registry.test.ts
├── parsers/                     # Text parsing logic
│   ├── index.ts                 # Parser exports and registry
│   ├── command-parser.ts        # Node type & slash command parsing
│   ├── common-utilities.ts      # ⭐ Universal pattern extraction
│   ├── task-parser.ts           # Task-specific parsing
│   ├── content-parsers.ts       # Note/text/annotation parsing
│   ├── media-parsers.ts         # Code/image/resource parsing
│   ├── date-parser.ts           # Date parsing utilities
│   └── __tests__/
│       ├── common-utilities.test.ts
│       ├── task-parser.test.ts
│       └── command-parser.test.ts
├── codemirror/                  # CodeMirror integration
│   ├── command-completions.ts   # Autocomplete system
│   ├── command-decorations.ts   # Syntax highlighting
│   └── __tests__/
│       └── codemirror-extensions.test.ts
├── components/                  # UI components  
│   ├── input-section.tsx        # Main input component
│   └── parsing-legend.tsx       # Syntax help display
├── enhanced-input/              # Rich text input
│   └── enhanced-input.tsx       # Enhanced input component
├── __tests__/                   # Integration tests
│   └── integration.test.tsx     # End-to-end testing
├── quick-input.tsx              # Main quick input component
└── command-palette.tsx          # Command selection UI
```

## Usage Examples

### Basic Text Input

```typescript
import { NodeEditor } from '@/components/node-editor';

<NodeEditor
  nodeType="defaultNode"
  initialContent="Research AI tools @sarah #high ^next-week [research][ai]"
  onSave={(data) => console.log(data)}
/>
```

### Task Creation  

```typescript
<NodeEditor
  nodeType="taskNode" 
  initialContent={`
    [ ] Set up development environment @john #high ^tomorrow
    [ ] Write initial tests @sarah #medium  
    [x] Create project structure #low
    
    [development][setup]
  `}
  onSave={handleTaskCreation}
/>
```

### Programmatic Access

```typescript
import { parseInputForNodeType, parseEmbeddedPatterns } from '@/components/node-editor/parsers';

// Parse any text for universal metadata
const patterns = parseEmbeddedPatterns("Fix bug @john #high ^tomorrow");
// Returns: { cleanText: "Fix bug", patterns: [assignee, priority, date] }

// Parse for specific node type
const taskData = parseInputForNodeType('taskNode', '[ ] Fix bug @john #high');
// Returns: { tasks: [...], assignee: 'john', priority: 'high' }
```

## Development Guidelines

### Adding New Metadata Patterns

1. **Define pattern in common-utilities.ts**:
   ```typescript
   // Add to patternMatchers array
   {
     regex: /newpattern:([^\\s]+)/g,
     type: 'newfield' as PatternType,
     extract: (match: RegExpExecArray) => ({ ... })
   }
   ```

2. **Update TypeScript types** in `types.ts` and `src/types/node-data.ts`

3. **Add to UniversalMetadataBar** display logic

4. **Write tests** in `parsers/__tests__/common-utilities.test.ts`

### Testing Philosophy

- **Unit tests** for pure parsing functions
- **Integration tests** for component interactions  
- **End-to-end tests** for complete user workflows
- Test once at the appropriate level, avoid duplication

### Performance Considerations

- Parsing target: <5ms for typical input
- Render target: <10ms for metadata bar
- Memory usage: <1MB additional per 100 nodes
- No layout shift or UI jank

## Troubleshooting

### Common Issues

**Issue**: Metadata not displaying in custom nodes
**Solution**: Ensure node uses BaseNodeWrapper with UniversalMetadataBar integration

**Issue**: Pattern not parsing correctly  
**Solution**: Check regex in common-utilities.ts patternMatchers array

**Issue**: Tests failing after parser changes
**Solution**: Update tests to use consolidated parsing approach

### Debug Utilities

```typescript
import { debugParseText } from '@/components/node-editor/parsers';

// Get detailed parsing information
const debug = debugParseText("@john #high ^tomorrow", 15);
console.log(debug);
// Shows: text, cursor position, detected patterns, validation results
```

## Future Roadmap

### Planned Enhancements

1. **Advanced Metadata Interactions**
   - Bulk metadata operations
   - Metadata templates
   - Smart suggestions based on context

2. **Performance Optimizations**
   - Virtual scrolling for large node sets
   - Lazy loading of metadata components
   - Optimized pattern matching algorithms

3. **Accessibility Improvements**  
   - Enhanced screen reader support
   - Better keyboard navigation
   - High contrast metadata indicators

4. **Integration Features**
   - Search/filter by metadata across entire mind map
   - Metadata-based node grouping
   - Export with metadata preservation

## Contributing

When working on the node-editor:

1. **Follow the consolidation principle** - avoid creating competing implementations
2. **Test at the right level** - unit tests for pure functions, integration tests for workflows
3. **Maintain consistency** - use parseEmbeddedPatterns for all pattern extraction
4. **Document changes** - update this README for architectural changes
5. **Consider universal impact** - changes to parsing affect all node types

## History

| Date | Change | Reason | Impact |
|------|--------|--------|---------|
| 2024-Q3 | Initial refactoring (50→25 files) | Reduce complexity | Improved maintainability |
| 2024-12-07 | Universal metadata implementation | User confusion with inconsistent display | Consistent UX across nodes |
| 2024-12-07 | Parser consolidation | Eliminate duplicate pattern extraction | Single source of truth |

---

*This document serves as the definitive guide to the node-editor component architecture, requirements, and evolution. It should be updated whenever significant changes are made to maintain accuracy and support future development.*