# 🎯 Comprehensive Implementation Plan: Live Supporting Field Popovers

## 📋 Executive Summary
Implement a hybrid completion system that enhances the node-editor with rich, context-aware popovers for visual patterns (colors, users, dates, statuses, references) while maintaining fast CodeMirror autocomplete for simple patterns.

---

## 🗑️ **PHASE 0: Cleanup Dead Code**

### Task 0.1: Remove Dead Pattern Definitions
**File**: `src/components/node-editor/core/parsers/pattern-extractor.ts`

**DELETE Lines 156-165** (backgroundColor pattern):
```typescript
// Background color pattern: bg:value
{
  regex: /bg:(\S+)/gi,
  type: 'backgroundColor',
  extract: (match) => ({
    value: match[1],
    display: formatColorForDisplay(match[1]),
  }),
  metadataKey: 'backgroundColor',
},
```

**DELETE Lines 200-209** (borderColor pattern):
```typescript
// Border color pattern: border:value
{
  regex: /border:(\S+)/gi,
  type: 'borderColor',
  extract: (match) => ({
    value: match[1],
    display: formatColorForDisplay(match[1]),
  }),
  metadataKey: 'borderColor',
},
```

### Task 0.2: Remove Pattern Type Definitions
**File**: `src/components/node-editor/core/parsers/pattern-extractor.ts`

**MODIFY Line 25** - Remove from PatternType union:
```typescript
// REMOVE: 'backgroundColor'
// REMOVE: 'borderColor'
```

### Task 0.3: Clean Up node-updater.ts
**File**: `src/components/node-editor/node-updater.ts`

**REMOVE Lines ~324-328**:
```typescript
// DELETE:
if (metadata.backgroundColor) {
  parts.push(`bg:${metadata.backgroundColor}`);
}
if (metadata.borderColor) {
  parts.push(`border:${metadata.borderColor}`);
}
```

### Task 0.4: Update TypeScript Types
**File**: `src/types/node-data.ts`

**MODIFY Lines 30-31** - Add deprecation comments:
```typescript
/** @deprecated Use context menu for group styling */
backgroundColor?: string;
/** @deprecated Use context menu for group styling */
borderColor?: string;
```

---

## 🏗️ **PHASE 1: Foundation & Infrastructure**

### Task 1.1: Create Popover Type Definitions
**NEW FILE**: `src/components/node-editor/types/popover-types.ts`

```typescript
import { PatternType } from '../core/parsers/pattern-extractor';
import { FC } from 'react';

/**
 * Base props for all popover components
 */
export interface BasePopoverProps {
  /** Current input value/query */
  value: string;

  /** Callback when user selects an option */
  onSelect: (value: string) => void;

  /** Callback when popover should close */
  onClose: () => void;

  /** Anchor position for popover */
  anchorPosition: { x: number; y: number };

  /** Whether popover is currently open */
  isOpen: boolean;
}

/**
 * Extended props for specific popover types
 */
export interface ColorPickerPopoverProps extends BasePopoverProps {
  /** Show recent colors */
  showRecent?: boolean;

  /** Allow custom hex input */
  allowCustom?: boolean;
}

export interface AssigneeSelectorPopoverProps extends BasePopoverProps {
  /** List of active collaborators */
  activeUsers?: Array<{
    id: string;
    username: string;
    avatar?: string;
    isOnline: boolean;
  }>;
}

export interface DatePickerPopoverProps extends BasePopoverProps {
  /** Minimum selectable date */
  minDate?: Date;

  /** Maximum selectable date */
  maxDate?: Date;

  /** Show smart shortcuts (today, tomorrow, etc) */
  showShortcuts?: boolean;
}

export interface StatusSelectorPopoverProps extends BasePopoverProps {
  /** Available statuses for current project */
  statuses?: Array<{
    value: string;
    label: string;
    color: string;
    icon?: string;
  }>;

  /** Allow creating custom statuses */
  allowCustom?: boolean;
}

export interface ReferenceSearchPopoverProps extends BasePopoverProps {
  /** Current map ID for search context */
  currentMapId: string;

  /** Include cross-map search */
  includeCrossMaps?: boolean;

  /** Recent references */
  recentReferences?: Array<{
    nodeId: string;
    content: string;
    mapTitle?: string;
  }>;
}

export interface LanguageSelectorPopoverProps extends BasePopoverProps {
  /** Show language categories */
  showCategories?: boolean;

  /** Popular languages to show first */
  popularLanguages?: string[];
}

/**
 * Popover configuration for pattern registry
 */
export interface PopoverConfig {
  /** Pattern type this popover handles */
  patternType: PatternType;

  /** Should this pattern use rich popover? */
  useRichPopover: boolean;

  /** Popover component to render */
  component: FC<BasePopoverProps>;

  /** Minimum query length before showing popover */
  minQueryLength?: number;

  /** Debounce delay in ms */
  debounceMs?: number;

  /** Z-index for popover */
  zIndex?: number;
}

/**
 * Active popover state
 */
export interface ActivePopoverState {
  /** Type of pattern being edited */
  type: PatternType | null;

  /** Whether popover is currently open */
  isOpen: boolean;

  /** Current cursor/anchor position */
  anchorPosition: { x: number; y: number };

  /** Current input value */
  currentValue: string;

  /** Start position of pattern in editor */
  patternStart: number;

  /** End position of pattern in editor */
  patternEnd: number;
}
```

### Task 1.2: Extend Quick Input State Slice
**FILE**: `src/store/slices/quick-input-slice.ts`

**ADD** to QuickInputSlice interface (after line 15):
```typescript
// Popover state
activePopover: ActivePopoverState;
setActivePopover: (state: Partial<ActivePopoverState>) => void;
closeActivePopover: () => void;
updatePopoverValue: (value: string) => void;
```

**ADD** to state creator (after line 55):
```typescript
// Popover initial state
activePopover: {
  type: null,
  isOpen: false,
  anchorPosition: { x: 0, y: 0 },
  currentValue: '',
  patternStart: 0,
  patternEnd: 0,
},

// Popover actions
setActivePopover: (state) => {
  set((prev) => ({
    activePopover: {
      ...prev.activePopover,
      ...state,
    },
  }));
},

closeActivePopover: () => {
  set({
    activePopover: {
      type: null,
      isOpen: false,
      anchorPosition: { x: 0, y: 0 },
      currentValue: '',
      patternStart: 0,
      patternEnd: 0,
    },
  });
},

updatePopoverValue: (value) => {
  set((state) => ({
    activePopover: {
      ...state.activePopover,
      currentValue: value,
    },
  }));
},
```

### Task 1.3: Create Pattern Registry
**NEW FILE**: `src/components/node-editor/core/patterns/pattern-registry.ts`

