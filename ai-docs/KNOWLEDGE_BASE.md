# Moistus AI - Knowledge Base

## Project Overview

Moistus AI is a modern mind mapping platform built with Next.js 15, React 19, and Supabase. The application focuses on intelligent, AI-powered mind mapping with collaborative features and seamless user experience.

## Technical Architecture

### Core Technology Stack
- **Frontend**: Next.js 15 with App Router, React 19, TypeScript
- **Backend**: Supabase (PostgreSQL, Auth, Real-time subscriptions)
- **State Management**: Zustand with slice pattern architecture
- **Styling**: Tailwind CSS with utility-first approach
- **Animation**: Motion (Framer Motion) - use `motion/react`
- **Mind Map Rendering**: ReactFlow for interactive canvas
- **AI Integration**: Google Gemini for content generation and intelligence
- **Form Handling**: React Hook Form with Zod validation

### Architecture Patterns

#### State Management Pattern
- **Zustand Slices**: Modular state management using slice pattern
- **Slice Structure**: Each domain has its own slice (ui, core, nodes, edges, history, etc.)
- **Side Panel Integration**: Existing side panel component with UI slice integration
- **Real-time State**: Supabase subscriptions for live collaboration

#### Component Architecture
- **Composition over Inheritance**: Heavy use of composite components
- **HOCs and Custom Hooks**: Logic reuse through higher-order functions
- **Side Panel Component**: Reusable side panel for modals and workflows
- **Node Type System**: Extensible node types (Default, Text, Image, Resource, Question, Annotation, Code, Task, Builder)

#### Database Design
- **Supabase Integration**: PostgreSQL with Row Level Security (RLS)
- **UUID Primary Keys**: Consistent use of UUIDs across all tables
- **JSONB Metadata**: Flexible metadata storage for nodes and edges
- **Real-time Subscriptions**: Live updates through Supabase channels

## User Patterns & Preferences

### Collaboration Preferences
- **Educational Use Cases**: Teachers sharing with students (classroom scenarios)
- **Business Collaboration**: Team leads sharing with stakeholders at different permission levels
- **Content Creation**: Public sharing with controlled editing permissions
- **Casual Sharing**: Quick, frictionless sharing without complex setup

### User Personas Identified
1. **The Educator (Sarah)**: Needs simple joining process, student engagement, participation tracking
2. **The Team Lead (Marcus)**: Requires granular permissions, secure sharing, activity tracking
3. **The Student/Participant (Alex)**: Values immediate access, intuitive interface, no registration friction
4. **The Content Creator (Jamie)**: Wants public sharing with controlled editing, engagement analytics

### Preferred Interaction Patterns
- **Game-like Joining**: Kahoot-style room codes for easy access
- **Guest-friendly**: Participation without account requirements
- **Progressive Registration**: Optional account creation with benefit incentives
- **Real-time Feedback**: Immediate visual confirmation of actions and presence

## Development Patterns

### Code Quality Standards
- **TypeScript Strict Mode**: Comprehensive type safety
- **Functional Components**: React hooks over class components
- **Utility-first CSS**: Tailwind CSS with minimal inline styles
- **Component Size Limits**: Keep components under 100 lines
- **Parameter Limits**: Functions should have max 3 parameters
- **Nesting Limits**: Logic nesting should not exceed 3 levels

### File Organization
```
src/
├── app/ (Next.js App Router)
├── components/ (Reusable UI components)
├── contexts/ (Zustand store and slices)
├── types/ (TypeScript definitions)
├── lib/ (Utilities and configurations)
├── hooks/ (Custom React hooks)
└── utils/ (Helper functions)
```

### API Design Patterns
- **RESTful Endpoints**: Consistent REST API structure
- **Zod Validation**: Request/response validation
- **Error Handling**: Consistent error response format
- **Authentication Middleware**: Supabase session validation

## UI/UX Patterns

### Side Panel Usage
- **Existing Component**: `components/side-panel.tsx` available for reuse
- **Motion Integration**: Smooth animations with motion/react
- **Mobile Responsive**: Touch-optimized interactions
- **State Management**: Controlled via Zustand UI slice `popoverOpen` state

### Design System
- **Dark Theme**: Primary color scheme with zinc/slate colors
- **Teal Accents**: Brand color for highlights and CTAs
- **Consistent Spacing**: Tailwind spacing scale
- **Motion Design**: Smooth transitions and micro-interactions

