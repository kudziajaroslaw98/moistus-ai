# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## IMPORTANT
PROACTIVELY use agents!!

## Essential Commands

### Development

- `pnpm run dev` - Start development server with Turbopack (fastest)
- `pnpm run build` - Build for production
- `pnpm run start` - Start production server
- `pnpm run lint` - Run ESLint with auto-fix
- `pnpm run pretty` - Format code with Prettier

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

## Development Guidelines

### Node Development

When creating new node types:

1. Add node component to `src/components/nodes/`
2. Register in `src/constants/node-types.ts`
3. Create corresponding form in `src/components/node-forms/`
4. Define metadata structure in node type config

### State Management

- Use Zustand slices for related functionality
- Keep slice files focused and cohesive
- Import store selectors with `useShallow` for performance
- Prefer derived state over duplicated state

### API Development

- Use `src/helpers/api/with-auth-validation.ts` for protected routes
- Implement rate limiting via `src/helpers/api/rate-limiter.ts`
- Follow consistent response patterns from `src/helpers/api/responses.ts`

### TypeScript Patterns

- Strict type definitions in `src/types/`
- Use branded types for IDs and data validation
- Prefer interface composition over inheritance
- Export types alongside implementation files

### Styling Conventions

- Use Tailwind CSS classes with custom component variants
- Component-specific styles in `src/components/ui/`
- Theme definitions in `src/themes/`
- Prefer Radix UI primitives for complex interactions
- When animating components use motion (called framer-motion previously)