```typescript
import { PatternType } from '../parsers/pattern-extractor';
import { PopoverConfig } from '../../types/popover-types';

/**
 * Centralized pattern configuration registry
 * Determines which patterns get rich popovers vs simple autocomplete
 */
class PatternRegistry {
  private configs: Map<PatternType, PopoverConfig> = new Map();

  /**
   * Register a popover configuration for a pattern
   */
  register(config: PopoverConfig): void {
    this.configs.set(config.patternType, config);
  }

  /**
   * Get popover config for a pattern type
   */
  getConfig(type: PatternType): PopoverConfig | null {
    return this.configs.get(type) || null;
  }

  /**
   * Check if pattern should use rich popover
   */
  shouldUseRichPopover(type: PatternType): boolean {
    const config = this.configs.get(type);
    return config?.useRichPopover ?? false;
  }

  /**
   * Get all registered patterns
   */
  getAllConfigs(): PopoverConfig[] {
    return Array.from(this.configs.values());
  }

  /**
   * Get patterns that use rich popovers
   */
  getRichPopoverPatterns(): PatternType[] {
    return Array.from(this.configs.values())
      .filter((config) => config.useRichPopover)
      .map((config) => config.patternType);
  }
}

// Singleton instance
export const patternRegistry = new PatternRegistry();

// Helper to detect pattern at cursor position
export interface PatternDetectionResult {
  type: PatternType | null;
  value: string;
  start: number;
  end: number;
  shouldShowPopover: boolean;
}

/**
 * Detect pattern at cursor position in text
 */
export function detectPatternAtCursor(
  text: string,
  cursorPos: number
): PatternDetectionResult {
  const beforeCursor = text.slice(Math.max(0, cursorPos - 50), cursorPos);

  // Pattern matchers
  const patterns: Array<{
    regex: RegExp;
    type: PatternType;
    triggerLength: number;
  }> = [
    { regex: /color:(\w*)$/, type: 'color', triggerLength: 6 },
    { regex: /@(\w*)$/, type: 'assignee', triggerLength: 1 },
    { regex: /\^(\w*)$/, type: 'date', triggerLength: 1 },
    { regex: /:(\w*)$/, type: 'status', triggerLength: 1 },
    { regex: /\[\[([^\]]*)$/, type: 'reference', triggerLength: 2 },
    { regex: /lang:(\w*)$/, type: 'language', triggerLength: 5 },
  ];

  for (const pattern of patterns) {
    const match = beforeCursor.match(pattern.regex);
    if (match) {
      const value = match[1] || '';
      const start = cursorPos - match[0].length + pattern.triggerLength;
      const end = cursorPos;
      const shouldShowPopover = patternRegistry.shouldUseRichPopover(pattern.type);

      return {
        type: pattern.type,
        value,
        start,
        end,
        shouldShowPopover,
      };
    }
  }

  return {
    type: null,
    value: '',
    start: 0,
    end: 0,
    shouldShowPopover: false,
  };
}
```

### Task 1.4: Create Shared Completion Data
**NEW FILE**: `src/components/node-editor/core/completions/completion-data.ts`

```typescript
/**
 * Shared completion data used by both CodeMirror and popover systems
 * Single source of truth for suggestions
 */

export interface CompletionDataItem {
  value: string;
  label: string;
  description?: string;
  category?: string;
  icon?: string;
  metadata?: Record<string, any>;
}

// Colors (Tailwind palette)
export const COLOR_COMPLETIONS: CompletionDataItem[] = [
  { value: 'white', label: 'White', description: '#ffffff', metadata: { hex: '#ffffff' } },
  { value: 'black', label: 'Black', description: '#000000', metadata: { hex: '#000000' } },
  { value: 'red-500', label: 'Red', description: '#ef4444', metadata: { hex: '#ef4444' } },
  { value: 'blue-500', label: 'Blue', description: '#3b82f6', metadata: { hex: '#3b82f6' } },
  { value: 'green-500', label: 'Green', description: '#22c55e', metadata: { hex: '#22c55e' } },
  { value: 'yellow-500', label: 'Yellow', description: '#eab308', metadata: { hex: '#eab308' } },
  { value: 'purple-500', label: 'Purple', description: '#a855f7', metadata: { hex: '#a855f7' } },
  { value: 'pink-500', label: 'Pink', description: '#ec4899', metadata: { hex: '#ec4899' } },
  { value: 'orange-500', label: 'Orange', description: '#f97316', metadata: { hex: '#f97316' } },
  { value: 'teal-500', label: 'Teal', description: '#14b8a6', metadata: { hex: '#14b8a6' } },
  // ... more colors from existing completions/index.ts
];

// Dates
export const DATE_COMPLETIONS: CompletionDataItem[] = [
  { value: 'today', label: 'Today', description: 'Current date' },
  { value: 'tomorrow', label: 'Tomorrow', description: 'Next day' },
  { value: 'yesterday', label: 'Yesterday', description: 'Previous day' },
  { value: 'monday', label: 'Monday', description: 'Next Monday' },
  // ... more from existing completions
];

// Priorities
export const PRIORITY_COMPLETIONS: CompletionDataItem[] = [
  { value: 'low', label: 'Low', description: 'Low priority', metadata: { level: 1, color: '#64748b' } },
  { value: 'medium', label: 'Medium', description: 'Medium priority', metadata: { level: 2, color: '#f59e0b' } },
  { value: 'high', label: 'High', description: 'High priority', metadata: { level: 3, color: '#ef4444' } },
  { value: 'critical', label: 'Critical', description: 'Critical priority', metadata: { level: 4, color: '#dc2626' } },
  // ... more from existing completions
];

// Statuses
export const STATUS_COMPLETIONS: CompletionDataItem[] = [
  { value: 'done', label: 'Done', description: 'Completed', metadata: { color: '#22c55e', icon: '✓' } },
  { value: 'in-progress', label: 'In Progress', description: 'Currently working', metadata: { color: '#3b82f6', icon: '⏳' } },
  { value: 'blocked', label: 'Blocked', description: 'Blocked by dependency', metadata: { color: '#ef4444', icon: '🚫' } },
  { value: 'review', label: 'Review', description: 'Pending review', metadata: { color: '#f59e0b', icon: '👀' } },
  { value: 'pending', label: 'Pending', description: 'Not started', metadata: { color: '#6b7280', icon: '⏸' } },
];

// Tags
export const TAG_COMPLETIONS: CompletionDataItem[] = [
  { value: 'bug', label: 'Bug', description: 'Bug report', category: 'issue' },
  { value: 'feature', label: 'Feature', description: 'Feature request', category: 'enhancement' },
  { value: 'urgent', label: 'Urgent', description: 'Urgent item', category: 'priority' },
  { value: 'meeting', label: 'Meeting', description: 'Meeting related', category: 'event' },
  // ... more from existing completions
];

// Assignees
export const ASSIGNEE_COMPLETIONS: CompletionDataItem[] = [
  { value: 'me', label: 'Me', description: 'Assigned to me' },
  { value: 'team', label: 'Team', description: 'Assigned to team' },
  // ... more from existing completions
];

// Programming Languages (for lang: pattern)
export const LANGUAGE_COMPLETIONS: CompletionDataItem[] = [
  { value: 'javascript', label: 'JavaScript', description: 'JS/ES6+', category: 'web', icon: '🟨' },
  { value: 'typescript', label: 'TypeScript', description: 'TS', category: 'web', icon: '🔷' },
  { value: 'python', label: 'Python', description: 'Python 3', category: 'scripting', icon: '🐍' },
  { value: 'java', label: 'Java', description: 'Java', category: 'enterprise', icon: '☕' },
  { value: 'go', label: 'Go', description: 'Golang', category: 'systems', icon: '🐹' },
  { value: 'rust', label: 'Rust', description: 'Rust', category: 'systems', icon: '🦀' },
  { value: 'cpp', label: 'C++', description: 'C++ 17/20', category: 'systems', icon: '⚡' },
  { value: 'csharp', label: 'C#', description: '.NET C#', category: 'enterprise', icon: '💠' },
  { value: 'sql', label: 'SQL', description: 'SQL', category: 'database', icon: '🗄️' },
  { value: 'html', label: 'HTML', description: 'HTML5', category: 'web', icon: '🌐' },
  { value: 'css', label: 'CSS', description: 'CSS3', category: 'web', icon: '🎨' },
  { value: 'json', label: 'JSON', description: 'JSON', category: 'data', icon: '📦' },
  { value: 'yaml', label: 'YAML', description: 'YAML', category: 'config', icon: '⚙️' },
  { value: 'markdown', label: 'Markdown', description: 'Markdown', category: 'docs', icon: '📝' },
  { value: 'bash', label: 'Bash', description: 'Bash/Shell', category: 'scripting', icon: '💻' },
  // Add 50+ more languages...
];

/**
 * Get completions for a pattern type
 */
export function getCompletionsForPattern(
  type: string,
  query: string = ''
): CompletionDataItem[] {
  const normalizedQuery = query.toLowerCase();

  const dataMap: Record<string, CompletionDataItem[]> = {
    color: COLOR_COMPLETIONS,
    date: DATE_COMPLETIONS,
    priority: PRIORITY_COMPLETIONS,
    status: STATUS_COMPLETIONS,
    tag: TAG_COMPLETIONS,
    assignee: ASSIGNEE_COMPLETIONS,
    language: LANGUAGE_COMPLETIONS,
  };

  const items = dataMap[type] || [];

  if (!query) return items.slice(0, 20); // Show first 20 by default

  return items.filter(
    (item) =>
      item.value.toLowerCase().includes(normalizedQuery) ||
      item.label.toLowerCase().includes(normalizedQuery) ||
      item.description?.toLowerCase().includes(normalizedQuery)
  );
}
```

