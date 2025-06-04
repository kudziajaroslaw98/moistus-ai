# Moistus AI Mind Map Sharing - Product Requirements Document

**Version:** 1.0  
**Date:** December 2024  
**Status:** Draft  
**Authors:** Product Team  

## Executive Summary

This PRD outlines the implementation of a comprehensive mind map sharing system for Moistus AI that enables seamless collaboration through multiple access methods, including a game-like joining mechanism similar to Kahoot. The system will support granular permission controls, token-based access for non-registered users, and real-time collaborative features.

**Key Features:**
- Multi-tiered permission system (Owner, Editor, Commenter, Viewer)
- Token-based room joining without account requirements
- Side panel-based sharing interface
- Real-time collaborative editing
- Guest user support with optional registration conversion
- Share link management with expiration controls

**Business Impact:**
- Increase user engagement through collaborative features
- Expand user base by reducing friction for new users
- Enable viral growth through seamless sharing
- Support educational and business use cases

## User Personas & Scenarios

### Primary Personas

**The Educator (Sarah)**
- Creates mind maps for lessons and wants students to join easily
- Needs to control who can edit vs. view content
- Wants to see who's actively participating
- Requires simple joining process for students without accounts

**The Team Lead (Marcus)**
- Shares project mind maps with team members and stakeholders
- Needs different permission levels for different team roles
- Wants to track contributions and changes
- Requires secure sharing with controlled access

**The Student/Participant (Alex)**
- Joins shared mind maps for learning or collaboration
- May not have an account initially
- Wants to contribute without complex setup
- Values immediate access and intuitive interface

**The Content Creator (Jamie)**
- Shares mind maps publicly for educational content
- Wants to control editing while allowing comments
- Needs analytics on engagement
- Requires easy link sharing across platforms

### User Scenarios

#### Scenario 1: Classroom Collaboration
Sarah creates a mind map about "Climate Change Solutions" and wants her 30 students to collaborate. She:
1. Opens the sharing panel from her mind map
2. Generates a room code and share link
3. Sets permissions to "Editor" for active collaboration
4. Shares the 6-digit code with students
5. Students join by entering the code or clicking the link
6. Real-time collaboration begins with all participants visible

#### Scenario 2: Business Presentation Review
Marcus has a strategy mind map that needs stakeholder review. He:
1. Creates multiple share links with different permission levels
2. Sends "Editor" link to core team members
3. Sends "Commenter" link to stakeholders for feedback
4. Sends "Viewer" link to executives for review
5. Tracks all activity and exports feedback summary

#### Scenario 3: Public Educational Content
Jamie creates a comprehensive mind map about "JavaScript Fundamentals" and wants to share it publicly while maintaining control:
1. Creates a public share link with "Commenter" permissions
2. Embeds the link in blog posts and social media
3. Visitors can view and add comments without accounts
4. Jamie monitors engagement and incorporates valuable feedback
5. Converts engaged users to registered accounts

## Feature Requirements

### 1. Share Panel Interface

**Description:** A comprehensive sharing interface accessible via side panel component

**Requirements:**
- **SP-001:** Integrate with existing side panel component architecture
- **SP-002:** Utilize Zustand UI slice for state management
- **SP-003:** Display current sharing status and active participants
- **SP-004:** Provide quick access to sharing options and settings
- **SP-005:** Show real-time activity feed of sharing events

**Acceptance Criteria:**
- Side panel opens smoothly with sharing controls
- All sharing options are clearly accessible
- Real-time updates reflect sharing changes
- Panel integrates seamlessly with existing UI patterns

### 2. Game-Style Room Joining

**Description:** Kahoot-inspired joining mechanism with room codes and instant access

**Requirements:**
- **GJ-001:** Generate unique 6-digit alphanumeric room codes
- **GJ-002:** Support both code entry and direct link access
- **GJ-003:** Display room code prominently in sharing interface
- **GJ-004:** Create dedicated joining page with branded experience
- **GJ-005:** Show room details before joining (title, host, participant count)
- **GJ-006:** Support QR code generation for mobile access
- **GJ-007:** Implement code expiration and refresh functionality

**Acceptance Criteria:**
- Room codes are unique and easy to communicate
- Joining process takes less than 10 seconds
- Clear error handling for invalid/expired codes
- Mobile-optimized joining experience
- Visual feedback confirms successful joining

### 3. Permission Management System

**Description:** Granular permission control with multiple access levels

**Permission Levels:**
- **Owner:** Full control, can delete, transfer ownership
- **Editor:** Can create, edit, delete nodes and edges
- **Commenter:** Can add comments and reactions only
- **Viewer:** Read-only access to mind map content

