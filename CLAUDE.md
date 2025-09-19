# CLAUDE.md

This file provides comprehensive guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚨 CRITICAL DEVELOPMENT PRINCIPLES

### Core Rules

- **PROACTIVELY use agents and tools!**
- **DO NOT run `pnpm run dev`** - Focus on TypeScript checks, builds, and tests + integration tests to verify functionality
- **Parallel Operations**: For maximum efficiency, invoke all relevant tools simultaneously for independent operations rather than sequentially
- **Clean Code**: Remove ALL temporary files, scripts, and helper files created during iteration at task completion
- **Quality First**: Write general-purpose solutions that work for ALL valid inputs, not just test cases
- **Reflect & Iterate**: After receiving tool results, carefully reflect on their quality and determine optimal next steps before proceeding
- **Clarity**: Ensure code is easy to understand and maintain by using descriptive variable names, commenting, and adhering to coding standards
- **Questions**: Ask clarifying questions to ensure you fully understand the problem before starting to code
- **Refactor**: Refactor long files/functions to improve readability, maintainability, and performance.

### Solution Standards

- Implement robust, maintainable, and extendable solutions
- Follow software design principles and best practices
- Never hard-code values or create test-specific solutions
- Focus on understanding problem requirements and implementing correct algorithms
- If a task is unreasonable, infeasible, or tests are incorrect, communicate this clearly
- Think about user problems thoroughly and in great detail
- Consider multiple approaches and show complete reasoning
- Try different methods if the first approach doesn't work

### Frontend Excellence

When dealing with frontend:

- **Don't hold back - Give it your all**
- Apply design principles: hierarchy, contrast, balance, and movement
- Add thoughtful details like hover states, transitions, and micro-interactions
- Include as many relevant features and interactions as possible
- Use motion (motion/react) for sophisticated animations
- Create delightful user experiences with attention to detail

## Essential Commands

### Development & Verification

```bash
# Primary verification methods (USE THESE INSTEAD OF pnpm run dev)
pnpm type-check    # TypeScript validation (checks types without building)
pnpm build         # Production build (verifies compilation)
pnpm test             # Run unit tests
pnpm test:watch   # Run tests in watch mode
pnpm test:coverage # Run tests with coverage report

# Code quality
pnpm lint         # ESLint checks
pnpm lint:fix     # ESLint with auto-fix
pnpm pretty       # Format code with Prettier

# Production (only after verification)
pnpm start        # Start production server
```

### Environment Setup

Create `.env.local` with required environment variables:

- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- Additional variables as shown in `.env.example`

## Architecture Overview

### Core Technology Stack

- **Next.js 15** with App Router and Turbopack for development
- **React 19** with TypeScript for UI components
- **Zustand** for centralized state management via slices
- **React Flow (@xyflow/react)** for mind map canvas and node interactions
- **Motion (motion/react)** for animating components
- **Supabase** for authentication, database, and real-time collaboration
- **Tailwind CSS** for styling with custom component library
- **Google Gemini AI** for intelligent features and content generation

### State Management Architecture

The application uses Zustand with a slice-based architecture for state management:

**Store Location**: `src/store/mind-map-store.tsx`
**Key Slices**:

- `core-slice` - Core data and mind map state
- `nodes-slice` - Node operations and management
- `edges-slice` - Edge/connection management
- `ui-slice` - UI state (modals, panels, selection)
- `realtime-slice` - Real-time collaboration state
- `chat-slice` - AI chat functionality
- `suggestions-slice` - AI-powered suggestions

### Node System Architecture

**Node Types**: Defined in `src/constants/node-types.ts`

- `defaultNode` (Note) - Basic text content
- `textNode` - Rich text with formatting options
- `taskNode` - Task management with checkboxes
- `questionNode` - Q&A format with answer fields
- `resourceNode` - External links with metadata
- `imageNode` - Image display with captions
- `codeNode` - Code snippets with syntax highlighting
- `annotationNode` - Comments and annotations
- `groupNode` - Container for grouping nodes
- `referenceNode` - Cross-references to other maps/nodes

**Node Components**: Located in `src/components/nodes/`

- Each node type has a dedicated component (e.g., `default-node.tsx`)
- `base-node-wrapper.tsx` provides common functionality
- Shared components in `src/components/nodes/shared/`

### Mind Map Canvas System

**Main Component**: `src/components/mind-map/react-flow-area.tsx`

- Built on React Flow for node/edge rendering and interactions
- Handles node positioning, connections, and canvas operations
- Integrates with Zustand store for state synchronization

### Inline Node Creation System

**Location**: `src/components/inline-node-creator/`
**Key Features**:

- Quick text-to-node conversion with intelligent parsing
- Command palette for structured input (`/task`, `/question`, etc.)
- Real-time preview and validation
- Metadata extraction and node type detection

### API Routes Structure

**Location**: `src/app/api/`
**Key Endpoints**:

- `ai/` - AI-powered features (chat, suggestions, content generation)
- `maps/` - Mind map CRUD operations
- `nodes/` - Node operations and search
- `auth/` - User authentication and management
- `share/` - Collaboration and sharing features
- `subscriptions/` - Stripe subscription management