---

## 🎨 **PHASE 2: Popover Components**

### Task 2.1: Refactor FloatingCompletionPanel → BasePopover
**RENAME FILE**:
- FROM: `src/components/node-editor/components/inputs/floating-completion-panel.tsx`
- TO: `src/components/node-editor/components/popovers/base-popover.tsx`

**REFACTOR CONTENT** (extract reusable logic):
```typescript
'use client';

import React from 'react';
import { useFloating, autoUpdate, offset, flip, shift } from '@floating-ui/react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/utils/cn';
import type { BasePopoverProps } from '../../types/popover-types';

/**
 * Base popover component with Floating UI positioning
 * Reusable foundation for all pattern popovers
 */
export const BasePopover: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  anchorPosition: { x: number; y: number };
  children: React.ReactNode;
  className?: string;
}> = ({ isOpen, onClose, anchorPosition, children, className }) => {
  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: onClose,
    middleware: [
      offset(8),
      flip({ padding: 16 }),
      shift({ padding: 16 })
    ],
    whileElementsMounted: autoUpdate,
  });

  // Set virtual element for positioning
  React.useEffect(() => {
    refs.setPositionReference({
      getBoundingClientRect: () => ({
        width: 0,
        height: 0,
        x: anchorPosition.x,
        y: anchorPosition.y,
        top: anchorPosition.y,
        left: anchorPosition.x,
        right: anchorPosition.x,
        bottom: anchorPosition.y,
      }),
    });
  }, [anchorPosition, refs]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={refs.setFloating}
        style={floatingStyles}
        className={cn(
          'z-[200]',
          'bg-zinc-950/95 border border-zinc-800/80 rounded-xl shadow-2xl',
          'backdrop-blur-md ring-1 ring-teal-500/10',
          className
        )}
        initial={{ opacity: 0, scale: 0.95, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -10 }}
        transition={{ duration: 0.15 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

/**
 * Popover footer with keyboard hints
 */
export const PopoverFooter: React.FC<{ hints?: Array<{ key: string; label: string }> }> = ({
  hints = [
    { key: '↑↓', label: 'navigate' },
    { key: '↵', label: 'select' },
    { key: 'esc', label: 'close' },
  ],
}) => (
  <div className="px-4 py-2 text-xs text-zinc-500 border-t border-zinc-800/60 mt-1 bg-gradient-to-r from-zinc-900/40 to-zinc-800/30">
    <div className="flex items-center gap-3">
      {hints.map(({ key, label }) => (
        <span key={key} className="flex gap-1 items-center">
          <kbd className="px-1.5 py-0.5 bg-zinc-800/90 border border-zinc-700/50 rounded text-zinc-400 font-mono text-xs">
            {key}
          </kbd>
          <span className="text-zinc-400">{label}</span>
        </span>
      ))}
    </div>
  </div>
);

/**
 * Popover header
 */
export const PopoverHeader: React.FC<{ title: string; icon?: React.ReactNode }> = ({
  title,
  icon,
}) => (
  <div className="px-4 py-2 text-xs text-zinc-400 font-semibold border-b border-zinc-800/60 mb-1 bg-gradient-to-r from-zinc-900/60 to-zinc-800/40 flex items-center gap-2">
    {icon}
    <span>{title}</span>
  </div>
);
```

### Task 2.2: Create ColorPickerPopover
**NEW FILE**: `src/components/node-editor/components/popovers/color-picker-popover.tsx`