### Responsive Patterns
- **Mobile-first**: Design for mobile, enhance for desktop
- **Touch-friendly**: Large click targets, swipe gestures
- **Progressive Enhancement**: Core functionality works without JavaScript

## Sharing & Collaboration Insights

### User Expectations
- **Instant Access**: Join process should take < 10 seconds
- **Visual Presence**: See other participants and their activity
- **Permission Clarity**: Clear understanding of what they can/cannot do
- **Mobile Support**: Works seamlessly on mobile devices

### Business Requirements
- **Viral Growth**: Easy sharing mechanisms for organic growth
- **Conversion Opportunities**: Guest-to-registered user conversion
- **Analytics**: Track engagement and usage patterns
- **Security**: Protect content while maintaining accessibility

### Technical Considerations
- **Real-time Performance**: Sub-100ms sync for collaborative editing
- **Scalability**: Support 50+ concurrent participants per session
- **Offline Resilience**: Graceful degradation when connectivity issues occur
- **Cross-platform**: Consistent experience across devices and browsers

## Performance Optimization

### Current Optimizations
- **React 19 Features**: Concurrent rendering and automatic batching
- **Next.js Optimizations**: Image optimization, code splitting, static generation
- **Zustand Efficiency**: Minimal re-renders through selective subscriptions

### Identified Bottlenecks
- **Large Mind Maps**: Need virtualization for 100+ nodes
- **Real-time Sync**: Operational transformation for conflict resolution
- **AI API Calls**: Caching and request optimization needed

## Security Considerations

### Authentication & Authorization
- **Supabase Auth**: JWT-based authentication
- **Row Level Security**: Database-level access control
- **Guest User Isolation**: Secure temporary user sessions
- **Permission Validation**: Server-side permission checks

### Data Protection
- **Input Sanitization**: Validate all user inputs
- **API Rate Limiting**: Prevent abuse and ensure fair usage
- **Session Management**: Secure session handling and expiration
- **Audit Logging**: Track sensitive operations

## AI Integration Patterns

### Current AI Features
- **Content Generation**: Node content creation via Gemini
- **Question Answering**: Intelligent responses to user queries
- **Concept Extraction**: Automatic topic identification
- **Connection Suggestions**: AI-recommended node relationships

### AI Enhancement Opportunities
- **Collaboration Intelligence**: AI-powered collaboration suggestions
- **Content Recommendations**: Personalized content suggestions
- **Conflict Resolution**: AI-assisted editing conflict resolution
- **Summary Generation**: Automatic session and change summaries

## Future Considerations

### Platform Evolution
- **Mobile Apps**: Native iOS/Android applications
- **Enterprise Features**: SSO, advanced admin controls, custom branding
- **API Platform**: Public API for third-party integrations
- **Marketplace**: Template and extension ecosystem

### Technology Evolution
- **Real-time Infrastructure**: Consider WebRTC for peer-to-peer collaboration
- **Offline Capabilities**: Service worker for offline functionality
- **Performance Monitoring**: APM implementation for production insights
- **Testing Strategy**: Comprehensive test suite development

## Development Workflow

### Quality Assurance
- **Code Reviews**: Peer review for all changes
- **Type Safety**: No TypeScript `any` types in production code
- **Performance Testing**: Regular performance audits
- **Security Audits**: Periodic security assessments

### Documentation Standards
- **API Documentation**: OpenAPI/Swagger for all endpoints
- **Component Documentation**: Storybook for UI components
- **Architecture Decisions**: ADR (Architecture Decision Records)
- **User Guides**: Comprehensive user documentation

## Lessons Learned

### Successful Patterns
- **Zustand Slices**: Clean, maintainable state management
- **Side Panel Component**: Reusable, consistent modal experience
- **TypeScript Integration**: Strong type safety reduces runtime errors
- **Supabase Real-time**: Excellent for collaborative features

### Areas for Improvement
- **Testing Coverage**: Need comprehensive test suite
- **Error Handling**: More consistent error boundaries and user feedback
- **Performance Monitoring**: Better visibility into production performance
- **Documentation**: More inline code documentation for complex logic

---

*This knowledge base is living documentation and should be updated as new insights, patterns, and preferences are discovered during development.*