### Database Integration

**Client**: `src/helpers/supabase/client.ts` (browser)
**Server**: `src/helpers/supabase/server.ts` (server-side)
**Features**:

- Real-time collaboration via Supabase subscriptions
- Row Level Security (RLS) for multi-tenant data access
- Database migrations in `supabase/migrations/`

### Real-time Collaboration

**Components**: `src/components/realtime/`
**Features**:

- Live cursor tracking and user presence
- Conflict resolution for concurrent edits
- Room-based collaboration with join codes
- Real-time form field activity indicators

## Development Best Practices

### Problem-Solving Approach

1. **Understand Thoroughly**: Analyze requirements in great detail before coding
2. **Consider Alternatives**: Explore multiple approaches and document reasoning
3. **Test Comprehensively**: Verify with TypeScript, builds, and integration tests
4. **Iterate Intelligently**: If first approach fails, try different methods
5. **Clean Up**: Remove all temporary files and test artifacts

### Node Development

When creating new node types:

1. Add node component to `src/components/nodes/`
2. Register in `src/constants/node-types.ts`
3. Create corresponding form in `src/components/node-forms/`
4. Define metadata structure in node type config
5. Add comprehensive TypeScript types
6. Include proper error handling
7. Test with various edge cases

### State Management

- Use Zustand slices for related functionality
- Keep slice files focused and cohesive
- Import store selectors with `useShallow` for performance
- Prefer derived state over duplicated state
- Implement proper TypeScript typing for all state

### API Development

- Use `src/helpers/api/with-auth-validation.ts` for protected routes
- Implement rate limiting via `src/helpers/api/rate-limiter.ts`
- Follow consistent response patterns from `src/helpers/api/responses.ts`
- Add proper error handling and validation
- Write integration tests for all endpoints

### TypeScript Patterns

- Strict type definitions in `src/types/`
- Use branded types for IDs and data validation
- Prefer interface composition over inheritance
- Export types alongside implementation files
- Never use `any` - prefer `unknown` with proper type guards

### Frontend Development Excellence

- **Visual Hierarchy**: Use size, weight, and spacing to guide attention
- **Micro-interactions**: Add subtle animations for user feedback
- **Responsive Design**: Ensure all components work across devices
- **Accessibility**: Include ARIA labels, keyboard navigation, focus states
- **Performance**: Optimize bundle sizes, lazy load components
- **Error States**: Design thoughtful error and loading states
- **Dark Mode**: Ensure all components support theme switching

### Animation Guidelines

- Use motion (motion/react) for all animations
- Keep animations smooth (60fps target)
- Add spring physics for natural movement
- Use stagger effects for lists
- Implement exit animations for removed elements
- Add subtle parallax for depth
- Consider reduced motion preferences

### Styling Conventions

- Use Tailwind CSS classes with custom component variants
- Component-specific styles in `src/components/ui/`
- Theme definitions in `src/themes/`
- Prefer Radix UI primitives for complex interactions
- Maintain consistent spacing scale
- Use CSS variables for dynamic theming
- Implement proper focus-visible states

### Testing Strategy

**🚨 CRITICAL: NEVER mock data functions or API calls - test REAL components with actual behavior**

```typescript
// ❌ FORBIDDEN - Never mock data/stores/APIs
jest.mock('@/helpers/supabase/client', () => ({ ... }))  // NO!
jest.mock('@/store/mind-map-store', () => ({ ... }))      // NO!

// ✅ REQUIRED - Test real components
render(<NodeComponent id="real-id" onUpdate={handleUpdate} />)
const { result } = renderHook(() => useMindMapStore())
act(() => result.current.addNode({ label: 'Real Node' }))
```

**Testing Principles:**
1. **Test raw components** with real props and callbacks - no fake implementations
2. **Use actual store actions** - interact with real Zustand state, not mocked stores
3. **Verify real user interactions** - test actual clicks, drags, typing events
4. **Test with realistic data** - use production-like data structures, not placeholders
5. **Check actual DOM updates** - verify real rendering, not mocked returns
6. **Test integration points** - ensure components work together without stubs

**What to Test:**
- Component rendering with real data props
- User interactions triggering actual callbacks  
- Zustand store state changes (without mocks)
- Real error states and loading behaviors
- Accessibility attributes and keyboard navigation
- Performance with realistic data volumes

This approach ensures tests catch real bugs that would affect users, not just pass with mocked data that hides actual problems.

### Documentation

- All generated documentation goes in `./ai-docs/[feature]/[doc-name].md`
- Include code examples in documentation
- Document edge cases and gotchas
- Keep README files up-to-date
- Add JSDoc comments for complex functions
- Create architecture decision records (ADRs) for major changes

## Important Notes

- This is an independent project (do not mention creation by Claude Code/Anthropic)
- Focus on delivering exceptional user experience
- Prioritize code quality over speed
- Think deeply about edge cases and error handling
- Always verify changes with TypeScript and tests before confirming success
- Clean up all temporary files and artifacts after task completion