**Requirements:**
- **PM-001:** Implement role-based access control (RBAC)
- **PM-002:** Support permission inheritance and overrides
- **PM-003:** Enable bulk permission updates
- **PM-004:** Provide permission templates for common scenarios
- **PM-005:** Support temporary permission escalation
- **PM-006:** Log all permission changes for audit trail

**Permission Matrix:**

| Action | Owner | Editor | Commenter | Viewer |
|--------|-------|--------|-----------|--------|
| View Content | ✓ | ✓ | ✓ | ✓ |
| Add Comments | ✓ | ✓ | ✓ | ✗ |
| Edit Nodes | ✓ | ✓ | ✗ | ✗ |
| Delete Content | ✓ | ✓ | ✗ | ✗ |
| Share Map | ✓ | ✓ | ✗ | ✗ |
| Manage Sharing | ✓ | ✗ | ✗ | ✗ |
| Export Map | ✓ | ✓ | ✓ | ✓ |

### 4. Guest User Experience

**Description:** Seamless experience for non-registered users with conversion opportunities

**Requirements:**
- **GU-001:** Allow participation without account creation
- **GU-002:** Generate temporary user identities (Guest_1234)
- **GU-003:** Persist guest contributions during session
- **GU-004:** Provide registration prompts at strategic moments
- **GU-005:** Support guest-to-registered user conversion
- **GU-006:** Maintain contribution attribution after registration
- **GU-007:** Implement guest user limitations and upgrade paths

**Guest User Journey:**
1. Click share link or enter room code
2. Prompted to enter display name (optional)
3. Assigned temporary guest identity
4. Can participate based on room permissions
5. See periodic, non-intrusive registration prompts
6. Option to claim contributions by registering

### 5. Real-time Collaboration Features

**Description:** Live collaborative editing with presence awareness

**Requirements:**
- **RT-001:** Real-time cursor tracking and user presence
- **RT-002:** Live content synchronization across all participants
- **RT-003:** Collaborative node selection and editing indicators
- **RT-004:** Activity feed showing recent changes
- **RT-005:** Conflict resolution for simultaneous edits
- **RT-006:** Participant list with online/offline status
- **RT-007:** Real-time comment threading and replies

**Technical Implementation:**
- Leverage existing Supabase real-time subscriptions
- Implement operational transformation for conflict resolution
- Use WebSocket connections for instant updates
- Cache recent changes for offline synchronization

### 6. Share Link Management

**Description:** Comprehensive link creation and management system

**Requirements:**
- **SL-001:** Generate multiple share links per mind map
- **SL-002:** Customize link permissions and expiration
- **SL-003:** Support link analytics and usage tracking
- **SL-004:** Enable link revocation and regeneration
- **SL-005:** Password protection for sensitive content
- **SL-006:** Domain restrictions for enterprise use
- **SL-007:** Bulk link operations and templates

**Link Types:**
- **Public Links:** Anyone with link can access
- **Private Links:** Requires authentication
- **Time-limited Links:** Expire after set duration
- **Use-limited Links:** Expire after max usage count
- **Password-protected Links:** Require password entry

### 7. Activity Tracking & Analytics

**Description:** Comprehensive tracking of sharing activity and engagement

**Requirements:**
- **AT-001:** Track all sharing events and participant actions
- **AT-002:** Generate sharing analytics dashboard
- **AT-003:** Export activity reports and summaries
- **AT-004:** Real-time activity notifications
- **AT-005:** Participant engagement metrics
- **AT-006:** Content interaction heatmaps
- **AT-007:** Sharing performance insights

**Tracked Events:**
- Link shares and access attempts
- Participant joins and leaves
- Content modifications and additions
- Comment and reaction activity
- Permission changes and violations
- Export and download actions

## Technical Architecture

### System Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend UI   │    │   Share Panel   │    │  Join Interface │
│   Components    │◄──►│   Component     │◄──►│   (Guest)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Zustand UI    │    │  Sharing Slice  │    │  Real-time      │
│   Slice         │◄──►│  (New)          │◄──►│  Events         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Routes    │    │   Supabase      │    │   Collaboration │
│   Handlers      │◄──►│   Database      │◄──►│   Channel       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Database Schema Extensions

**New Tables:**