```typescript
'use client';

import React, { useState, useMemo } from 'react';
import { ColorPickerPopoverProps } from '../../types/popover-types';
import { BasePopover, PopoverHeader, PopoverFooter } from './base-popover';
import { getCompletionsForPattern } from '../../core/completions/completion-data';
import { isValidColor, parseColor } from '../../core/utils/color-utils';
import { cn } from '@/utils/cn';
import { Palette } from 'lucide-react';

export const ColorPickerPopover: React.FC<ColorPickerPopoverProps> = ({
  value,
  onSelect,
  onClose,
  anchorPosition,
  isOpen,
  showRecent = true,
  allowCustom = true,
}) => {
  const [hexInput, setHexInput] = useState(value);
  const [activeIndex, setActiveIndex] = useState(0);

  // Get color suggestions
  const colors = useMemo(() => {
    return getCompletionsForPattern('color', value).slice(0, 40);
  }, [value]);

  // Validate hex input
  const isValidHex = isValidColor(hexInput);

  // Handle selection
  const handleSelect = (colorValue: string) => {
    onSelect(colorValue);
    onClose();
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 8, colors.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 8, 0));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, colors.length - 1));
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isValidHex && allowCustom) {
        handleSelect(hexInput);
      } else if (colors[activeIndex]) {
        handleSelect(colors[activeIndex].value);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <BasePopover
      isOpen={isOpen}
      onClose={onClose}
      anchorPosition={anchorPosition}
      className="min-w-[320px] max-w-[380px]"
    >
      <PopoverHeader title="Color Picker" icon={<Palette className="w-3 h-3" />} />

      <div className="p-4" onKeyDown={handleKeyDown}>
        {/* Hex Input */}
        {allowCustom && (
          <div className="mb-3">
            <input
              type="text"
              value={hexInput}
              onChange={(e) => setHexInput(e.target.value)}
              placeholder="#000000 or red-500"
              className={cn(
                'w-full px-3 py-2 text-sm rounded-md',
                'bg-zinc-900 border',
                isValidHex ? 'border-teal-500/50' : 'border-zinc-700',
                'focus:outline-none focus:ring-2 focus:ring-teal-500/30'
              )}
              autoFocus
            />
          </div>
        )}

        {/* Color Grid */}
        <div className="grid grid-cols-8 gap-2">
          {colors.map((color, index) => (
            <button
              key={color.value}
              onClick={() => handleSelect(color.value)}
              className={cn(
                'w-8 h-8 rounded border-2 transition-all',
                'hover:scale-110 hover:z-10',
                'focus:outline-none focus:ring-2 focus:ring-teal-500',
                activeIndex === index
                  ? 'border-teal-500 ring-2 ring-teal-500/30 scale-110'
                  : 'border-zinc-600'
              )}
              style={{ backgroundColor: color.metadata?.hex || color.value }}
              title={`${color.label} (${color.description})`}
            />
          ))}
        </div>

        {/* Recent Colors */}
        {showRecent && (
          <div className="mt-3 pt-3 border-t border-zinc-800">
            <div className="text-xs text-zinc-400 mb-2">Recent</div>
            <div className="flex gap-2">
              {/* TODO: Implement recent colors from localStorage */}
              <div className="text-xs text-zinc-500">No recent colors</div>
            </div>
          </div>
        )}
      </div>

      <PopoverFooter
        hints={[
          { key: '↑↓←→', label: 'navigate' },
          { key: '↵', label: 'select' },
          { key: 'esc', label: 'close' },
        ]}
      />
    </BasePopover>
  );
};
```

### Task 2.3: Create DatePickerPopover
**NEW FILE**: `src/components/node-editor/components/popovers/date-picker-popover.tsx`

```typescript
'use client';

import React, { useState } from 'react';
import { DatePickerPopoverProps } from '../../types/popover-types';
import { BasePopover, PopoverHeader, PopoverFooter } from './base-popover';
import { getCompletionsForPattern } from '../../core/completions/completion-data';
import { parseDateString } from '../../core/utils/date-utils';
import { cn } from '@/utils/cn';
import { Calendar } from 'lucide-react';

export const DatePickerPopover: React.FC<DatePickerPopoverProps> = ({
  value,
  onSelect,
  onClose,
  anchorPosition,
  isOpen,
  showShortcuts = true,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);

  // Get date suggestions
  const shortcuts = getCompletionsForPattern('date', value);

  // Handle selection
  const handleSelect = (dateValue: string) => {
    onSelect(dateValue);
    onClose();
  };

  return (
    <BasePopover
      isOpen={isOpen}
      onClose={onClose}
      anchorPosition={anchorPosition}
      className="min-w-[280px] max-w-[320px]"
    >
      <PopoverHeader title="Date Shortcuts" icon={<Calendar className="w-3 h-3" />} />

      <div className="p-2">
        {/* Date Shortcuts */}
        <div role="listbox">
          {shortcuts.map((shortcut, index) => (
            <button
              key={shortcut.value}
              onClick={() => handleSelect(shortcut.value)}
              className={cn(
                'w-full text-left px-3 py-2 rounded-md text-sm',
                'transition-colors flex items-center justify-between',
                'hover:bg-zinc-800/60',
                activeIndex === index && 'bg-teal-900/25 text-zinc-100 ring-1 ring-teal-500/40'
              )}
            >
              <span>{shortcut.label}</span>
              <span className="text-xs text-zinc-500">{shortcut.description}</span>
            </button>
          ))}
        </div>

        {/* TODO: Add calendar widget for date selection */}
        <div className="mt-2 pt-2 border-t border-zinc-800">
          <button
            className="w-full text-xs text-zinc-400 hover:text-zinc-300 py-2"
            onClick={() => {
              // TODO: Open full calendar UI
            }}
          >
            Open calendar...
          </button>
        </div>
      </div>

      <PopoverFooter />
    </BasePopover>
  );
};
```

### Task 2.4: Create AssigneeSelectorPopover
**NEW FILE**: `src/components/node-editor/components/popovers/assignee-selector-popover.tsx`

