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
- **AI Integration**: Google Gemini for content generation and intelligence
- **Form Handling**: React Hook Form with Zod validation

### Project Scope

Intelligent, AI-powered mind mapping platform with collaborative features and seamless user experience. Focus areas include real-time collaboration, AI-enhanced content generation, and educational/business use cases.

### File Organization Structure

```
src/
├── app/ (Next.js App Router)
├── components/ (Reusable UI components)
│   ├── sharing/ (Share panel, room codes)
│   ├── collaboration/ (Avatar stack, presence)
│   └── ui/ (Base UI components)
├── contexts/ (Zustand store and slices)
│   └── mind-map/
│       └── slices/ (collaboration, sharing, etc.)
├── types/ (TypeScript definitions)
│   ├── sharing-types.ts (Comprehensive sharing interfaces)
│   └── collaboration-types.ts (Real-time collaboration types)
├── lib/ (Utilities and configurations)
├── hooks/ (Custom React hooks)
└── utils/ (Helper functions)
```

---

## 💻 PILLAR 2: CODE PATTERNS & STANDARDS

## Standards

- **Supabase Client over api routes**: When possible use Supabase client functionality over api routes

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
- **Error Handling**: Use `respondSuccess`, `respondError` helper functions
- **Authentication Middleware**: Supabase session validation

### Code Quality Workflow

- **Code Reviews**: Peer review for all changes
- **Documentation Standards**: Inline code documentation for complex logic
- **No Runtime Errors**: Strong type safety reduces runtime errors

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

### Node Type System

Extensible node types: Default, Text, Image, Resource, Question, Annotation, Code, Task, Builder

### Data Flow Patterns

- **Database-First**: RLS policies implemented before API routes
- **Server-side Validation**: All permissions checked at database level
- **Audit Logging**: Track sensitive operations and user activities

---

## 🎨 PILLAR 4: UI/UX PATTERNS

### Design System

- **Dark Theme**: Primary color scheme with zinc/slate colors
- **Teal Accents**: Brand color for highlights and CTAs (#14b8a6)
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

## ✅ PILLAR 6: IMPLEMENTED FEATURES

### Core Mind Mapping Features

- **Interactive Canvas**: ReactFlow-based mind map rendering
- **Node System**: Multiple node types (Default, Text, Image, Resource, Question, Annotation, Code, Task, Builder)
- **Edge Management**: Connect nodes with customizable relationships
- **Drag & Drop**: Intuitive node positioning and canvas navigation

### User Management & Authentication

- **Supabase Auth**: JWT-based user authentication
- **User Profiles**: Basic user profile management
- **Session Management**: Secure session handling with automatic expiration

### UI Components (Implemented)

- **Side Panel Component**: Reusable modal/drawer system (`components/side-panel.tsx`)
- **Dark Theme**: Complete dark mode design system
- **Responsive Layout**: Mobile-first responsive design
- **Motion Animations**: Smooth transitions using motion/react

### State Management (Implemented)

- **Zustand Store**: Modular slice-based state architecture
- **UI Slice**: Controls popover states and modal management
- **Core Slices**: Basic mind map state management (nodes, edges, history)

### API Infrastructure (Implemented)

- **RESTful API**: Well-structured API routes with consistent patterns
- **Validation Helpers**: `withApiValidation`, `respondSuccess`, `respondError` utilities
- **Error Handling**: Consistent error response formatting

### Collaboration Features (In Progress/Planned)

- **Type System**: Comprehensive TypeScript definitions for sharing and collaboration exist
- **Component Foundation**: SharePanel and RoomCodeDisplay components started
- **API Scaffolding**: Share endpoints structure under `/api/share`
- **State Architecture**: Dedicated collaboration-slice and sharing-slice prepared
- **Room Codes**: 6-character Kahoot-style room codes for easy sharing
- **Guest Access**: Allow participation without account creation
- **Real-time Presence**: Supabase channels for live user presence (planned)

### AI Integration Features

- **Google Gemini**: Content generation for mind map nodes
- **Question Answering**: AI responses to user queries about content
- **Concept Extraction**: Automatic topic identification from content
- **Connection Suggestions**: AI-recommended node relationships

### Database & Security (Implemented)

- **PostgreSQL**: Supabase-managed database with UUID primary keys
- **Row Level Security**: Database-level access control policies
- **JSONB Metadata**: Flexible node and edge metadata storage
- **Input Sanitization**: Zod-based validation across all inputs

---

## ⚡ PILLAR 7: PERFORMANCE & SECURITY

### Performance Optimization

- **React 19 Features**: Concurrent rendering and automatic batching
- **Next.js Optimizations**: Image optimization, code splitting, static generation
- **Zustand Efficiency**: Minimal re-renders through selective subscriptions
- **Virtualization**: For mind maps with 100+ nodes
- **AI API Caching**: Request optimization and response caching

### Identified Bottlenecks

- **Large Mind Maps**: Need virtualization for complex diagrams
- **Real-time Sync**: Operational transformation implementation
- **AI API Calls**: Rate limiting and caching strategies

### Security Framework

- **Authentication**: Supabase JWT-based authentication
- **Authorization**: Row Level Security (RLS) at database level
- **Input Sanitization**: Validate all user inputs with Zod
- **API Rate Limiting**: Prevent abuse and ensure fair usage
- **Session Management**: Secure session handling and expiration
- **Guest User Security**: Isolated temporary sessions with limited permissions

### Security by Design

- **Permission Validation**: Server-side permission checks
- **Audit Logging**: Track all sensitive operations
- **Data Protection**: Comprehensive input validation and sanitization

---

## 🚀 PILLAR 8: IMPLEMENTATION GUIDANCE

### AI Integration Patterns

- **Content Generation**: Node content creation via Google Gemini
- **Question Answering**: Intelligent responses to user queries
- **Concept Extraction**: Automatic topic identification
- **Connection Suggestions**: AI-recommended node relationships
- **Collaboration Intelligence**: AI-powered collaboration suggestions

### Development Workflow

- **Phased Approach**: 12-week implementation plan with clear milestones
- **Type-First Development**: Define TypeScript interfaces before implementation
- **Component-First UI**: Build reusable components before specific features
- **Database-First API**: Schema and RLS before endpoint implementation

### Lessons Learned - Successful Patterns

- **Zustand Slices**: Clean, maintainable state management
- **Side Panel Component**: Reusable, consistent modal experience
- **TypeScript Integration**: Strong type safety reduces runtime errors
- **Supabase Real-time**: Excellent for collaborative features
- **Modular API Routes**: Clear separation of concerns

### Areas for Continuous Improvement

- **Testing Coverage**: Comprehensive test suite development
- **Error Handling**: Consistent error boundaries and user feedback
- **Performance Monitoring**: APM implementation for production insights
- **Documentation**: Maintain inline code documentation

### Future Considerations

- **Mobile Apps**: Native iOS/Android applications
- **Enterprise Features**: SSO, advanced admin controls, custom branding
- **API Platform**: Public API for third-party integrations
- **Real-time Infrastructure**: Consider WebRTC for peer-to-peer collaboration

### Quality Assurance Standards

- **Testing Strategy**: Unit, integration, and e2e testing
- **Performance Testing**: Regular performance audits
- **Security Audits**: Periodic security assessments
- **Documentation**: API docs, component stories, architecture decisions

---

_This knowledge base is living documentation organized into 8 core pillars for efficient AI agent navigation. Update regularly as new insights and patterns emerge._