```sql
-- Share sessions (room codes)
CREATE TABLE share_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id UUID REFERENCES mind_maps(id) ON DELETE CASCADE,
  room_code VARCHAR(6) UNIQUE NOT NULL,
  host_user_id UUID REFERENCES auth.users(id),
  permissions JSONB NOT NULL DEFAULT '{"default_role": "viewer"}',
  max_participants INTEGER DEFAULT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Share participants
CREATE TABLE share_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES share_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_name VARCHAR(100),
  role share_role_enum NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_online BOOLEAN DEFAULT true,
  cursor_position JSONB,
  UNIQUE(session_id, user_id)
);

-- Share links (enhanced)
CREATE TABLE share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id UUID REFERENCES mind_maps(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  link_token VARCHAR(64) UNIQUE NOT NULL,
  name VARCHAR(200),
  role share_role_enum NOT NULL,
  permissions JSONB NOT NULL,
  access_type share_access_enum NOT NULL DEFAULT 'anyone_with_link',
  password_hash VARCHAR(255),
  max_uses INTEGER DEFAULT NULL,
  usage_count INTEGER DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  last_accessed TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Share activity log
CREATE TABLE share_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id UUID REFERENCES mind_maps(id) ON DELETE CASCADE,
  session_id UUID REFERENCES share_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_name VARCHAR(100),
  action_type share_activity_enum NOT NULL,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Enums:**
```sql
CREATE TYPE share_role_enum AS ENUM ('owner', 'editor', 'commenter', 'viewer');
CREATE TYPE share_access_enum AS ENUM ('restricted', 'anyone_with_link', 'public');
CREATE TYPE share_activity_enum AS ENUM (
  'join_session', 'leave_session', 'node_create', 'node_edit', 'node_delete',
  'edge_create', 'edge_edit', 'edge_delete', 'comment_add', 'permission_change'
);
```

### Zustand Sharing Slice

```typescript
interface SharingSlice {
  // State
  activeSession: ShareSession | null;
  participants: ShareParticipant[];
  shareLinks: ShareLink[];
  isLoading: boolean;
  error: string | null;

  // Session Management
  createSession: (mapId: string, options: CreateSessionOptions) => Promise<ShareSession>;
  joinSession: (roomCode: string, guestName?: string) => Promise<void>;
  leaveSession: () => Promise<void>;
  endSession: (sessionId: string) => Promise<void>;

  // Participant Management
  updateParticipantRole: (participantId: string, role: ShareRole) => Promise<void>;
  removeParticipant: (participantId: string) => Promise<void>;
  updatePresence: (cursorPosition: Position, isActive: boolean) => void;

  // Link Management
  createShareLink: (options: CreateShareLinkOptions) => Promise<ShareLink>;
  updateShareLink: (linkId: string, updates: UpdateShareLinkOptions) => Promise<void>;
  deleteShareLink: (linkId: string) => Promise<void>;
  copyShareLink: (link: ShareLink) => Promise<void>;

  // Real-time Events
  subscribeToSession: (sessionId: string) => void;
  unsubscribeFromSession: () => void;
  handleParticipantJoin: (participant: ShareParticipant) => void;
  handleParticipantLeave: (participantId: string) => void;
  handleActivityUpdate: (activity: ShareActivity) => void;
}
```

### API Endpoints

```typescript
// Session Management
POST   /api/share/sessions                 // Create new session
GET    /api/share/sessions/:id             // Get session details
POST   /api/share/sessions/:code/join      // Join session by code
DELETE /api/share/sessions/:id             // End session
PUT    /api/share/sessions/:id             // Update session settings

// Participant Management
GET    /api/share/sessions/:id/participants    // List participants
PUT    /api/share/participants/:id/role        // Update participant role
DELETE /api/share/participants/:id             // Remove participant
POST   /api/share/participants/:id/presence    // Update presence

// Link Management
POST   /api/share/links                    // Create share link
GET    /api/share/links/:token             // Access via share link
PUT    /api/share/links/:id                // Update link settings
DELETE /api/share/links/:id                // Delete share link