```typescript
'use client';

import React, { useState } from 'react';
import useAppStore from '@/store/mind-map-store';
import { useShallow } from 'zustand/react/shallow';
import { AssigneeSelectorPopoverProps } from '../../types/popover-types';
import { BasePopover, PopoverHeader, PopoverFooter } from './base-popover';
import { getCompletionsForPattern } from '../../core/completions/completion-data';
import { cn } from '@/utils/cn';
import { User, Users } from 'lucide-react';

export const AssigneeSelectorPopover: React.FC<AssigneeSelectorPopoverProps> = ({
  value,
  onSelect,
  onClose,
  anchorPosition,
  isOpen,
  activeUsers,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);

  // Get active users from realtime slice
  const { realtimeActiveUsers } = useAppStore(
    useShallow((state) => ({
      realtimeActiveUsers: state.enhancedFormState?.activeUsers || [],
    }))
  );

  // Merge active users with provided users
  const allActiveUsers = activeUsers || realtimeActiveUsers;

  // Get assignee suggestions
  const suggestions = getCompletionsForPattern('assignee', value);

  const handleSelect = (assigneeValue: string) => {
    onSelect(assigneeValue);
    onClose();
  };

  return (
    <BasePopover
      isOpen={isOpen}
      onClose={onClose}
      anchorPosition={anchorPosition}
      className="min-w-[260px] max-w-[300px]"
    >
      <PopoverHeader title="Assign To" icon={<User className="w-3 h-3" />} />

      <div className="p-2">
        {/* Active Collaborators */}
        {allActiveUsers.length > 0 && (
          <div className="mb-2">
            <div className="text-xs text-zinc-400 px-2 py-1 flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span>Active Now</span>
            </div>
            {allActiveUsers.map((user, index) => (
              <button
                key={user.id}
                onClick={() => handleSelect(user.username)}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-md text-sm',
                  'transition-colors flex items-center gap-2',
                  'hover:bg-zinc-800/60',
                  activeIndex === index && 'bg-teal-900/25 ring-1 ring-teal-500/40'
                )}
              >
                {/* Avatar */}
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.username}
                    className="w-6 h-6 rounded-full"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-xs">
                    {user.username[0].toUpperCase()}
                  </div>
                )}
                <span>{user.username}</span>
                {user.isOnline && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-green-500" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Suggestions */}
        <div className="border-t border-zinc-800 pt-2">
          <div className="text-xs text-zinc-400 px-2 py-1">Suggestions</div>
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.value}
              onClick={() => handleSelect(suggestion.value)}
              className={cn(
                'w-full text-left px-3 py-2 rounded-md text-sm',
                'transition-colors hover:bg-zinc-800/60'
              )}
            >
              @{suggestion.value}
            </button>
          ))}
        </div>
      </div>

      <PopoverFooter />
    </BasePopover>
  );
};
```

### Task 2.5: Create StatusSelectorPopover
**NEW FILE**: `src/components/node-editor/components/popovers/status-selector-popover.tsx`

```typescript
'use client';

import React, { useState } from 'react';
import { StatusSelectorPopoverProps } from '../../types/popover-types';
import { BasePopover, PopoverHeader, PopoverFooter } from './base-popover';
import { getCompletionsForPattern } from '../../core/completions/completion-data';
import { cn } from '@/utils/cn';
import { Activity } from 'lucide-react';

export const StatusSelectorPopover: React.FC<StatusSelectorPopoverProps> = ({
  value,
  onSelect,
  onClose,
  anchorPosition,
  isOpen,
  statuses,
  allowCustom = false,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);

  // Get status suggestions
  const defaultStatuses = getCompletionsForPattern('status', value);
  const allStatuses = statuses || defaultStatuses.map((s) => ({
    value: s.value,
    label: s.label,
    color: s.metadata?.color || '#6b7280',
    icon: s.metadata?.icon,
  }));

  const handleSelect = (statusValue: string) => {
    onSelect(statusValue);
    onClose();
  };

  return (
    <BasePopover
      isOpen={isOpen}
      onClose={onClose}
      anchorPosition={anchorPosition}
      className="min-w-[240px] max-w-[280px]"
    >
      <PopoverHeader title="Set Status" icon={<Activity className="w-3 h-3" />} />

      <div className="p-2">
        {allStatuses.map((status, index) => (
          <button
            key={status.value}
            onClick={() => handleSelect(status.value)}
            className={cn(
              'w-full text-left px-3 py-2 rounded-md text-sm',
              'transition-colors flex items-center gap-2',
              'hover:bg-zinc-800/60',
              activeIndex === index && 'bg-teal-900/25 ring-1 ring-teal-500/40'
            )}
          >
            {/* Status Indicator */}
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: status.color }}
            />
            {status.icon && <span>{status.icon}</span>}
            <span>{status.label}</span>
            <span className="ml-auto text-xs text-zinc-500">:{status.value}</span>
          </button>
        ))}

        {/* Custom Status Option */}
        {allowCustom && (
          <div className="mt-2 pt-2 border-t border-zinc-800">
            <button
              className="w-full text-xs text-zinc-400 hover:text-zinc-300 py-2"
              onClick={() => {
                // TODO: Open custom status creator
              }}
            >
              Create custom status...
            </button>
          </div>
        )}
      </div>

      <PopoverFooter />
    </BasePopover>
  );
};
```

### Task 2.6: Create ReferenceSearchPopover
**NEW FILE**: `src/components/node-editor/components/popovers/reference-search-popover.tsx`

```typescript
'use client';

import React, { useState, useEffect } from 'react';
import { ReferenceSearchPopoverProps } from '../../types/popover-types';
import { BasePopover, PopoverHeader, PopoverFooter } from './base-popover';
import { cn } from '@/utils/cn';
import { Link2, ExternalLink } from 'lucide-react';

export const ReferenceSearchPopover: React.FC<ReferenceSearchPopoverProps> = ({
  value,
  onSelect,
  onClose,
  anchorPosition,
  isOpen,
  currentMapId,
  includeCrossMaps = false,
  recentReferences = [],
}) => {
  const [searchQuery, setSearchQuery] = useState(value);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  // Debounced search
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        // TODO: Call API to search nodes
        const response = await fetch(
          `/api/search-nodes?q=${encodeURIComponent(searchQuery)}&mapId=${currentMapId}${includeCrossMaps ? '&crossMaps=true' : ''}`
        );
        const data = await response.json();
        setSearchResults(data.nodes || []);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, currentMapId, includeCrossMaps]);

  const handleSelect = (nodeId: string) => {
    onSelect(`[[${nodeId}]]`);
    onClose();
  };

  return (
    <BasePopover
      isOpen={isOpen}
      onClose={onClose}
      anchorPosition={anchorPosition}
      className="min-w-[360px] max-w-[480px]"
    >
      <PopoverHeader title="Link to Node" icon={<Link2 className="w-3 h-3" />} />

      <div className="p-3">
        {/* Search Input */}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search nodes..."
          className="w-full px-3 py-2 text-sm rounded-md bg-zinc-900 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
          autoFocus
        />

        {/* Search Results */}
        <div className="mt-2 max-h-[300px] overflow-y-auto">
          {isSearching && (
            <div className="text-center py-4 text-xs text-zinc-500">Searching...</div>
          )}

          {!isSearching && searchResults.length === 0 && searchQuery.length >= 2 && (
            <div className="text-center py-4 text-xs text-zinc-500">No nodes found</div>
          )}

          {!isSearching && searchResults.length > 0 && (
            <div role="listbox">
              {searchResults.map((node, index) => (
                <button
                  key={node.id}
                  onClick={() => handleSelect(node.id)}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-md text-sm',
                    'transition-colors',
                    'hover:bg-zinc-800/60',
                    activeIndex === index && 'bg-teal-900/25 ring-1 ring-teal-500/40'
                  )}
                >
                  <div className="font-medium">{node.content}</div>
                  {node.mapTitle && node.mapTitle !== 'Current Map' && (
                    <div className="text-xs text-zinc-500 flex items-center gap-1 mt-1">
                      <ExternalLink className="w-3 h-3" />
                      {node.mapTitle}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Recent References */}
          {searchQuery.length < 2 && recentReferences.length > 0 && (
            <div>
              <div className="text-xs text-zinc-400 px-2 py-1 mt-2">Recent</div>
              {recentReferences.map((ref) => (
                <button
                  key={ref.nodeId}
                  onClick={() => handleSelect(ref.nodeId)}
                  className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-zinc-800/60"
                >
                  <div className="font-medium">{ref.content}</div>
                  {ref.mapTitle && (
                    <div className="text-xs text-zinc-500">{ref.mapTitle}</div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <PopoverFooter
        hints={[
          { key: '↑↓', label: 'navigate' },
          { key: '↵', label: 'link' },
          { key: 'esc', label: 'close' },
        ]}
      />
    </BasePopover>
  );
};
```

