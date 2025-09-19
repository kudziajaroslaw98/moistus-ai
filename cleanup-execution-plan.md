# Cleanup Execution Plan - Moistus AI Code Optimization

## Overview

**Execution Strategy**: Incremental batch cleanup with testing checkpoints  
**Total Time**: 72 minutes  
**Risk Level**: Minimal (all changes verified as safe)  
**Rollback**: Git branch ready for immediate revert if needed

---

## Batch Execution Order (Risk-Based)

### **Batch 1: Zero Risk - React Namespace Optimization** ⚡
**Priority**: Highest impact, zero risk  
**Time**: 45 minutes  
**Files**: 22 UI components

#### **Execution Steps:**
1. **Create feature branch**: `cleanup/react-imports-optimization`
2. **Process each file**:
   - Identify specific React functions used (ComponentProps, forwardRef, etc.)
   - Replace `import * as React from 'react'` with direct imports
   - Update all `React.FunctionName` to direct function calls
3. **Testing checkpoint**: `pnpm run type-check && pnpm run build`
4. **Commit**: "refactor: optimize React imports for better tree-shaking"

#### **Example transformation:**
```typescript
// Before
import * as React from 'react';
function Alert({ ...props }: React.ComponentProps<'div'>) {

// After  
import { ComponentProps } from 'react';
function Alert({ ...props }: ComponentProps<'div'>) {
```

#### **Files to process:**
```
/src/hooks/use-mobile.ts
/src/components/ui/alert.tsx
/src/components/ui/avatar.tsx
/src/components/ui/badge.tsx
/src/components/ui/breadcrumb.tsx
/src/components/ui/card.tsx
/src/components/ui/dialog.tsx
/src/components/ui/dropdown-menu.tsx
/src/components/ui/popover.tsx
/src/components/ui/progress.tsx
/src/components/ui/radio-group.tsx
/src/components/ui/scroll-area.tsx
/src/components/ui/select.tsx
/src/components/ui/separator.tsx
/src/components/ui/sheet.tsx
/src/components/ui/tabs.tsx
/src/components/ui/toggle.tsx
/src/components/ui/toggle-group.tsx
/src/components/ui/Tooltip.tsx
/src/components/ui/sidebar.tsx
/src/components/ui/avatar-stack.tsx
/src/components/dashboard/dropdown-menu.tsx
```

---

### **Batch 2: Zero Risk - Node Component Cleanup** 📐
**Priority**: Architecture cleanup  
**Time**: 15 minutes  
**Files**: 7 node components

#### **Execution Steps:**
1. **Create feature branch**: `cleanup/node-component-imports`
2. **Process each file**:
   - Remove unused `import { NodeData } from '@/types/node-data'`
   - Remove unused `import { Node, NodeProps } from '@xyflow/react'`
   - Verify TypedNodeProps usage remains intact
3. **Testing checkpoint**: `pnpm run type-check`
4. **Manual test**: Create and edit different node types
5. **Commit**: "refactor: remove unused node component imports"

#### **Example transformation:**
```typescript
// Before
import { NodeData } from '@/types/node-data';
import { Node, NodeProps } from '@xyflow/react';
import { type TypedNodeProps } from './core/types';

type TaskNodeProps = TypedNodeProps<'taskNode'>;

// After
import { type TypedNodeProps } from './core/types';

type TaskNodeProps = TypedNodeProps<'taskNode'>;
```

#### **Files to process:**
```
/src/components/nodes/task-node.tsx
/src/components/nodes/text-node.tsx
/src/components/nodes/resource-node.tsx
/src/components/nodes/annotation-node.tsx
/src/components/nodes/group-node.tsx
/src/components/nodes/reference-node.tsx
/src/components/nodes/ghost-node.tsx
```

---

### **Batch 3: Zero Risk - Motion Library Consistency** 🔧
**Priority**: Consistency improvement  
**Time**: 5 minutes  
**Files**: 3 dashboard components

#### **Execution Steps:**
1. **Create feature branch**: `cleanup/motion-library-consistency`
2. **Process each file**:
   - Replace `import { motion, AnimatePresence } from 'framer-motion'`
   - With `import { motion, AnimatePresence } from 'motion/react'`
3. **Testing checkpoint**: Visual verification of dashboard animations
4. **Commit**: "refactor: standardize motion library imports"

