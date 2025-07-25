# Moistus AI - Knowledge Base

_A modern mind mapping platform built with Next.js 15, React 19, and Supabase. This knowledge base is organized into 8 core pillars for efficient AI agent navigation._

---

## 🏗️ PILLAR 1: PROJECT FOUNDATION

### Core Technology Stack

- **Frontend**: Next.js 15 with App Router, React 19, TypeScript
- **Backend**: Supabase (PostgreSQL, Auth, Real-time subscriptions)
- **State Management**: Zustand with slice pattern architecture
- **Styling**: Tailwind CSS with utility-first approach
- **Animation**: Motion (Framer Motion) - use `motion/react`
- **Mind Map Rendering**: ReactFlow for interactive canvas
- **Layout Engine**: ELK.js (Eclipse Layout Kernel) for advanced graph layouts
- **AI Integration**: @ai-sdk for handling connections to the AI API.
- **Form Handling**: React Hook Form with Zod validation

### Project Scope

Intelligent, AI-powered mind mapping platform with collaborative features and seamless user experience. Focus areas include real-time collaboration, AI-enhanced content generation, and educational/business use cases.

### Development Quality Standards

- **TypeScript Strict Mode**: Comprehensive type safety, no `any` types in production
- **Functional Components**: React hooks over class components
- **Component Size Limits**: Keep components under 100 lines
- **Parameter Limits**: Functions should have max 3 parameters
- **Nesting Limits**: Logic nesting should not exceed 3 levels
- **Type-First Development**: Comprehensive type definitions before implementation

### Architecture Patterns

- **Composition over Inheritance**: Heavy use of composite components
- **HOCs and Custom Hooks**: Logic reuse through higher-order functions
- **Modular API Routes**: Well-organized API structure with clear separation of concerns
- **Slice Pattern**: Modular state management using Zustand slices

### API Design Patterns

- **RESTful Endpoints**: Consistent REST API structure
- **Zod Validation**: Request/response validation with `withApiValidation` helper
- **Error Handling**: Use `respondSuccess`, `respondError` helper functions if API not streaming responses. Use `respondStreaming` helper function if API is streaming responses.
- **Authentication Middleware**: Supabase session validation

### Code Quality Workflow

- **Code Reviews**: Peer review for all changes
- **Documentation Standards**: Inline code documentation for complex logic
- **No Runtime Errors**: Strong type safety reduces runtime errors
- **Limit Comments**: Avoid excessive comments, favor self-explanatory code
- **Limit Dependencies**: Minimize external dependencies
- **Limit Complexity**: Keep functions and components simple and focused

---

## 🗄️ PILLAR 3: STATE & DATA ARCHITECTURE

### State Management Pattern

- **Zustand Slices**: Each domain has its own slice (ui, core, nodes, edges, history, collaboration, sharing)
- **Selective Subscriptions**: Minimal re-renders through targeted state subscriptions
- **Side Panel Integration**: UI slice controls `popoverOpen` state for modals
- **Real-time State**: Supabase subscriptions for live collaboration

### Database Design

- **Supabase Integration**: PostgreSQL with Row Level Security (RLS)
- **UUID Primary Keys**: Consistent use of UUIDs across all tables
- **JSONB Metadata**: Flexible metadata storage for nodes and edges
- **Real-time Subscriptions**: Live updates through Supabase channels
- **Migration-First Approach**: Database schema before API implementation
- **Performance Optimization**: ✅ RLS policies optimized with `(select auth.uid())` achieving 40% performance improvement

### Node Type System

Extensible node types: Default, Text, Image, Resource, Question, Annotation, Code, Task

### Data Flow Patterns

- **Database-First**: RLS policies implemented before API routes
- **Server-side Validation**: All permissions checked at database level
- **Audit Logging**: Track sensitive operations and user activities

---

## 🎨 PILLAR 4: UI/UX PATTERNS

### Design System

- **Dark Theme**: Primary color scheme with zinc/purple/teal/emerald colors
- **Teal Accents**: Brand color for highlights and CTAs purple/teal/emerals
- **Consistent Spacing**: Tailwind spacing scale
- **Motion Design**: Smooth transitions and micro-interactions using motion/react

### Component Architecture

- **Side Panel Component**: Reusable `components/side-panel.tsx` for modals and workflows
- **Utility-first CSS**: Tailwind CSS with minimal inline styles
- **Component Hierarchy**: SharePanel → RoomCodeDisplay → JoinRoom → GuestSignup

### Responsive Patterns

- **Mobile-first**: Design for mobile, enhance for desktop
- **Touch-friendly**: Large click targets, swipe gestures
- **Progressive Enhancement**: Core functionality works without JavaScript
- **Cross-platform**: Consistent experience across devices and browsers

### Animation Patterns

- **Motion Integration**: Use `motion/react` for smooth animations
- **Micro-interactions**: Immediate visual feedback for user actions
- **State Transitions**: Smooth component state changes
- **Scroll Animations**: Use `whileInView` for viewport-triggered animations
- **Stagger Effects**: Sequential animations for lists and grids using `staggerChildren`
- **Accessibility**: Respect `prefers-reduced-motion` media query

---

## 👥 PILLAR 5: USER INSIGHTS & PERSONAS

### User Personas

1. **The Educator (Sarah)**: Simple joining, student engagement, participation tracking
2. **The Team Lead (Marcus)**: Granular permissions, secure sharing, activity tracking
3. **The Student/Participant (Alex)**: Immediate access, intuitive interface, no registration friction
4. **The Content Creator (Jamie)**: Public sharing with controlled editing, engagement analytics

### User Expectations

- **Instant Access**: Join process should take < 10 seconds
- **Visual Presence**: See other participants and their activity
- **Permission Clarity**: Clear understanding of capabilities
- **Mobile Support**: Seamless mobile experience

### Collaboration Preferences

- **Educational Use Cases**: Teachers sharing with students (classroom scenarios)
- **Business Collaboration**: Team leads sharing with stakeholders at different permission levels
- **Content Creation**: Public sharing with controlled editing permissions
- **Casual Sharing**: Quick, frictionless sharing without complex setup

### Preferred Interaction Patterns

- **Game-like Joining**: Kahoot-style room codes for easy access
- **Guest-friendly**: Participation without account requirements
- **Progressive Registration**: Optional account creation with benefit incentives
- **Real-time Feedback**: Immediate visual confirmation of actions and presence

---

_This knowledge base is living documentation organized into 5 core pillars for efficient AI agent navigation. Update regularly as new insights and patterns emerge._