### Task 2.7: Create LanguageSelectorPopover
**NEW FILE**: `src/components/node-editor/components/popovers/language-selector-popover.tsx`

```typescript
'use client';

import React, { useState, useMemo } from 'react';
import { LanguageSelectorPopoverProps } from '../../types/popover-types';
import { BasePopover, PopoverHeader, PopoverFooter } from './base-popover';
import { getCompletionsForPattern } from '../../core/completions/completion-data';
import { cn } from '@/utils/cn';
import { Code } from 'lucide-react';

export const LanguageSelectorPopover: React.FC<LanguageSelectorPopoverProps> = ({
  value,
  onSelect,
  onClose,
  anchorPosition,
  isOpen,
  showCategories = true,
  popularLanguages = ['javascript', 'typescript', 'python', 'java', 'go'],
}) => {
  const [activeIndex, setActiveIndex] = useState(0);

  // Get language suggestions
  const allLanguages = getCompletionsForPattern('language', value);

  // Group by category if enabled
  const groupedLanguages = useMemo(() => {
    if (!showCategories) return { all: allLanguages };

    const groups: Record<string, any[]> = {};
    allLanguages.forEach((lang) => {
      const category = lang.category || 'other';
      if (!groups[category]) groups[category] = [];
      groups[category].push(lang);
    });
    return groups;
  }, [allLanguages, showCategories]);

  const handleSelect = (langValue: string) => {
    onSelect(langValue);
    onClose();
  };

  return (
    <BasePopover
      isOpen={isOpen}
      onClose={onClose}
      anchorPosition={anchorPosition}
      className="min-w-[280px] max-w-[360px]"
    >
      <PopoverHeader title="Programming Language" icon={<Code className="w-3 h-3" />} />

      <div className="p-2 max-h-[400px] overflow-y-auto">
        {/* Popular Languages */}
        <div className="mb-2">
          <div className="text-xs text-zinc-400 px-2 py-1">Popular</div>
          <div className="grid grid-cols-2 gap-1">
            {popularLanguages.map((langValue) => {
              const lang = allLanguages.find((l) => l.value === langValue);
              if (!lang) return null;
              return (
                <button
                  key={lang.value}
                  onClick={() => handleSelect(lang.value)}
                  className="text-left px-3 py-2 rounded-md text-sm hover:bg-zinc-800/60 flex items-center gap-2"
                >
                  <span>{lang.icon}</span>
                  <span>{lang.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Categorized Languages */}
        {showCategories &&
          Object.entries(groupedLanguages).map(([category, langs]) => (
            <div key={category} className="mb-2">
              <div className="text-xs text-zinc-400 px-2 py-1 capitalize">
                {category}
              </div>
              {langs.map((lang) => (
                <button
                  key={lang.value}
                  onClick={() => handleSelect(lang.value)}
                  className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-zinc-800/60 flex items-center gap-2"
                >
                  <span>{lang.icon}</span>
                  <span>{lang.label}</span>
                  <span className="ml-auto text-xs text-zinc-500">{lang.description}</span>
                </button>
              ))}
            </div>
          ))}
      </div>

      <PopoverFooter />
    </BasePopover>
  );
};
```

### Task 2.8: Create PopoverRenderer (Orchestrator)
**NEW FILE**: `src/components/node-editor/components/popovers/popover-renderer.tsx`

```typescript
'use client';

import React from 'react';
import { PatternType } from '../../core/parsers/pattern-extractor';
import { ColorPickerPopover } from './color-picker-popover';
import { DatePickerPopover } from './date-picker-popover';
import { AssigneeSelectorPopover } from './assignee-selector-popover';
import { StatusSelectorPopover } from './status-selector-popover';
import { ReferenceSearchPopover } from './reference-search-popover';
import { LanguageSelectorPopover } from './language-selector-popover';
import type { BasePopoverProps } from '../../types/popover-types';

/**
 * Popover renderer - selects and renders the appropriate popover component
 */
export const PopoverRenderer: React.FC<
  BasePopoverProps & {
    type: PatternType | null;
    currentMapId?: string;
  }
> = ({ type, currentMapId, ...props }) => {
  if (!type || !props.isOpen) return null;

  switch (type) {
    case 'color':
      return <ColorPickerPopover {...props} />;

    case 'date':
      return <DatePickerPopover {...props} />;

    case 'assignee':
      return <AssigneeSelectorPopover {...props} />;

    case 'status':
      return <StatusSelectorPopover {...props} />;

    case 'reference':
      return <ReferenceSearchPopover {...props} currentMapId={currentMapId || ''} />;

    case 'language':
      return <LanguageSelectorPopover {...props} />;

    default:
      return null;
  }
};
```

---

## 🔌 **PHASE 3: Integration with EnhancedInput**

### Task 3.1: Modify EnhancedInput Component
**FILE**: `src/components/node-editor/components/inputs/enhanced-input.tsx`

**ADD** imports (after line 20):
```typescript
import { PopoverRenderer } from '../popovers/popover-renderer';
import { detectPatternAtCursor } from '../../core/patterns/pattern-registry';
```

**ADD** to component body (after line 90):
```typescript
// Get active popover state from store
const { activePopover, setActivePopover, closeActivePopover } = useAppStore(
  useShallow((state) => ({
    activePopover: state.activePopover,
    setActivePopover: state.setActivePopover,
    closeActivePopover: state.closeActivePopover,
  }))
);

// Get current map ID for reference search
const { currentMapId } = useAppStore(
  useShallow((state) => ({
    currentMapId: state.currentMap?.id || '',
  }))
);
```