#### **Files to process:**
```
/src/app/dashboard/page.tsx
/src/components/dashboard/create-map-card.tsx
/src/components/dashboard/create-map-dialog.tsx
```

---

### **Batch 4: Zero Risk - Dead Code Removal** 🗑️
**Priority**: Code cleanliness  
**Time**: 5 minutes  
**Files**: 2 files

#### **Execution Steps:**
1. **Create feature branch**: `cleanup/dead-code-removal`
2. **Process files**:
   - Remove `mapAlgorithmToELK()` and `mapDirectionToELK()` methods from layout-algorithms.ts
   - Delete entire `/src/helpers/store-helpers.ts` file
3. **Testing checkpoint**: `pnpm run build`
4. **Commit**: "cleanup: remove unused methods and orphaned files"

#### **Specific changes:**
```typescript
// /src/utils/layout-algorithms.ts
// Remove these private methods (lines ~20-45):
// - private static mapAlgorithmToELK(algorithm: string): ELKAlgorithm
// - private static mapDirectionToELK(algorithm: string, direction?: string): LayoutDirection

// /src/helpers/store-helpers.ts
// Delete entire file (empty/unused)
```

---

### **Batch 5: Low Risk - Store Selection Optimization** ⚠️
**Priority**: Performance micro-optimization  
**Time**: 2 minutes  
**Files**: 1 component

#### **Execution Steps:**
1. **Create feature branch**: `cleanup/store-selection-optimization`
2. **Process file**:
   - Remove `nodes` and `addNode` from useShallow selection in command-palette.tsx
3. **Testing checkpoint**: Test command palette functionality
4. **Commit**: "perf: remove unused store selections in command palette"

#### **Specific change:**
```typescript
// /src/components/command-palette.tsx
// Remove from useShallow selection object:
const {
  popoverOpen,
  setPopoverOpen,
  selectedNodes,
  // nodes,           <- REMOVE
  canUndo,
  canRedo,
  undo,
  redo,
  toggleFocusMode,
  // addNode,         <- REMOVE
  applyLayout,
  createGroupFromSelected,
  ungroupNodes,
} = useAppStore(useShallow((state) => ({
  // ... rest remains same
})));
```

---

## Testing Protocol

### **After Each Batch**
```bash
# Type checking
pnpm run type-check

# Build verification
pnpm run build

# Linting
pnpm run lint
```

### **Comprehensive Testing After All Batches**
```bash
# Full test suite
pnpm run test

# Development server
pnpm run dev
# Verify: UI components render, node creation works, animations function

# Production build test
pnpm run build && pnpm run start
```

### **Manual Testing Checklist**
- [ ] Dashboard loads and animates correctly
- [ ] All UI components render properly  
- [ ] Node creation and editing functions
- [ ] Command palette opens and functions
- [ ] No console errors in browser
- [ ] Build completes without warnings

---

## Emergency Rollback Procedures

### **Immediate Rollback** (if issues discovered)
```bash
# Return to backup branch
git checkout code-cleanup-analysis-2025-09-16

# Force reset if needed
git reset --hard HEAD

# Verify everything works
pnpm run dev
```

### **Selective Rollback** (undo specific batch)
```bash
# Revert specific commit
git revert <commit-hash>

# Or reset to before specific batch
git reset --hard <commit-before-batch>
```

### **Safety Verification**
- Git branch `code-cleanup-analysis-2025-09-16` preserved as failsafe
- Each batch in separate commit for granular rollback
- Testing checkpoints prevent accumulating issues

---

## Success Metrics

### **Measurable Improvements**
- **Bundle size reduction**: 6-19KB (measure with `pnpm run build`)
- **Build time improvement**: Faster tree-shaking and compilation
- **Code quality**: Cleaner imports and fewer unused dependencies
- **Type safety**: All type checks pass

### **Verification Commands**
```bash
# Bundle analysis (if analyzer configured)
pnpm run analyze

# Bundle size comparison
du -h .next/static/chunks/*.js

# Build performance timing
time pnpm run build
```

---

## Post-Cleanup Actions

### **Documentation Updates**
- [ ] Update this progress file with results
- [ ] Document any patterns discovered for future reference
- [ ] Create team guidelines for import best practices

### **Monitoring**
- [ ] Watch for any issues in development over next few days
- [ ] Monitor bundle size in future builds
- [ ] Consider automated linting rules to prevent regression

---

**Ready for execution pending user approval.**