// Analytics
GET    /api/share/sessions/:id/analytics   // Session analytics
GET    /api/share/maps/:id/activity        // Map sharing activity
```

## User Experience Design

### Share Panel Interface

**Layout Structure:**
```
┌─────────────────────────────────────┐
│ Share Mind Map                   [×]│
├─────────────────────────────────────┤
│ Quick Share                         │
│ ┌─────────────┐ ┌─────────────────┐ │
│ │ Room Code   │ │  Share Link     │ │
│ │   AB12CD    │ │ [Copy Link]     │ │
│ │ [Refresh]   │ │ [QR Code]       │ │
│ └─────────────┘ └─────────────────┘ │
├─────────────────────────────────────┤
│ Active Participants (4)             │
│ ┌─────────────────────────────────┐ │
│ │ 👤 Sarah (You) - Owner          │ │
│ │ 👤 Alex_Guest - Editor    [🟢] │ │
│ │ 👤 Mike Johnson - Viewer  [🟢] │ │
│ │ 👤 Emma_Guest - Commenter [🔴] │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ Permissions                         │
│ Default Role: [Editor ▼]            │
│ ☑ Allow Comments                    │
│ ☑ Show Participant Cursors          │
│ ☐ Require Approval to Join          │
├─────────────────────────────────────┤
│ Advanced Settings                   │
│ Max Participants: [No Limit ▼]     │
│ Session Expires: [1 Hour ▼]        │
│ [End Session] [Session Analytics]   │
└─────────────────────────────────────┘
```

### Join Interface (Guest Experience)

**Landing Page:**
```
┌─────────────────────────────────────┐
│           Moistus AI                │
├─────────────────────────────────────┤
│     Join Collaborative Session      │
│                                     │
│  "Introduction to Machine Learning" │
│     Hosted by Dr. Sarah Chen        │
│                                     │
│  👥 12 participants currently active│
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Display Name (Optional)         │ │
│ │ [Enter your name...]            │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Join as Guest] [Sign Up & Join]    │
│                                     │
│ Role: Viewer • Can comment: Yes     │
│ Session expires in: 47 minutes      │
└─────────────────────────────────────┘
```

### Real-time Collaboration Indicators

**Participant Cursors:**
- Colored cursors with participant names
- Smooth cursor movement tracking
- Typing indicators for active editing

**Activity Feed:**
- Mini activity log in share panel
- Real-time updates of participant actions
- Expandable detailed activity view

**Node Collaboration Indicators:**
- Edit locks with participant identification
- Comment count badges on nodes
- Recent change highlights

## Success Metrics

### Primary KPIs

**Adoption Metrics:**
- Share session creation rate
- Unique participants per session
- Guest-to-registered user conversion rate
- Session duration and engagement

**Usage Metrics:**
- Average participants per session
- Session completion rate
- Feature utilization (comments, edits, etc.)
- Mobile vs. desktop joining patterns

**Growth Metrics:**
- Viral coefficient (invites sent per user)
- Organic share link distribution
- User retention after collaborative sessions
- Cross-platform sharing adoption

### Secondary Metrics

**Performance Metrics:**
- Join time (code entry to active participation)
- Real-time sync latency
- Error rates for join attempts
- Session stability and uptime

**Quality Metrics:**
- User satisfaction with sharing experience
- Support ticket volume related to sharing
- Feature request patterns
- A/B test results for join flow optimizations

## Implementation Phases

### Phase 1: Foundation (Weeks 1-3)

**Goals:** Establish core sharing infrastructure

**Deliverables:**
- Database schema implementation
- Basic API endpoints for session management
- Zustand sharing slice integration
- Share panel component (basic version)

**Success Criteria:**
- Share sessions can be created and joined
- Basic permission system functional
- Database operations perform within 200ms
- Integration with existing UI slice complete

### Phase 2: Core Sharing Features (Weeks 4-6)

**Goals:** Implement game-style joining and guest experience

**Deliverables:**
- Room code generation and validation
- Guest user flow and temporary identity system
- Join interface with mobile optimization
- QR code generation for easy mobile access

**Success Criteria:**
- Room codes are reliably unique and user-friendly
- Guest joining process takes < 10 seconds
- Mobile join experience is smooth and intuitive
- Share link access works across all browsers

### Phase 3: Real-time Collaboration (Weeks 7-9)

**Goals:** Enable live collaborative editing

**Deliverables:**
- Real-time cursor tracking and presence
- Live content synchronization
- Conflict resolution for simultaneous edits
- Activity feed and participant management

**Success Criteria:**
- Real-time updates sync within 100ms
- Conflicts are resolved without data loss
- Participant presence is accurately reflected
- Activity feed provides meaningful insights

### Phase 4: Advanced Features & Polish (Weeks 10-12)

**Goals:** Complete feature set and optimize experience

**Deliverables:**
- Advanced permission management
- Share link templates and bulk operations
- Analytics dashboard and reporting
- Performance optimizations and error handling

**Success Criteria:**
- All permission levels function correctly
- Analytics provide actionable insights
- System handles 50+ concurrent participants
- Error rates are below 1% for all operations

## Risk Assessment & Mitigation

### Technical Risks

**Risk:** Real-time synchronization conflicts
- **Impact:** High - could cause data loss or corruption
- **Probability:** Medium
- **Mitigation:** Implement operational transformation, comprehensive testing, conflict resolution UI

**Risk:** Database performance with high concurrent users
- **Impact:** High - could affect entire platform
- **Probability:** Medium
- **Mitigation:** Database optimization, connection pooling, horizontal scaling preparation

**Risk:** Security vulnerabilities in guest access system
- **Impact:** High - could compromise user data
- **Probability:** Low
- **Mitigation:** Security audit, input validation, rate limiting, session management

### Product Risks

**Risk:** Feature complexity overwhelming users
- **Impact:** Medium - could reduce adoption
- **Probability:** Medium
- **Mitigation:** Progressive disclosure, user testing, simplified default settings

**Risk:** Guest conversion rates lower than expected
- **Impact:** Medium - could affect growth metrics
- **Probability:** Medium
- **Mitigation:** A/B testing conversion flows, incentive optimization, onboarding improvements

### Business Risks

**Risk:** Increased infrastructure costs from real-time features
- **Impact:** Medium - could affect profitability
- **Probability:** High
- **Mitigation:** Usage monitoring, optimization strategies, pricing model adjustments

**Risk:** Support burden from new sharing features
- **Impact:** Low - manageable with proper documentation
- **Probability:** Medium
- **Mitigation:** Comprehensive help documentation, user onboarding, proactive error handling

## Acceptance Criteria

### Functional Requirements

**Share Session Management:**
- [ ] Users can create share sessions with unique room codes
- [ ] Room codes are 6 characters, alphanumeric, and easy to communicate
- [ ] Sessions can be configured with different permission levels
- [ ] Session hosts can end sessions and remove participants
- [ ] Sessions expire automatically based on configured duration

**Guest User Experience:**
- [ ] Users can join sessions without creating accounts
- [ ] Guest users receive temporary identities
- [ ] Display names can be customized by guests
- [ ] Guest contributions are properly attributed
- [ ] Registration prompts appear at strategic moments

**Real-time Collaboration:**
- [ ] Participant cursors are visible and smoothly tracked
- [ ] Content changes sync in real-time across all participants
- [ ] Edit conflicts are resolved gracefully
- [ ] Participant online/offline status is accurate
- [ ] Activity feed shows recent collaboration events

**Permission System:**
- [ ] Four permission levels (Owner, Editor, Commenter, Viewer) work correctly
- [ ] Permission changes take effect immediately
- [ ] Users cannot perform actions above their permission level
- [ ] Bulk permission updates are supported
- [ ] Permission changes are logged for audit trail

### Performance Requirements

**Response Times:**
- Join session via room code: < 3 seconds
- Real-time content sync: < 100ms
- Share panel loading: < 1 second
- Permission updates: < 500ms

**Scalability:**
- Support 50+ concurrent participants per session
- Handle 100+ active sessions simultaneously
- Maintain performance with 1000+ share links per user
- Support 10,000+ guest users per day

### Quality Requirements

**Reliability:**
- 99.9% uptime for sharing features
- < 1% error rate for join attempts
- < 0.1% data loss in collaborative editing
- Graceful degradation when real-time features fail

**Security:**
- All guest sessions are properly isolated
- Share links cannot be enumerated or guessed
- Session tokens expire appropriately
- User data is protected in collaborative sessions

**Usability:**
- Join process is intuitive for non-technical users
- Share panel is discoverable and easy to use
- Mobile experience is optimized for touch interaction
- Error messages are clear and actionable

## Future Enhancements

### Short-term (Next Quarter)

**Enhanced Analytics:**
- Detailed engagement heatmaps
- Participant behavior analysis
- Content interaction patterns
- Export capabilities for analytics data

**Mobile App Integration:**
- Native mobile app support for joining sessions
- Push notifications for session invites
- Offline synchronization for mobile users
- Mobile-optimized collaboration tools

### Medium-term (Next 6 Months)

**Advanced Collaboration:**
- Voice/video integration for sessions
- Screen sharing capabilities
- Whiteboard mode for collaborative sketching
- Integration with external tools (Slack, Teams, etc.)

**Enterprise Features:**
- Single Sign-On (SSO) integration
- Advanced admin controls and reporting
- Custom branding for share pages
- API access for enterprise integrations

### Long-term (Next Year)

**AI-Powered Collaboration:**
- AI-suggested collaboration improvements
- Automated meeting summaries from sessions
- Content recommendations based on participant expertise
- Intelligent conflict resolution assistance

**Platform Expansion:**
- Integration with learning management systems
- Marketplace for collaborative templates
- Public mind map gallery with community features
- Cross-platform collaboration (desktop apps, browser extensions)

---

**Document Status:** Ready for Review  
**Next Steps:** Technical feasibility assessment, resource allocation, timeline finalization  
**Stakeholder Approval Required:** Product, Engineering, Design, Security teams