**MODIFY** CodeMirror setup (in useEffect around line 227):
**ADD** after line 273 (onNodeTypeChange callback):
```typescript
// Pattern detection for popovers
onPatternDetected: (pattern) => {
  // Called by CodeMirror when cursor moves or text changes
  if (pattern.shouldShowPopover && pattern.type) {
    const view = editorViewRef.current;
    if (!view) return;

    // Get cursor coordinates for popover positioning
    const cursorPos = view.state.selection.main.head;
    const coords = view.coordsAtPos(cursorPos);

    if (coords) {
      setActivePopover({
        type: pattern.type,
        isOpen: true,
        anchorPosition: {
          x: coords.left,
          y: coords.bottom + 4,
        },
        currentValue: pattern.value,
        patternStart: pattern.start,
        patternEnd: pattern.end,
      });
    }
  } else {
    // Close popover if no pattern detected
    if (activePopover.isOpen) {
      closeActivePopover();
    }
  }
},
```

**ADD** popover selection handler (after existing handlers):
```typescript
// Handle popover selection
const handlePopoverSelect = useCallback(
  (selectedValue: string) => {
    const view = editorViewRef.current;
    if (!view || !activePopover.isOpen) return;

    // Replace pattern in editor
    view.dispatch({
      changes: {
        from: activePopover.patternStart,
        to: activePopover.patternEnd,
        insert: selectedValue,
      },
      selection: {
        anchor: activePopover.patternStart + selectedValue.length,
      },
    });

    // Close popover
    closeActivePopover();

    // Focus editor
    view.focus();
  },
  [activePopover, closeActivePopover]
);
```

**MODIFY** return statement (after line 447):
```typescript
return (
  <>
    <motion.div
      ref={containerRef}
      data-testid='enhanced-input-container'
      className={cn(
        'enhanced-input-container flex-1 relative',
        hasErrors && 'has-validation-errors',
        hasWarnings && 'has-validation-warnings',
        hasSuggestions && 'has-validation-suggestions',
        'z-[100]',
        className
      )}
      initial={initial}
      animate={animate}
      transition={transition}
      {...rest}
    >
      <ValidationTooltip
        errors={validationErrors}
        isOpen={validationTooltipOpen}
        onOpenChange={setValidationTooltipOpen}
        onQuickFix={handleQuickFix}
      >
        <div
          className='enhanced-input-wrapper'
          style={{
            isolation: 'isolate',
            contain: 'layout',
          }}
        >
          <div
            ref={editorRef}
            className={cn(
              'w-full rounded-md',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
            style={{
              minHeight: '60px',
              willChange: 'auto',
            }}
          />
        </div>
      </ValidationTooltip>
    </motion.div>

    {/* NEW: Popover Renderer */}
    <PopoverRenderer
      type={activePopover.type}
      value={activePopover.currentValue}
      onSelect={handlePopoverSelect}
      onClose={closeActivePopover}
      anchorPosition={activePopover.anchorPosition}
      isOpen={activePopover.isOpen}
      currentMapId={currentMapId}
    />
  </>
);
```

### Task 3.2: Update CodeMirror Setup
**FILE**: `src/components/node-editor/integrations/codemirror/setup.ts`

**MODIFY** NodeEditorConfig interface (after line 28):
```typescript
export interface NodeEditorConfig {
  initialContent?: string;
  placeholder?: string;
  enableCompletions?: boolean;
  enablePatternHighlighting?: boolean;
  enableValidation?: boolean;
  onContentChange?: (content: string) => void;
  onNodeTypeChange?: (nodeType: string) => void;
  onPatternDetected?: (pattern: PatternDetectionResult) => void; // NEW
}
```

**ADD** import (after line 16):
```typescript
import { detectPatternAtCursor, type PatternDetectionResult } from '../../core/patterns/pattern-registry';
```

**ADD** pattern detection extension (after line 94, before return):
```typescript
// Pattern detection for rich popovers
...(onPatternDetected
  ? [
      EditorView.updateListener.of((update) => {
        if (update.selectionSet || update.docChanged) {
          const cursorPos = update.state.selection.main.head;
          const text = update.state.doc.toString();
          const pattern = detectPatternAtCursor(text, cursorPos);
          onPatternDetected(pattern);
        }
      }),
    ]
  : []),
```

### Task 3.3: Register Popovers in Pattern Registry
**NEW FILE**: `src/components/node-editor/core/patterns/register-popovers.ts`

```typescript
import { patternRegistry } from './pattern-registry';
import { ColorPickerPopover } from '../../components/popovers/color-picker-popover';
import { DatePickerPopover } from '../../components/popovers/date-picker-popover';
import { AssigneeSelectorPopover } from '../../components/popovers/assignee-selector-popover';
import { StatusSelectorPopover } from '../../components/popovers/status-selector-popover';
import { ReferenceSearchPopover } from '../../components/popovers/reference-search-popover';
import { LanguageSelectorPopover } from '../../components/popovers/language-selector-popover';

/**
 * Register all popover configurations
 * Call this once during app initialization
 */
export function registerPopovers() {
  // Color picker
  patternRegistry.register({
    patternType: 'color',
    useRichPopover: true,
    component: ColorPickerPopover,
    minQueryLength: 0,
    debounceMs: 150,
    zIndex: 200,
  });

  // Date picker
  patternRegistry.register({
    patternType: 'date',
    useRichPopover: true,
    component: DatePickerPopover,
    minQueryLength: 0,
    debounceMs: 100,
    zIndex: 200,
  });

  // Assignee selector
  patternRegistry.register({
    patternType: 'assignee',
    useRichPopover: true,
    component: AssigneeSelectorPopover,
    minQueryLength: 0,
    debounceMs: 150,
    zIndex: 200,
  });

  // Status selector
  patternRegistry.register({
    patternType: 'status',
    useRichPopover: true,
    component: StatusSelectorPopover,
    minQueryLength: 0,
    debounceMs: 100,
    zIndex: 200,
  });

  // Reference search
  patternRegistry.register({
    patternType: 'reference',
    useRichPopover: true,
    component: ReferenceSearchPopover,
    minQueryLength: 2,
    debounceMs: 300,
    zIndex: 200,
  });

  // Language selector
  patternRegistry.register({
    patternType: 'language',
    useRichPopover: true,
    component: LanguageSelectorPopover,
    minQueryLength: 0,
    debounceMs: 150,
    zIndex: 200,
  });
}
```

### Task 3.4: Initialize Popovers in NodeEditor
**FILE**: `src/components/node-editor/node-editor.tsx`

**ADD** import (after line 20):
```typescript
import { registerPopovers } from './core/patterns/register-popovers';
```

**ADD** initialization (after line 64, inside component):
```typescript
// Register popovers on mount
useEffect(() => {
  registerPopovers();
}, []);
```

---

## ✅ **PHASE 4: Testing & Verification**

### Task 4.1: Manual Testing Checklist

**Test Each Popover**:
- [ ] Type `color:` → Color picker appears with color swatches
- [ ] Type `@` → Assignee selector appears with active users
- [ ] Type `^` → Date picker appears with shortcuts
- [ ] Type `:` → Status selector appears with visual statuses
- [ ] Type `[[` → Reference search appears with node search
- [ ] Type `lang:` → Language selector appears with categories

**Test Interactions**:
- [ ] Arrow keys navigate options
- [ ] Enter key selects highlighted option
- [ ] ESC key closes popover
- [ ] Clicking outside closes popover
- [ ] Selected value replaces pattern in editor
- [ ] Cursor moves to end of inserted value

**Test Edge Cases**:
- [ ] Multiple rapid popover triggers (debouncing)
- [ ] Popover positioning at screen edges (flip/shift)
- [ ] Popover with very long content (scrolling)
- [ ] Switching between patterns quickly
- [ ] Closing editor while popover is open

### Task 4.2: Integration Testing

**Test with Real Node Creation**:
- [ ] Create Note node with `color:red-500` pattern
- [ ] Verify color is parsed and displayed correctly
- [ ] Create Task node with `@john ^tomorrow` patterns
- [ ] Verify assignee and date are extracted
- [ ] Create node with `[[reference]]` pattern
- [ ] Verify reference link works

---

## 📝 **PHASE 5: Documentation**

### Task 5.1: Update CLAUDE.md
**FILE**: `D:\_GITHUB\moistus-ai\CLAUDE.md`

**ADD** section after line 75 (Node System):
```markdown
### Pattern Popovers

Rich UI popovers enhance pattern input:
- `color:` → Visual color picker with swatches
- `@assignee` → User selector with active collaborators
- `^date` → Calendar picker with smart shortcuts
- `:status` → Visual status workflow selector
- `[[reference]]` → Full-text node search modal
- `lang:` → Language selector with categories

**Architecture**: Hybrid system uses CodeMirror autocomplete for simple patterns (tags, priority) and rich popovers for visual patterns. Pattern registry in `src/components/node-editor/core/patterns/` orchestrates which UI to show.
```

### Task 5.2: Create Implementation Summary
**NEW FILE**: `src/components/node-editor/POPOVER_IMPLEMENTATION.md`

```markdown
# Popover System Implementation

## Overview
Rich popover UI components for visual pattern input in the node editor.

## Components

### Base Components
- `base-popover.tsx` - Reusable popover foundation with Floating UI
- `popover-renderer.tsx` - Orchestrator that selects appropriate popover

### Popover Components
1. **ColorPickerPopover** - Grid of color swatches + hex input
2. **DatePickerPopover** - Smart date shortcuts + calendar
3. **AssigneeSelectorPopover** - User list with avatars + active users
4. **StatusSelectorPopover** - Visual status workflow selector
5. **ReferenceSearchPopover** - Full-text node search with fuzzy matching
6. **LanguageSelectorPopover** - Programming language picker with categories

## Architecture

```
Pattern Input → Pattern Detection → Registry Check → Popover/Autocomplete
```

## State Management
- Active popover state: `store/slices/quick-input-slice.ts`
- Pattern registry: `core/patterns/pattern-registry.ts`
- Completion data: `core/completions/completion-data.ts`

## Integration Points
- CodeMirror setup: `integrations/codemirror/setup.ts`
- Enhanced input: `components/inputs/enhanced-input.tsx`
- Pattern extractor: `core/parsers/pattern-extractor.ts`

## Adding New Popovers

1. Create popover component in `components/popovers/`
2. Register in `core/patterns/register-popovers.ts`
3. Add to `popover-renderer.tsx` switch statement
4. Update pattern detection regex if needed
```

---

## 🎯 **Success Criteria**

### Must Have
- ✅ 6 popover components implemented and working
- ✅ Pattern detection triggers popovers automatically
- ✅ Keyboard navigation works in all popovers
- ✅ Selected values replace patterns in editor correctly
- ✅ No regression in existing CodeMirror autocomplete

### Should Have
- ✅ Popovers position correctly at screen edges
- ✅ Smooth animations and transitions
- ✅ Active users fetched from realtime-slice
- ✅ Recent colors/references persisted

### Nice to Have
- ⏳ Calendar widget for date picker (Phase 2 enhancement)
- ⏳ Custom status creator
- ⏳ Cross-map reference search
- ⏳ Image upload in reference popover

---

## 📊 **File Manifest**

### Files to DELETE (3 files)
1. None (bg:/border: patterns removed inline)

### Files to CREATE (17 new files)
1. `src/components/node-editor/types/popover-types.ts`
2. `src/components/node-editor/core/patterns/pattern-registry.ts`
3. `src/components/node-editor/core/patterns/register-popovers.ts`
4. `src/components/node-editor/core/completions/completion-data.ts`
5. `src/components/node-editor/components/popovers/base-popover.tsx` (renamed)
6. `src/components/node-editor/components/popovers/color-picker-popover.tsx`
7. `src/components/node-editor/components/popovers/date-picker-popover.tsx`
8. `src/components/node-editor/components/popovers/assignee-selector-popover.tsx`
9. `src/components/node-editor/components/popovers/status-selector-popover.tsx`
10. `src/components/node-editor/components/popovers/reference-search-popover.tsx`
11. `src/components/node-editor/components/popovers/language-selector-popover.tsx`
12. `src/components/node-editor/components/popovers/popover-renderer.tsx`
13. `src/components/node-editor/POPOVER_IMPLEMENTATION.md`

### Files to MODIFY (7 files)
1. `src/components/node-editor/core/parsers/pattern-extractor.ts` (remove bg:/border:)
2. `src/components/node-editor/node-updater.ts` (remove bg:/border: handling)
3. `src/types/node-data.ts` (deprecate backgroundColor/borderColor)
4. `src/store/slices/quick-input-slice.ts` (add popover state)
5. `src/components/node-editor/components/inputs/enhanced-input.tsx` (integrate popovers)
6. `src/components/node-editor/integrations/codemirror/setup.ts` (add pattern detection)
7. `src/components/node-editor/node-editor.tsx` (initialize popovers)
8. `CLAUDE.md` (documentation)

---

## ⏱️ **Estimated Timeline**

- **Phase 0 (Cleanup)**: 1 hour
- **Phase 1 (Foundation)**: 4 hours
- **Phase 2 (Popovers)**: 8 hours
- **Phase 3 (Integration)**: 4 hours
- **Phase 4 (Testing)**: 3 hours
- **Phase 5 (Documentation)**: 1 hour

**Total**: ~21 hours (3 days at 7 hours/day)

---

Ready to proceed with implementation?
