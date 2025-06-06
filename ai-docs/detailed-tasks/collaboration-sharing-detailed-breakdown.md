# Moistus AI Collaboration & Sharing - Detailed Task Breakdown

## Phase 1: Database & Core Infrastructure (Week 1-2)

### 1.1 Database Schema Implementation

#### 1.1.1 Create share_tokens table
**Technical Requirements:**
- Table structure:
  ```sql
  CREATE TABLE share_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    map_id UUID NOT NULL REFERENCES mind_maps(id) ON DELETE CASCADE,
    token VARCHAR(6) NOT NULL UNIQUE,
    token_type VARCHAR(20) NOT NULL CHECK (token_type IN ('room_code', 'direct_link')),
    share_link_hash VARCHAR(64),
    permissions JSONB NOT NULL DEFAULT '{"role": "viewer", "can_edit": false, "can_comment": true, "can_view": true}',
    max_users INTEGER DEFAULT 50,
    current_users INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  
  -- Indexes
  CREATE INDEX idx_share_tokens_map_id ON share_tokens(map_id);
  CREATE INDEX idx_share_tokens_token ON share_tokens(token);
  CREATE INDEX idx_share_tokens_expires_at ON share_tokens(expires_at) WHERE is_active = true;
  ```
- Implement token generation function (6 chars, alphanumeric, case-insensitive)
- Add unique constraint with retry logic for token collisions
- Create trigger for updated_at timestamp

**Acceptance Criteria:**
- [ ] Table created with all columns
- [ ] Indexes properly configured
- [ ] Token uniqueness enforced
- [ ] Cascade delete from mind_maps works

#### 1.1.2 Create guest_users table
**Technical Requirements:**
- Table structure:
  ```sql
  CREATE TABLE guest_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(128) NOT NULL UNIQUE,
    display_name VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    avatar_url TEXT,
    fingerprint_hash VARCHAR(64),
    first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    conversion_date TIMESTAMP WITH TIME ZONE,
    converted_user_id UUID REFERENCES auth.users(id),
    session_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  
  -- Indexes
  CREATE INDEX idx_guest_users_session_id ON guest_users(session_id);
  CREATE INDEX idx_guest_users_email ON guest_users(email) WHERE email IS NOT NULL;
  CREATE INDEX idx_guest_users_converted ON guest_users(converted_user_id) WHERE converted_user_id IS NOT NULL;
  ```
- Implement session ID generation (cryptographically secure)
- Add email validation constraint
- Create cleanup job for sessions older than 30 days

**Acceptance Criteria:**
- [ ] Table created with proper constraints
- [ ] Session ID uniqueness enforced
- [ ] Email validation works
- [ ] Cleanup policy documented

#### 1.1.3 Create share_access_logs table
**Technical Requirements:**
- Table structure:
  ```sql
  CREATE TABLE share_access_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    share_token_id UUID NOT NULL REFERENCES share_tokens(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    guest_user_id UUID REFERENCES guest_users(id),
    access_type VARCHAR(20) NOT NULL CHECK (access_type IN ('join', 'leave', 'view', 'edit', 'comment')),
    ip_address INET,
    user_agent TEXT,
    referrer TEXT,
    session_duration INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure either user_id or guest_user_id is set
    CONSTRAINT check_user_or_guest CHECK (
      (user_id IS NOT NULL AND guest_user_id IS NULL) OR 
      (user_id IS NULL AND guest_user_id IS NOT NULL)
    )
  );
  
  -- Indexes for analytics
  CREATE INDEX idx_access_logs_token_id ON share_access_logs(share_token_id);
  CREATE INDEX idx_access_logs_created_at ON share_access_logs(created_at);
  CREATE INDEX idx_access_logs_access_type ON share_access_logs(access_type);
  ```
- Implement IP address anonymization for GDPR
- Add user agent parsing for device analytics
- Create partitioning strategy for large datasets

**Acceptance Criteria:**
- [ ] Table enforces user XOR guest constraint
- [ ] IP addresses properly stored
- [ ] Partitioning strategy documented
- [ ] Analytics queries performant

#### 1.1.4 Create mind_map_shares table
**Technical Requirements:**
- Table structure:
  ```sql
  CREATE TABLE mind_map_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    map_id UUID NOT NULL REFERENCES mind_maps(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'editor', 'commenter', 'viewer')),
    can_edit BOOLEAN NOT NULL DEFAULT false,
    can_comment BOOLEAN NOT NULL DEFAULT true,
    can_view BOOLEAN NOT NULL DEFAULT true,
    shared_by UUID NOT NULL REFERENCES auth.users(id),
    shared_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicate shares
    UNIQUE(map_id, user_id)
  );
  
  -- Indexes
  CREATE INDEX idx_map_shares_map_id ON mind_map_shares(map_id);
  CREATE INDEX idx_map_shares_user_id ON mind_map_shares(user_id);
  CREATE INDEX idx_map_shares_expires_at ON mind_map_shares(expires_at) WHERE expires_at IS NOT NULL;
  ```
- Implement role-based permission inheritance
- Add trigger to sync permissions with role changes
- Create function to check effective permissions

**Acceptance Criteria:**
- [ ] No duplicate shares per user/map
- [ ] Role permissions properly enforced
- [ ] Expiration handling works
- [ ] Permission check function efficient

#### 1.1.5 Create collaboration_presence table
**Technical Requirements:**
- Table structure:
  ```sql
  CREATE TABLE collaboration_presence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    map_id UUID NOT NULL REFERENCES mind_maps(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'idle', 'away', 'offline')),
    cursor_x FLOAT,
    cursor_y FLOAT,
    viewport_x FLOAT,
    viewport_y FLOAT,
    zoom_level FLOAT,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_id VARCHAR(128),
    user_color VARCHAR(7),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- One presence per user per map
    UNIQUE(user_id, map_id)
  );
  
  -- Indexes for real-time queries
  CREATE INDEX idx_presence_map_id ON collaboration_presence(map_id) WHERE status != 'offline';
  CREATE INDEX idx_presence_last_activity ON collaboration_presence(last_activity);
  ```
- Implement automatic status transitions (active → idle → away)
- Add cleanup for stale presence records
- Create real-time subscription triggers

**Acceptance Criteria:**
- [ ] Unique constraint prevents duplicates
- [ ] Status transitions work automatically
- [ ] Real-time updates trigger properly
- [ ] Cleanup removes stale records

### 1.2 Row Level Security (RLS) Implementation

#### 1.2.1 RLS for share_tokens
**Technical Requirements:**
```sql
-- Enable RLS
ALTER TABLE share_tokens ENABLE ROW LEVEL SECURITY;

-- Policies
-- SELECT: Can view if you created it or if it's active and not expired
CREATE POLICY "Users can view active tokens" ON share_tokens
  FOR SELECT
  USING (
    (SELECT auth.uid()) = created_by 
    OR (is_active = true AND (expires_at IS NULL OR expires_at > NOW()))
  );

-- INSERT: Can create if you own the map
CREATE POLICY "Map owners can create tokens" ON share_tokens
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM mind_maps 
      WHERE id = map_id AND user_id = (SELECT auth.uid())
    )
  );

-- UPDATE: Only creator can update
CREATE POLICY "Token creators can update" ON share_tokens
  FOR UPDATE
  USING ((SELECT auth.uid()) = created_by)
  WITH CHECK ((SELECT auth.uid()) = created_by);

-- DELETE: Only creator can delete
CREATE POLICY "Token creators can delete" ON share_tokens
  FOR DELETE
  USING ((SELECT auth.uid()) = created_by);
```

**Acceptance Criteria:**
- [ ] Non-owners cannot create tokens
- [ ] Expired tokens not visible to non-creators
- [ ] Update/delete restricted to creators
- [ ] Public users can validate tokens

#### 1.2.2 RLS for guest_users
**Technical Requirements:**
```sql
-- Enable RLS
ALTER TABLE guest_users ENABLE ROW LEVEL SECURITY;

-- Policies
-- SELECT: Public for session validation
CREATE POLICY "Public read for session validation" ON guest_users
  FOR SELECT
  USING (true);

-- INSERT: Public for guest creation
CREATE POLICY "Public insert for guest creation" ON guest_users
  FOR INSERT
  WITH CHECK (true);

-- UPDATE: Only the guest session or admins
CREATE POLICY "Guests can update own session" ON guest_users
  FOR UPDATE
  USING (
    session_id = current_setting('app.current_session_id', true)
    OR (SELECT auth.uid()) IN (SELECT user_id FROM admin_users)
  )
  WITH CHECK (
    session_id = current_setting('app.current_session_id', true)
    OR (SELECT auth.uid()) IN (SELECT user_id FROM admin_users)
  );
```

**Acceptance Criteria:**
- [ ] Guests can create sessions
- [ ] Session updates restricted properly
- [ ] Admin override works
- [ ] No unauthorized data access

### 1.3 Database Functions & Triggers

#### 1.3.1 Token Generation Function
**Technical Requirements:**
```sql
CREATE OR REPLACE FUNCTION generate_room_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  -- Generate 6 character code
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  
  -- Format as XXX-XXX for readability
  RETURN substr(result, 1, 3) || '-' || substr(result, 4, 3);
END;
$$ LANGUAGE plpgsql;

-- Function to generate unique token
CREATE OR REPLACE FUNCTION generate_unique_room_code()
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  attempts INTEGER := 0;
BEGIN
  LOOP
    new_code := generate_room_code();
    attempts := attempts + 1;
    
    -- Check if code exists
    IF NOT EXISTS (SELECT 1 FROM share_tokens WHERE token = new_code) THEN
      RETURN new_code;
    END IF;
    
    -- Prevent infinite loop
    IF attempts > 100 THEN
      RAISE EXCEPTION 'Could not generate unique room code';
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
```

**Acceptance Criteria:**
- [ ] Generates 6-char codes reliably
- [ ] Format is XXX-XXX
- [ ] Handles collisions gracefully
- [ ] Performance acceptable (<50ms)

#### 1.3.2 Permission Check Function
**Technical Requirements:**
```sql
CREATE OR REPLACE FUNCTION check_user_map_permission(
  p_user_id UUID,
  p_map_id UUID,
  p_action TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_role TEXT;
  v_can_edit BOOLEAN;
  v_can_comment BOOLEAN;
  v_can_view BOOLEAN;
BEGIN
  -- Check if user owns the map
  IF EXISTS (SELECT 1 FROM mind_maps WHERE id = p_map_id AND user_id = p_user_id) THEN
    RETURN true;
  END IF;
  
  -- Check direct shares
  SELECT role, can_edit, can_comment, can_view
  INTO v_role, v_can_edit, v_can_comment, v_can_view
  FROM mind_map_shares
  WHERE map_id = p_map_id 
    AND user_id = p_user_id
    AND (expires_at IS NULL OR expires_at > NOW());
  
  IF FOUND THEN
    CASE p_action
      WHEN 'view' THEN RETURN v_can_view;
      WHEN 'comment' THEN RETURN v_can_comment;
      WHEN 'edit' THEN RETURN v_can_edit;
      ELSE RETURN false;
    END CASE;
  END IF;
  
  -- Check token-based access (for logged-in users using room codes)
  -- Implementation here...
  
  RETURN false;
END;
$$ LANGUAGE plpgsql;
```

**Acceptance Criteria:**
- [ ] Correctly identifies owners
- [ ] Respects share permissions
- [ ] Handles expired shares
- [ ] Performance optimized

## Phase 2: Core API Implementation (Week 2-3)

### 2.1 Room Code Management APIs

#### 2.1.1 POST /api/share/create-room-code
**Technical Implementation:**
```typescript
// File: src/app/api/share/create-room-code/route.ts

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { withApiValidation, respondSuccess, respondError } from '@/helpers/api-helpers';

const CreateRoomCodeSchema = z.object({
  map_id: z.string().uuid(),
  role: z.enum(['editor', 'commenter', 'viewer']).default('viewer'),
  can_edit: z.boolean().optional(),
  can_comment: z.boolean().optional(),
  can_view: z.boolean().optional(),
  max_users: z.number().min(1).max(100).default(50),
  expires_in_hours: z.number().min(1).max(168).optional(), // Max 1 week
});

export async function POST(request: NextRequest) {
  return withApiValidation(request, CreateRoomCodeSchema, async (data, supabase) => {
    // 1. Verify user owns the map
    const { data: map, error: mapError } = await supabase
      .from('mind_maps')
      .select('id, title')
      .eq('id', data.map_id)
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      .single();
    
    if (mapError || !map) {
      return respondError('Map not found or unauthorized', 403);
    }
    
    // 2. Generate unique room code
    const { data: tokenData, error: tokenError } = await supabase
      .rpc('generate_unique_room_code');
    
    if (tokenError) {
      return respondError('Failed to generate room code', 500);
    }
    
    // 3. Calculate expiration
    const expires_at = data.expires_in_hours
      ? new Date(Date.now() + data.expires_in_hours * 60 * 60 * 1000).toISOString()
      : null;
    
    // 4. Create share token
    const permissions = {
      role: data.role,
      can_edit: data.can_edit ?? (data.role === 'editor'),
      can_comment: data.can_comment ?? (data.role !== 'viewer'),
      can_view: data.can_view ?? true,
    };
    
    const { data: token, error: createError } = await supabase
      .from('share_tokens')
      .insert({
        map_id: data.map_id,
        token: tokenData,
        token_type: 'room_code',
        permissions,
        max_users: data.max_users,
        expires_at,
        created_by: (await supabase.auth.getUser()).data.user?.id,
      })
      .select()
      .single();
    
    if (createError) {
      return respondError('Failed to create room code', 500);
    }
    
    // 5. Generate share link and QR code data
    const shareLink = `${process.env.NEXT_PUBLIC_APP_URL}/join?code=${token.token}`;
    const qrCodeData = {
      value: shareLink,
      size: 256,
      level: 'M',
    };
    
    return respondSuccess({
      token: token.token,
      share_link: shareLink,
      qr_code_data: qrCodeData,
      expires_at: token.expires_at,
      permissions: token.permissions,
      max_users: token.max_users,
    });
  });
}
```

**Acceptance Criteria:**
- [ ] Validates user owns map
- [ ] Generates unique 6-char code
- [ ] Respects permission settings
- [ ] Returns QR code data
- [ ] Handles errors gracefully

#### 2.1.2 POST /api/share/join-room
**Technical Implementation:**
```typescript
// File: src/app/api/share/join-room/route.ts

const JoinRoomSchema = z.object({
  token: z.string().regex(/^[A-Z0-9]{3}-[A-Z0-9]{3}$/),
  guest_info: z.object({
    display_name: z.string().min(1).max(50),
    email: z.string().email().optional(),
    session_id: z.string(),
    fingerprint_hash: z.string().optional(),
  }).optional(),
});

export async function POST(request: NextRequest) {
  return withApiValidation(request, JoinRoomSchema, async (data, supabase) => {
    // 1. Validate token
    const { data: tokenData, error: tokenError } = await supabase
      .from('share_tokens')
      .select(`
        *,
        mind_maps!inner(id, title, description)
      `)
      .eq('token', data.token.toUpperCase())
      .eq('is_active', true)
      .single();
    
    if (tokenError || !tokenData) {
      return respondError('Invalid or expired room code', 404);
    }
    
    // 2. Check expiration
    if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
      return respondError('Room code has expired', 410);
    }
    
    // 3. Check user count
    if (tokenData.current_users >= tokenData.max_users) {
      return respondError('Room is full', 403);
    }
    
    // 4. Get or create user session
    const { data: { user } } = await supabase.auth.getUser();
    let userId = user?.id;
    let guestId = null;
    let isGuest = false;
    
    if (!user && data.guest_info) {
      // Create guest user
      const { data: guest, error: guestError } = await supabase
        .from('guest_users')
        .upsert({
          session_id: data.guest_info.session_id,
          display_name: data.guest_info.display_name,
          email: data.guest_info.email,
          fingerprint_hash: data.guest_info.fingerprint_hash,
          last_activity: new Date().toISOString(),
        }, {
          onConflict: 'session_id',
        })
        .select()
        .single();
      
      if (guestError) {
        return respondError('Failed to create guest session', 500);
      }
      
      guestId = guest.id;
      isGuest = true;
    } else if (!user) {
      return respondError('Authentication required', 401);
    }
    
    // 5. Log access
    await supabase.from('share_access_logs').insert({
      share_token_id: tokenData.id,
      user_id: userId,
      guest_user_id: guestId,
      access_type: 'join',
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      user_agent: request.headers.get('user-agent'),
      referrer: request.headers.get('referer'),
    });
    
    // 6. Increment user count
    await supabase
      .from('share_tokens')
      .update({ current_users: tokenData.current_users + 1 })
      .eq('id', tokenData.id);
    
    // 7. Create presence channel name
    const channelName = `presence:map:${tokenData.map_id}`;
    
    return respondSuccess({
      map_id: tokenData.map_id,
      map_title: tokenData.mind_maps.title,
      permissions: tokenData.permissions,
      user_id: userId || guestId,
      is_guest: isGuest,
      websocket_channel: channelName,
      current_users: tokenData.current_users + 1,
      max_users: tokenData.max_users,
    });
  });
}
```

#### 2.1.3 POST /api/share/handle-guest-signin
**Technical Implementation:**
```typescript
// File: src/app/api/share/handle-guest-signin/route.ts

const HandleGuestSigninSchema = z.object({
  guest_session_id: z.string(),
  share_token: z.string(),
  map_id: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  return withApiValidation(request, HandleGuestSigninSchema, async (data, supabase) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return respondError('Authentication required', 401);
    }
    
    // 1. Get guest user data
    const { data: guestUser, error: guestError } = await supabase
      .from('guest_users')
      .select('*')
      .eq('session_id', data.guest_session_id)
      .single();
    
    if (guestError || !guestUser) {
      return respondError('Guest session not found', 404);
    }
    
    // 2. Get share token data
    const { data: tokenData, error: tokenError } = await supabase
      .from('share_tokens')
      .select('permissions')
      .eq('token', data.share_token)
      .eq('map_id', data.map_id)
      .single();
    
    if (tokenError || !tokenData) {
      return respondError('Invalid share token', 404);
    }
    
    // 3. Create direct share for the user
    const { error: shareError } = await supabase
      .from('mind_map_shares')
      .insert({
        map_id: data.map_id,
        user_id: user.id,
        role: tokenData.permissions.role,
        can_edit: tokenData.permissions.can_edit,
        can_comment: tokenData.permissions.can_comment,
        can_view: tokenData.permissions.can_view,
        shared_by: user.id, // Self-shared via room code
        shared_at: new Date().toISOString(),
      });
    
    if (shareError && shareError.code !== '23505') { // Ignore duplicate key error
      return respondError('Failed to create share', 500);
    }
    
    // 4. Convert guest user
    await supabase
      .from('guest_users')
      .update({
        conversion_date: new Date().toISOString(),
        converted_user_id: user.id,
      })
      .eq('id', guestUser.id);
    
    // 5. Transfer any guest activity to the user
    await supabase
      .from('share_access_logs')
      .update({
        user_id: user.id,
        guest_user_id: null,
      })
      .eq('guest_user_id', guestUser.id);
    
    // 6. Update presence to use real user
    await supabase
      .from('collaboration_presence')
      .delete()
      .eq('user_id', guestUser.id);
    
    return respondSuccess({
      success: true,
      share_created: true,
      permissions: tokenData.permissions,
    });
  });
}
```

**Acceptance Criteria:**
- [ ] Validates room code format
- [ ] Checks expiration properly
- [ ] Enforces user limits
- [ ] Creates guest sessions
- [ ] Logs access properly
- [ ] Returns channel info

### 2.2 Guest User Management

#### 2.2.1 POST /api/share/create-guest-user
**Technical Implementation:**
```typescript
// File: src/app/api/share/create-guest-user/route.ts

const CreateGuestUserSchema = z.object({
  display_name: z.string().min(1).max(50).transform(val => val.trim()),
  email: z.string().email().optional(),
  session_id: z.string().min(32).max(128),
  fingerprint_hash: z.string().length(64).optional(),
  session_data: z.record(z.unknown()).optional(),
});

export async function POST(request: NextRequest) {
  return withApiValidation(request, CreateGuestUserSchema, async (data, supabase) => {
    // 1. Check for existing session
    const { data: existingGuest } = await supabase
      .from('guest_users')
      .select('id, display_name, avatar_url')
      .eq('session_id', data.session_id)
      .single();
    
    if (existingGuest) {
      return respondSuccess({
        guest_user_id: existingGuest.id,
        display_name: existingGuest.display_name,
        avatar_url: existingGuest.avatar_url,
        is_existing: true,
      });
    }
    
    // 2. Generate avatar
    const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.session_id}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
    
    // 3. Create guest user
    const { data: guest, error } = await supabase
      .from('guest_users')
      .insert({
        session_id: data.session_id,
        display_name: data.display_name,
        email: data.email,
        avatar_url: avatarUrl,
        fingerprint_hash: data.fingerprint_hash,
        session_data: data.session_data || {},
      })
      .select()
      .single();
    
    if (error) {
      return respondError('Failed to create guest user', 500);
    }
    
    // 4. Set session cookie
    const response = respondSuccess({
      guest_user_id: guest.id,
      session_token: guest.session_id,
      display_name: guest.display_name,
      avatar_url: guest.avatar_url,
      is_existing: false,
    });
    
    // Set secure session cookie
    response.cookies.set('guest_session', guest.session_id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    
    return response;
  });
}
```

**Acceptance Criteria:**
- [ ] Handles existing sessions
- [ ] Generates unique avatars
- [ ] Sets secure cookies
- [ ] Validates display names
- [ ] Returns session info

### 2.3 Real-time Collaboration APIs

#### 2.3.1 POST /api/collaboration/update-presence
**Technical Implementation:**
```typescript
// File: src/app/api/collaboration/update-presence/route.ts

const UpdatePresenceSchema = z.object({
  map_id: z.string().uuid(),
  status: z.enum(['active', 'idle', 'away', 'offline']).optional(),
  cursor_position: z.object({
    x: z.number(),
    y: z.number(),
  }).optional(),
  viewport: z.object({
    x: z.number(),
    y: z.number(),
    zoom: z.number().min(0.1).max(5),
  }).optional(),
});

export async function POST(request: NextRequest) {
  return withApiValidation(request, UpdatePresenceSchema, async (data, supabase) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return respondError('Authentication required', 401);
    }
    
    // 1. Check permissions
    const hasAccess = await supabase.rpc('check_user_map_permission', {
      p_user_id: user.id,
      p_map_id: data.map_id,
      p_action: 'view',
    });
    
    if (!hasAccess) {
      return respondError('Access denied', 403);
    }
    
    // 2. Upsert presence
    const updates: any = {
      user_id: user.id,
      map_id: data.map_id,
      last_activity: new Date().toISOString(),
    };
    
    if (data.status) updates.status = data.status;
    if (data.cursor_position) {
      updates.cursor_x = data.cursor_position.x;
      updates.cursor_y = data.cursor_position.y;
    }
    if (data.viewport) {
      updates.viewport_x = data.viewport.x;
      updates.viewport_y = data.viewport.y;
      updates.zoom_level = data.viewport.zoom;
    }
    
    const { error } = await supabase
      .from('collaboration_presence')
      .upsert(updates, {
        onConflict: 'user_id,map_id',
      });
    
    if (error) {
      return respondError('Failed to update presence', 500);
    }
    
    // 3. Broadcast to presence channel
    const channel = supabase.channel(`presence:map:${data.map_id}`);
    await channel.send({
      type: 'presence',
      event: 'cursor_update',
      payload: {
        user_id: user.id,
        ...data,
      },
    });
    
    return respondSuccess({ success: true });
  });
}
```

**Acceptance Criteria:**
- [ ] Validates permissions
- [ ] Updates presence data
- [ ] Broadcasts to channel
- [ ] Handles partial updates
- [ ] Efficient upsert logic

## Phase 3: UI Component Implementation (Week 3-4)

### 3.1 SharePanel Component Enhancement

#### 3.1.1 Complete SharePanel Implementation
**File:** `src/components/sharing/share-panel.tsx`

**Technical Requirements:**
```typescript
interface SharePanelProps {
  mapId: string;
  mapTitle: string;
  isOpen: boolean;
  onClose: () => void;
  currentUser: {
    id: string;
    name: string;
    email: string;
  };
}

// Component structure:
// - Tabs: Room Code | Direct Share | Manage Access
// - Room Code Tab:
//   - Generate new code button
//   - Current code display with copy
//   - QR code display
//   - Settings: max users, expiration, permissions
//   - Active users count
// - Direct Share Tab:
//   - Email input with autocomplete
//   - Role selector
//   - Custom message
//   - Send invitation button
// - Manage Access Tab:
//   - List of current shares
//   - Edit permissions
//   - Revoke access
//   - Activity log
```

**Implementation Details:**
- Use `motion/react` for smooth transitions
- Integrate with `sharing-slice` for state
- Real-time updates via Supabase subscription
- Responsive design with mobile bottom sheet
- Keyboard navigation support

**Acceptance Criteria:**
- [ ] All three tabs functional
- [ ] Real-time user count updates
- [ ] Copy to clipboard works
- [ ] QR code generates correctly
- [ ] Permission changes save
- [ ] Mobile responsive

#### 3.1.2 RoomCodeDisplay Component
**File:** `src/components/sharing/room-code-display.tsx`

**Technical Requirements:**
```typescript
interface RoomCodeDisplayProps {
  token: ShareToken;
  onRefresh?: (tokenId: string) => Promise<void>;
  onRevoke?: (tokenId: string) => Promise<void>;
  onCopy?: (token: string) => void;
  showQRCode?: boolean;
}

// Visual design:
// - Large, readable code (e.g., "ABC-123")
// - Copy button with feedback
// - QR code (collapsible on mobile)
// - User count indicator (12/50 users)
// - Expiration countdown
// - Refresh/regenerate button
// - Revoke button with confirmation
```

**Implementation Details:**
- Format code as XXX-XXX for readability
- Use `react-qr-code` for QR generation
- Animate user count changes
- Show toast on copy success
- Confirmation modal for revoke

**Acceptance Criteria:**
- [ ] Code displays prominently
- [ ] Copy feedback visible
- [ ] QR code renders correctly
- [ ] User count real-time
- [ ] Expiration timer works
- [ ] Refresh generates new code

### 3.2 Join Flow Components

#### 3.2.1 JoinRoom Component
**File:** `src/components/sharing/join-room.tsx`

**Technical Requirements:**
```typescript
interface JoinRoomProps {
  onJoinSuccess?: (mapId: string) => void;
  onJoinError?: (error: string) => void;
  initialToken?: string;
}

// Component flow:
// 1. Code input screen
//    - 6 character input (auto-format XXX-XXX)
//    - Real-time validation
//    - "Checking..." state
//    - Error messages
// 2. Map preview (when valid)
//    - Map title and description
//    - Owner info
//    - Current participants
//    - Your permissions
// 3. Guest info (if not logged in)
//    - Name input
//    - Optional email
//    - "Join as Guest" button
//    - "Sign in instead" link
// 4. Loading state
// 5. Success redirect
```

**Implementation Details:**
- Auto-uppercase and format input
- Debounce validation (500ms)
- Show map preview on valid code
- Smooth transitions between states
- Handle full room gracefully
- Mobile-optimized layout

**Acceptance Criteria:**
- [ ] Auto-formats code input
- [ ] Real-time validation works
- [ ] Shows map preview
- [ ] Guest flow smooth
- [ ] Error states clear
- [ ] Redirects on success

#### 3.2.2 GuestSignup Component
**File:** `src/components/sharing/guest-signup.tsx`

**Technical Requirements:**
```typescript
interface GuestSignupProps {
  onGuestCreated?: (guest: GuestUser) => void;
  onConversion?: (userId: string) => void;
  suggestedName?: string;
  mapTitle?: string;
}

// Component elements:
// - Welcome message
// - Name input with validation
// - Email input (optional)
// - Avatar preview
// - Benefits of signing up
// - "Continue as Guest" CTA
// - "Create Account" secondary
// - Privacy notice
```

**Implementation Details:**
- Generate fingerprint hash
- Create unique session ID
- Show avatar preview
- Validate name (no profanity)
- Store email for conversion
- Smooth onboarding flow

**Acceptance Criteria:**
- [ ] Name validation works
- [ ] Avatar generates correctly
- [ ] Session persists
- [ ] Benefits clearly shown
- [ ] Privacy notice visible
- [ ] Conversion tracking ready

### 3.3 Presence & Activity Components

#### 3.3.1 ActiveUsersDisplay Component
**File:** `src/components/collaboration/active-users-display.tsx`

**Technical Requirements:**
```typescript
interface ActiveUsersDisplayProps {
  mapId: string;
  maxDisplay?: number;
  showDetails?: boolean;
  position?: 'top-right' | 'bottom-left';
}

// Visual elements:
// - Avatar stack (overlapping)
// - +N indicator for overflow
// - Hover tooltip with names
// - Click for full list
// - Real-time updates
// - Smooth enter/exit animations
```

**Implementation Details:**
- Subscribe to presence channel
- Animate avatar additions/removals
- Show user colors
- Handle guest avatars
- Responsive sizing
- Accessible tooltips

**Acceptance Criteria:**
- [ ] Real-time updates work
- [ ] Animations smooth
- [ ] Tooltips accessible
- [ ] Click opens user list
- [ ] Handles many users
- [ ] Mobile responsive

#### 3.3.2 UserCursor Component
**File:** `src/components/collaboration/user-cursor.tsx`

**Technical Requirements:**
```typescript
interface UserCursorProps {
  userId: string;
  userName: string;
  userColor: string;
  position: { x: number; y: number };
  isActive: boolean;
  interactionState?: CursorInteractionState;
}

// Visual design:
// - Cursor icon (customized)
// - Name label (follows cursor)
// - User color accent
// - Smooth movement
// - Fade in/out
// - State indicators
```

**Implementation Details:**
- CSS transforms for performance
- Throttled position updates
- Hide when inactive (5s)
- Different cursor states
- Avoid label collisions
- Z-index management

**Acceptance Criteria:**
- [ ] Smooth cursor movement
- [ ] Name labels readable
- [ ] Color coding works
- [ ] Performance optimized
- [ ] States distinguishable
- [ ] No visual glitches

#### 3.3.3 NodeSelectionIndicator Component
**File:** `src/components/collaboration/node-selection-indicator.tsx`

**Technical Requirements:**
```typescript
interface NodeSelectionIndicatorProps {
  nodeId: string;
  selections: NodeSelection[];
  currentUserId: string;
}

// Visual indicators:
// - Colored border (user color)
// - Avatar badge on node
// - Lock icon if editing
// - Queue indicator
// - Pulse animation
// - Conflict warnings
```

**Implementation Details:**
- Overlay on ReactFlow nodes
- Non-intrusive design
- Clear visual hierarchy
- Handle multiple selections
- Animate state changes
- Click to request control

**Acceptance Criteria:**
- [ ] Clear selection visibility
- [ ] User colors consistent
- [ ] Lock state obvious
- [ ] Queue position shown
- [ ] Animations smooth
- [ ] Conflicts handled

### 3.4 Activity Feed Components

#### 3.4.1 ActivityFeed Component
**File:** `src/components/collaboration/activity-feed.tsx`

**Technical Requirements:**
```typescript
interface ActivityFeedProps {
  mapId: string;
  filters?: ActivityFilters;
  maxItems?: number;
  showFilters?: boolean;
  compact?: boolean;
}

// Component structure:
// - Filter bar
//   - User filter
//   - Action type filter
//   - Date range
//   - Search box
// - Activity list
//   - Virtual scrolling
//   - Grouped by time
//   - Action previews
//   - User avatars
// - Load more button
// - Empty state
```

**Implementation Details:**
- Use react-window for virtualization
- Group similar actions
- Relative timestamps
- Action icons
- Preview generation
- Smooth loading

**Acceptance Criteria:**
- [ ] Filters work correctly
- [ ] Virtual scroll performs
- [ ] Actions grouped well
- [ ] Previews helpful
- [ ] Search functional
- [ ] Mobile optimized

#### 3.4.2 ActivityItem Component
**File:** `src/components/collaboration/activity-item.tsx`

**Technical Requirements:**
```typescript
interface ActivityItemProps {
  activity: ActivityItem;
  isCompact?: boolean;
  showPreview?: boolean;
  onUserClick?: (userId: string) => void;
  onTargetClick?: (targetId: string) => void;
}

// Visual elements:
// - User avatar
// - Action description
// - Timestamp
// - Content preview
// - Target link
// - Hover effects
```

**Implementation Details:**
- Smart action descriptions
- Truncated previews
- Clickable elements
- Time formatting
- Icon mapping
- Hover states

**Acceptance Criteria:**
- [ ] Descriptions clear
- [ ] Previews useful
- [ ] Links work
- [ ] Time formats nice
- [ ] Icons meaningful
- [ ] Accessible

## Phase 4: Real-time Infrastructure (Week 4-5)

### 4.1 Supabase Real-time Setup

#### 4.1.1 Presence Channel Configuration
**File:** `src/lib/realtime/presence-manager.ts`

**Technical Requirements:**
```typescript
class PresenceManager {
  private channel: RealtimeChannel | null = null;
  private presenceState: Record<string, any> = {};
  
  async joinMap(mapId: string, userId: string, userInfo: any) {
    // 1. Create presence channel
    this.channel = supabase.channel(`presence:map:${mapId}`, {
      config: {
        presence: {
          key: userId,
        },
      },
    });
    
    // 2. Set up event handlers
    this.channel
      .on('presence', { event: 'sync' }, () => {
        this.presenceState = this.channel.presenceState();
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        // Handle user join
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        // Handle user leave
      });
    
    // 3. Track presence
    await this.channel.track({
      user_id: userId,
      ...userInfo,
      online_at: new Date().toISOString(),
    });
    
    // 4. Subscribe
    await this.channel.subscribe();
  }
  
  async updateCursor(position: { x: number; y: number }) {
    // Throttled cursor updates
  }
  
  async leaveMap() {
    await this.channel?.untrack();
    await this.channel?.unsubscribe();
  }
}
```

**Acceptance Criteria:**
- [ ] Channel creation works
- [ ] Presence sync reliable
- [ ] Join/leave events fire
- [ ] State updates properly
- [ ] Cleanup on unmount
- [ ] Error handling robust

#### 4.1.2 Broadcast Channel Setup
**File:** `src/lib/realtime/broadcast-manager.ts`

**Technical Requirements:**
```typescript
class BroadcastManager {
  private channel: RealtimeChannel | null = null;
  private subscribers: Map<string, Function> = new Map();
  
  async joinMap(mapId: string) {
    // 1. Create broadcast channel
    this.channel = supabase.channel(`broadcast:map:${mapId}`);
    
    // 2. Set up event handlers
    this.channel
      .on('broadcast', { event: 'cursor_move' }, (payload) => {
        this.notifySubscribers('cursor_move', payload);
      })
      .on('broadcast', { event: 'node_select' }, (payload) => {
        this.notifySubscribers('node_select', payload);
      })
      .on('broadcast', { event: 'content_change' }, (payload) => {
        this.notifySubscribers('content_change', payload);
      });
    
    // 3. Subscribe
    await this.channel.subscribe();
  }
  
  async broadcast(event: string, payload: any) {
    await this.channel?.send({
      type: 'broadcast',
      event,
      payload,
    });
  }
}
```

**Acceptance Criteria:**
- [ ] Broadcast send works
- [ ] Events received properly
- [ ] Subscription management
- [ ] Payload validation
- [ ] Performance acceptable
- [ ] Reconnection handled

### 4.2 Cursor Tracking Implementation

#### 4.2.1 Cursor Position Manager
**File:** `src/hooks/use-cursor-tracking.ts`

**Technical Requirements:**
```typescript
export function useCursorTracking(mapId: string) {
  const [cursors, setCursors] = useState<Map<string, UserCursor>>();
  const broadcastManager = useRef<BroadcastManager>();
  const throttledUpdate = useRef<Function>();
  
  useEffect(() => {
    // 1. Initialize throttled update (60ms)
    throttledUpdate.current = throttle((position: Point) => {
      broadcastManager.current?.broadcast('cursor_move', {
        user_id: currentUser.id,
        position,
        viewport: getViewport(),
        timestamp: Date.now(),
      });
    }, 60);
    
    // 2. Set up mouse tracking
    const handleMouseMove = (e: MouseEvent) => {
      const position = screenToCanvas({ x: e.clientX, y: e.clientY });
      throttledUpdate.current?.(position);
    };
    
    // 3. Subscribe to cursor updates
    broadcastManager.current?.subscribe('cursor_move', (data) => {
      setCursors(prev => {
        const next = new Map(prev);
        next.set(data.user_id, {
          ...data,
          lastUpdate: Date.now(),
        });
        return next;
      });
    });
    
    // 4. Clean up stale cursors
    const cleanup = setInterval(() => {
      setCursors(prev => {
        const next = new Map(prev);
        const now = Date.now();
        for (const [userId, cursor] of next) {
          if (now - cursor.lastUpdate > 5000) {
            next.delete(userId);
          }
        }
        return next;
      });
    }, 1000);
    
    return () => {
      clearInterval(cleanup);
    };
  }, [mapId]);
  
  return { cursors, updateCursor: throttledUpdate.current };
}
```

**Acceptance Criteria:**
- [ ] Throttling works (60ms)
- [ ] Position transforms correct
- [ ] Stale cursors removed
- [ ] Memory leaks prevented
- [ ] Performance optimized
- [ ] Smooth updates

#### 4.2.2 Cursor Rendering System
**File:** `src/components/collaboration/cursor-layer.tsx`

**Technical Requirements:**
```typescript
interface CursorLayerProps {
  cursors: Map<string, UserCursor>;
  viewport: Viewport;
  currentUserId: string;
}

export function CursorLayer({ cursors, viewport, currentUserId }: CursorLayerProps) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from(cursors.entries()).map(([userId, cursor]) => {
        if (userId === currentUserId) return null;
        
        const screenPos = canvasToScreen(cursor.position, viewport);
        const isInViewport = isPositionInViewport(screenPos, viewport);
        
        if (!isInViewport) return null;
        
        return (
          <UserCursor
            key={userId}
            userId={userId}
            userName={cursor.user.name}
            userColor={cursor.user.color}
            position={screenPos}
            isActive={Date.now() - cursor.lastUpdate < 5000}
            interactionState={cursor.interaction_state}
          />
        );
      })}
    </div>
  );
}
```

**Acceptance Criteria:**
- [ ] Only visible cursors render
- [ ] Position math correct
- [ ] Smooth animations
- [ ] No performance issues
- [ ] Proper layering
- [ ] Clean unmounting

### 4.3 Conflict Resolution

#### 4.3.1 Node Lock Manager
**File:** `src/lib/collaboration/lock-manager.ts`

**Technical Requirements:**
```typescript
class NodeLockManager {
  private locks: Map<string, NodeLock> = new Map();
  private queue: Map<string, string[]> = new Map();
  
  async requestLock(nodeId: string, userId: string): Promise<LockResult> {
    // 1. Check current lock
    const currentLock = this.locks.get(nodeId);
    
    if (!currentLock || currentLock.expiresAt < Date.now()) {
      // 2. Grant lock
      const lock: NodeLock = {
        nodeId,
        userId,
        acquiredAt: Date.now(),
        expiresAt: Date.now() + 30000, // 30 seconds
      };
      
      this.locks.set(nodeId, lock);
      
      // 3. Broadcast lock acquired
      await this.broadcast('lock_acquired', { nodeId, userId });
      
      return { success: true, lock };
    }
    
    // 4. Add to queue
    const queue = this.queue.get(nodeId) || [];
    if (!queue.includes(userId)) {
      queue.push(userId);
      this.queue.set(nodeId, queue);
    }
    
    return {
      success: false,
      currentHolder: currentLock.userId,
      queuePosition: queue.indexOf(userId) + 1,
    };
  }
  
  async releaseLock(nodeId: string, userId: string): Promise<void> {
    const lock = this.locks.get(nodeId);
    
    if (lock?.userId === userId) {
      this.locks.delete(nodeId);
      
      // Grant to next in queue
      const queue = this.queue.get(nodeId) || [];
      if (queue.length > 0) {
        const nextUser = queue.shift()!;
        await this.requestLock(nodeId, nextUser);
      }
      
      await this.broadcast('lock_released', { nodeId, userId });
    }
  }
}
```

**Acceptance Criteria:**
- [ ] Lock acquisition works
- [ ] Queue management correct
- [ ] Expiration handled
- [ ] Broadcast updates sent
- [ ] Race conditions prevented
- [ ] Fair queue ordering

#### 4.3.2 Conflict Resolution UI
**File:** `src/components/collaboration/conflict-modal.tsx`

**Technical Requirements:**
```typescript
interface ConflictModalProps {
  isOpen: boolean;
  conflictType: 'edit_conflict' | 'sync_conflict';
  nodeId: string;
  currentHolder: ActiveUser;
  queuePosition?: number;
  onResolve: (action: 'wait' | 'force' | 'cancel') => void;
}

// Modal content:
// - Clear conflict explanation
// - Current editor info
// - Queue position (if waiting)
// - Action buttons:
//   - Wait in queue
//   - Request control
//   - Cancel edit
// - Auto-close on resolution
```

**Implementation Details:**
- Clear messaging
- User avatar/name shown
- Queue updates real-time
- Timeout warnings
- Smooth transitions
- Keyboard shortcuts

**Acceptance Criteria:**
- [ ] Message clarity good
- [ ] Queue updates live
- [ ] Actions work properly
- [ ] Auto-close works
- [ ] Accessible design
- [ ] Mobile responsive

## Phase 5: Performance & Optimization (Week 5-6)

### 5.1 Cursor Performance Optimization

#### 5.1.1 Spatial Indexing System
**File:** `src/lib/performance/spatial-index.ts`

**Technical Requirements:**
```typescript
class SpatialIndex {
  private quadTree: QuadTree;
  private viewportBuffer: number = 200; // pixels
  
  constructor(bounds: Bounds) {
    this.quadTree = new QuadTree(bounds, {
      maxObjects: 10,
      maxLevels: 5,
    });
  }
  
  insert(cursor: UserCursor): void {
    this.quadTree.insert({
      x: cursor.position.x,
      y: cursor.position.y,
      width: 1,
      height: 1,
      data: cursor,
    });
  }
  
  getVisibleCursors(viewport: Viewport): UserCursor[] {
    const bounds = {
      x: viewport.x - this.viewportBuffer,
      y: viewport.y - this.viewportBuffer,
      width: viewport.width + this.viewportBuffer * 2,
      height: viewport.height + this.viewportBuffer * 2,
    };
    
    return this.quadTree.retrieve(bounds).map(item => item.data);
  }
  
  clear(): void {
    this.quadTree.clear();
  }
}
```

**Acceptance Criteria:**
- [ ] Spatial queries fast
- [ ] Memory usage acceptable
- [ ] Updates efficient
- [ ] No visual popping
- [ ] Buffer zone works
- [ ] Scales to 100+ cursors

#### 5.1.2 Render Optimization
**File:** `src/hooks/use-optimized-cursors.ts`

**Technical Requirements:**
```typescript
export function useOptimizedCursors(cursors: Map<string, UserCursor>, viewport: Viewport) {
  const [visibleCursors, setVisibleCursors] = useState<UserCursor[]>([]);
  const spatialIndex = useRef(new SpatialIndex(getMapBounds()));
  const rafId = useRef<number>();
  
  useEffect(() => {
    const updateVisibleCursors = () => {
      // 1. Rebuild spatial index
      spatialIndex.current.clear();
      for (const cursor of cursors.values()) {
        spatialIndex.current.insert(cursor);
      }
      
      // 2. Query visible cursors
      const visible = spatialIndex.current.getVisibleCursors(viewport);
      
      // 3. Only update if changed
      setVisibleCursors(prev => {
        if (prev.length !== visible.length) return visible;
        
        const prevIds = new Set(prev.map(c => c.user_id));
        const visibleIds = new Set(visible.map(c => c.user_id));
        
        if (!areSetsEqual(prevIds, visibleIds)) return visible;
        
        return prev;
      });
    };
    
    // 4. Use RAF for smooth updates
    const animate = () => {
      updateVisibleCursors();
      rafId.current = requestAnimationFrame(animate);
    };
    
    rafId.current = requestAnimationFrame(animate);
    
    return () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, [cursors, viewport]);
  
  return visibleCursors;
}
```

**Acceptance Criteria:**
- [ ] 60 FPS maintained
- [ ] No unnecessary renders
- [ ] Smooth panning
- [ ] Memory stable
- [ ] CPU usage low
- [ ] Scales well

### 5.2 Activity Feed Performance

#### 5.2.1 Virtual Scrolling Implementation
**File:** `src/components/collaboration/virtual-activity-feed.tsx`

**Technical Requirements:**
```typescript
import { VariableSizeList } from 'react-window';

interface VirtualActivityFeedProps {
  activities: ActivityItem[];
  itemHeight: (index: number) => number;
  onLoadMore: () => void;
}

export function VirtualActivityFeed({ activities, itemHeight, onLoadMore }: VirtualActivityFeedProps) {
  const listRef = useRef<VariableSizeList>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // Row renderer
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const activity = activities[index];
    
    // Trigger load more when near bottom
    if (index === activities.length - 5 && !isLoadingMore) {
      setIsLoadingMore(true);
      onLoadMore();
    }
    
    return (
      <div style={style}>
        <ActivityItem
          activity={activity}
          isCompact={true}
          showPreview={index < 20} // Only show preview for recent items
        />
      </div>
    );
  };
  
  // Handle dynamic heights
  const getItemSize = (index: number) => {
    return itemHeight(index);
  };
  
  // Reset cache on data change
  useEffect(() => {
    listRef.current?.resetAfterIndex(0);
  }, [activities]);
  
  return (
    <VariableSizeList
      ref={listRef}
      height={400}
      width="100%"
      itemCount={activities.length}
      itemSize={getItemSize}
      overscanCount={5}
    >
      {Row}
    </VariableSizeList>
  );
}
```

**Acceptance Criteria:**
- [ ] Smooth scrolling
- [ ] No lag with 1000+ items
- [ ] Load more works
- [ ] Heights calculated correctly
- [ ] Memory usage stable
- [ ] Accessibility maintained

#### 5.2.2 Activity Grouping Algorithm
**File:** `src/lib/activity/activity-grouper.ts`

**Technical Requirements:**
```typescript
interface GroupedActivity {
  id: string;
  type: 'single' | 'grouped';
  activities: ActivityItem[];
  summary: string;
  timestamp: string;
  user: User;
}

export class ActivityGrouper {
  private groupingWindow = 5 * 60 * 1000; // 5 minutes
  private similarityThreshold = 0.8;
  
  groupActivities(activities: ActivityItem[]): GroupedActivity[] {
    const groups: GroupedActivity[] = [];
    let currentGroup: ActivityItem[] = [];
    
    for (const activity of activities) {
      if (currentGroup.length === 0) {
        currentGroup.push(activity);
        continue;
      }
      
      const lastActivity = currentGroup[currentGroup.length - 1];
      
      // Check if should group
      if (this.shouldGroup(lastActivity, activity)) {
        currentGroup.push(activity);
      } else {
        // Finalize current group
        groups.push(this.createGroup(currentGroup));
        currentGroup = [activity];
      }
    }
    
    // Don't forget last group
    if (currentGroup.length > 0) {
      groups.push(this.createGroup(currentGroup));
    }
    
    return groups;
  }
  
  private shouldGroup(a: ActivityItem, b: ActivityItem): boolean {
    // Same user
    if (a.user_id !== b.user_id) return false;
    
    // Within time window
    const timeDiff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (timeDiff > this.groupingWindow) return false;
    
    // Similar action
    if (a.action_type !== b.action_type) return false;
    
    // Same target type
    if (a.target_type !== b.target_type) return false;
    
    return true;
  }
  
  private createGroup(activities: ActivityItem[]): GroupedActivity {
    if (activities.length === 1) {
      return {
        id: activities[0].id,
        type: 'single',
        activities,
        summary: activities[0].change_summary || '',
        timestamp: activities[0].created_at,
        user: activities[0].user!,
      };
    }
    
    return {
      id: `group-${activities[0].id}`,
      type: 'grouped',
      activities,
      summary: this.generateSummary(activities),
      timestamp: activities[activities.length - 1].created_at,
      user: activities[0].user!,
    };
  }
  
  private generateSummary(activities: ActivityItem[]): string {
    const count = activities.length;
    const action = activities[0].action_type;
    const target = activities[0].target_type;
    
    return `${count} ${target}s ${action.replace('_', ' ')}`;
  }
}
```

**Acceptance Criteria:**
- [ ] Groups similar actions
- [ ] Time window respected
- [ ] Summaries clear
- [ ] Performance good
- [ ] Edge cases handled
- [ ] Expandable groups

## Phase 6: Security & Validation (Week 6)

### 6.1 Input Validation & Sanitization

#### 6.1.1 Room Code Validation
**File:** `src/lib/validation/room-code-validator.ts`

**Technical Requirements:**
```typescript
export class RoomCodeValidator {
  private static readonly VALID_PATTERN = /^[A-Z0-9]{3}-[A-Z0-9]{3}$/;
  private static readonly BLOCKED_PATTERNS = [
    /ASS|FCK|SHT|XXX|666|WTF|DIE|KKK/,
    // Add more inappropriate patterns
  ];
  
  static validate(code: string): ValidationResult {
    // 1. Format validation
    const formatted = code.toUpperCase().trim();
    if (!this.VALID_PATTERN.test(formatted)) {
      return {
        isValid: false,
        error: 'Invalid format. Use XXX-XXX',
      };
    }
    
    // 2. Content filtering
    for (const pattern of this.BLOCKED_PATTERNS) {
      if (pattern.test(formatted.replace('-', ''))) {
        return {
          isValid: false,
          error: 'Invalid code generated. Please try again.',
          shouldRegenerate: true,
        };
      }
    }
    
    return { isValid: true, formatted };
  }
  
  static sanitize(code: string): string {
    return code
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 6);
  }
}
```

**Acceptance Criteria:**
- [ ] Format validation works
- [ ] Inappropriate codes blocked
- [ ] Clear error messages
- [ ] Sanitization correct
- [ ] No false positives
- [ ] Performance fast

#### 6.1.2 Display Name Sanitization
**File:** `src/lib/validation/display-name-validator.ts`

**Technical Requirements:**
```typescript
import DOMPurify from 'isomorphic-dompurify';
import Filter from 'bad-words';

export class DisplayNameValidator {
  private static filter = new Filter();
  private static readonly MAX_LENGTH = 50;
  private static readonly MIN_LENGTH = 1;
  
  static validate(name: string): ValidationResult {
    // 1. Length check
    const trimmed = name.trim();
    if (trimmed.length < this.MIN_LENGTH) {
      return {
        isValid: false,
        error: 'Name is required',
      };
    }
    
    if (trimmed.length > this.MAX_LENGTH) {
      return {
        isValid: false,
        error: `Name must be ${this.MAX_LENGTH} characters or less`,
      };
    }
    
    // 2. Profanity check
    if (this.filter.isProfane(trimmed)) {
      return {
        isValid: false,
        error: 'Please choose an appropriate name',
      };
    }
    
    // 3. XSS prevention
    const sanitized = DOMPurify.sanitize(trimmed, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
    });
    
    if (sanitized !== trimmed) {
      return {
        isValid: false,
        error: 'Name contains invalid characters',
      };
    }
    
    // 4. Check for spam patterns
    if (this.isSpamName(trimmed)) {
      return {
        isValid: false,
        error: 'Please choose a different name',
      };
    }
    
    return { isValid: true, sanitized };
  }
  
  private static isSpamName(name: string): boolean {
    const spamPatterns = [
      /^user\d{6,}$/i, // user123456
      /^[a-z]{20,}$/i, // aaaaaaaaaaaaaaaaaaa
      /^test\d*$/i,    // test, test1, test123
      /(buy|sell|click|visit|free|win)/i,
    ];
    
    return spamPatterns.some(pattern => pattern.test(name));
  }
}
```

**Acceptance Criteria:**
- [ ] Length limits enforced
- [ ] Profanity filtered
- [ ] XSS prevented
- [ ] Spam patterns blocked
- [ ] Unicode handled
- [ ] Clear error messages

### 6.2 Rate Limiting & Abuse Prevention

#### 6.2.1 Rate Limiter Implementation
**File:** `src/lib/security/rate-limiter.ts`

**Technical Requirements:**
```typescript
import { LRUCache } from 'lru-cache';

interface RateLimiterOptions {
  windowMs: number;
  max: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  keyGenerator?: (req: Request) => string;
}

export class RateLimiter {
  private cache: LRUCache<string, number[]>;
  
  constructor(private options: RateLimiterOptions) {
    this.cache = new LRUCache({
      max: 10000, // Max unique keys
      ttl: options.windowMs,
    });
  }
  
  async checkLimit(request: Request): Promise<RateLimitResult> {
    const key = this.options.keyGenerator?.(request) || this.getDefaultKey(request);
    const now = Date.now();
    const windowStart = now - this.options.windowMs;
    
    // Get existing requests
    let requests = this.cache.get(key) || [];
    
    // Filter out old requests
    requests = requests.filter(timestamp => timestamp > windowStart);
    
    // Check if limit exceeded
    if (requests.length >= this.options.max) {
      const oldestRequest = Math.min(...requests);
      const resetTime = oldestRequest + this.options.windowMs;
      
      return {
        allowed: false,
        limit: this.options.max,
        remaining: 0,
        reset: new Date(resetTime),
        message: this.options.message || 'Too many requests',
      };
    }
    
    // Add current request
    requests.push(now);
    this.cache.set(key, requests);
    
    return {
      allowed: true,
      limit: this.options.max,
      remaining: this.options.max - requests.length,
      reset: new Date(now + this.options.windowMs),
    };
  }
  
  private getDefaultKey(request: Request): string {
    // Try to get IP from headers
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ip = forwarded?.split(',')[0] || realIp || 'unknown';
    
    // Include user ID if authenticated
    const userId = request.headers.get('x-user-id') || 'anonymous';
    
    return `${ip}:${userId}`;
  }
}

// Specific rate limiters
export const joinRoomLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 attempts per minute
  message: 'Too many join attempts. Please try again later.',
});

export const createRoomLimiter = new RateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 rooms per hour
  message: 'Room creation limit reached. Please try again later.',
});

export const apiGeneralLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'API rate limit exceeded.',
});
```

**Acceptance Criteria:**
- [ ] Rate limits enforced
- [ ] Clear error messages
- [ ] Headers set correctly
- [ ] Memory efficient
- [ ] Configurable limits
- [ ] IP detection works

#### 6.2.2 Session Security
**File:** `src/lib/security/session-manager.ts`

**Technical Requirements:**
```typescript
import crypto from 'crypto';

export class SessionManager {
  private static readonly SESSION_SECRET = process.env.SESSION_SECRET!;
  private static readonly SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
  
  static generateSessionId(): string {
    return crypto.randomBytes(32).toString('hex');
  }
  
  static generateFingerprint(request: Request): string {
    const userAgent = request.headers.get('user-agent') || '';
    const acceptLanguage = request.headers.get('accept-language') || '';
    const acceptEncoding = request.headers.get('accept-encoding') || '';
    
    const fingerprint = `${userAgent}|${acceptLanguage}|${acceptEncoding}`;
    
    return crypto
      .createHash('sha256')
      .update(fingerprint)
      .digest('hex');
  }
  
  static createSecureToken(data: any): string {
    const payload = JSON.stringify({
      data,
      exp: Date.now() + this.SESSION_DURATION,
    });
    
    const signature = crypto
      .createHmac('sha256', this.SESSION_SECRET)
      .update(payload)
      .digest('hex');
    
    return Buffer.from(`${payload}.${signature}`).toString('base64');
  }
  
  static verifySecureToken(token: string): { valid: boolean; data?: any } {
    try {
      const decoded = Buffer.from(token, 'base64').toString();
      const [payload, signature] = decoded.split('.');
      
      const expectedSignature = crypto
        .createHmac('sha256', this.SESSION_SECRET)
        .update(payload)
        .digest('hex');
      
      if (signature !== expectedSignature) {
        return { valid: false };
      }
      
      const parsed = JSON.parse(payload);
      
      if (parsed.exp < Date.now()) {
        return { valid: false };
      }
      
      return { valid: true, data: parsed.data };
    } catch {
      return { valid: false };
    }
  }
  
  static validateGuestSession(
    sessionId: string,
    fingerprint: string,
    storedFingerprint: string
  ): boolean {
    // Allow some fingerprint flexibility for privacy extensions
    if (fingerprint === storedFingerprint) return true;
    
    // Check if core parts match (user agent)
    const currentParts = fingerprint.split('|');
    const storedParts = storedFingerprint.split('|');
    
    return currentParts[0] === storedParts[0]; // Same user agent
  }
}
```

**Acceptance Criteria:**
- [ ] Secure token generation
- [ ] Fingerprint validation
- [ ] Session expiration
- [ ] HMAC verification
- [ ] Privacy-friendly
- [ ] No timing attacks

### 6.3 Audit Logging

#### 6.3.1 Audit Logger Implementation
**File:** `src/lib/security/audit-logger.ts`

**Technical Requirements:**
```typescript
interface AuditLogEntry {
  event_type: string;
  user_id?: string;
  guest_id?: string;
  resource_type: string;
  resource_id: string;
  action: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

export class AuditLogger {
  static async log(
    supabase: SupabaseClient,
    entry: Omit<AuditLogEntry, 'timestamp'>
  ): Promise<void> {
    // Anonymize IP for GDPR
    const anonymizedIp = entry.ip_address 
      ? this.anonymizeIp(entry.ip_address)
      : null;
    
    await supabase.from('audit_logs').insert({
      ...entry,
      ip_address: anonymizedIp,
      timestamp: new Date().toISOString(),
    });
  }
  
  static async logBatch(
    supabase: SupabaseClient,
    entries: Omit<AuditLogEntry, 'timestamp'>[]
  ): Promise<void> {
    const timestamped = entries.map(entry => ({
      ...entry,
      ip_address: entry.ip_address ? this.anonymizeIp(entry.ip_address) : null,
      timestamp: new Date().toISOString(),
    }));
    
    await supabase.from('audit_logs').insert(timestamped);
  }
  
  private static anonymizeIp(ip: string): string {
    if (ip.includes(':')) {
      // IPv6: Keep first 3 segments
      const parts = ip.split(':');
      return parts.slice(0, 3).join(':') + '::/48';
    } else {
      // IPv4: Zero out last octet
      const parts = ip.split('.');
      parts[3] = '0';
      return parts.join('.');
    }
  }
}

// Audit event types
export const AuditEvents = {
  ROOM_CREATED: 'room.created',
  ROOM_JOINED: 'room.joined',
  ROOM_LEFT: 'room.left',
  GUEST_CREATED: 'guest.created',
  GUEST_CONVERTED: 'guest.converted',
  PERMISSION_CHANGED: 'permission.changed',
  SHARE_CREATED: 'share.created',
  SHARE_REVOKED: 'share.revoked',
  CONTENT_EDITED: 'content.edited',
  SUSPICIOUS_ACTIVITY: 'security.suspicious',
} as const;
```

**Acceptance Criteria:**
- [ ] GDPR compliant
- [ ] IP anonymization
- [ ] Batch logging works
- [ ] Event types comprehensive
- [ ] Metadata flexible
- [ ] Query performance good

## Phase 7: Testing Strategy (Week 7)

### 7.1 Unit Tests

#### 7.1.1 Token Generation Tests
**File:** `src/__tests__/lib/token-generator.test.ts`

**Test Cases:**
```typescript
describe('TokenGenerator', () => {
  describe('generateRoomCode', () => {
    it('should generate 6-character codes', () => {
      const code = generateRoomCode();
      expect(code).toMatch(/^[A-Z0-9]{3}-[A-Z0-9]{3}$/);
    });
    
    it('should generate unique codes', () => {
      const codes = new Set();
      for (let i = 0; i < 1000; i++) {
        codes.add(generateRoomCode());
      }
      expect(codes.size).toBe(1000);
    });
    
    it('should not generate offensive codes', () => {
      // Mock random to generate known offensive pattern
      jest.spyOn(Math, 'random').mockReturnValue(0.123);
      const validator = new RoomCodeValidator();
      
      for (let i = 0; i < 100; i++) {
        const code = generateRoomCode();
        const result = validator.validate(code);
        expect(result.isValid).toBe(true);
      }
    });
  });
});
```

#### 7.1.2 Permission Tests
**File:** `src/__tests__/lib/permissions.test.ts`

**Test Cases:**
```typescript
describe('Permissions', () => {
  describe('checkUserMapPermission', () => {
    it('should allow owner all permissions', async () => {
      const result = await checkUserMapPermission(ownerId, mapId, 'edit');
      expect(result).toBe(true);
    });
    
    it('should respect role-based permissions', async () => {
      const viewer = await checkUserMapPermission(viewerId, mapId, 'edit');
      expect(viewer).toBe(false);
      
      const editor = await checkUserMapPermission(editorId, mapId, 'edit');
      expect(editor).toBe(true);
    });
    
    it('should handle expired shares', async () => {
      // Create expired share
      const result = await checkUserMapPermission(expiredUserId, mapId, 'view');
      expect(result).toBe(false);
    });
  });
});
```

### 7.2 Integration Tests

#### 7.2.1 Join Flow Integration Test
**File:** `src/__tests__/integration/join-flow.test.ts`

**Test Scenarios:**
```typescript
describe('Join Flow Integration', () => {
  it('should handle complete guest join flow', async () => {
    // 1. Create room code
    const createResponse = await request(app)
      .post('/api/share/create-room-code')
      .send({ map_id: testMapId, role: 'viewer' });
    
    expect(createResponse.status).toBe(200);
    const { token } = createResponse.body;
    
    // 2. Validate room code
    const validateResponse = await request(app)
      .get(`/api/share/validate-access/${token}`);
    
    expect(validateResponse.status).toBe(200);
    expect(validateResponse.body.is_valid).toBe(true);
    
    // 3. Create guest and join
    const joinResponse = await request(app)
      .post('/api/share/join-room')
      .send({
        token,
        guest_info: {
          display_name: 'Test Guest',
          session_id: 'test-session-123',
        },
      });
    
    expect(joinResponse.status).toBe(200);
    expect(joinResponse.body.is_guest).toBe(true);
    expect(joinResponse.body.permissions.role).toBe('viewer');
  });
  
  it('should convert guest to user on sign in', async () => {
    // Setup: Create guest session
    const guestSession = await createGuestSession();
    
    // Sign in
    const user = await signIn('test@example.com', 'password');
    
    // Handle conversion
    const conversionResponse = await request(app)
      .post('/api/share/handle-guest-signin')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        guest_session_id: guestSession.id,
        share_token: testToken,
        map_id: testMapId,
      });
    
    expect(conversionResponse.status).toBe(200);
    expect(conversionResponse.body.share_created).toBe(true);
    
    // Verify guest marked as converted
    const guest = await getGuestUser(guestSession.id);
    expect(guest.converted_user_id).toBe(user.id);
  });
});
```

### 7.3 End-to-End Tests

#### 7.3.1 Multi-User Collaboration Test
**File:** `src/__tests__/e2e/collaboration.test.ts`

**Test Scenarios:**
```typescript
describe('Multi-User Collaboration E2E', () => {
  it('should sync cursors between users', async () => {
    // User 1: Create and share map
    const { page: page1 } = await createUserSession('user1');
    await page1.goto('/dashboard');
    await createAndShareMap(page1, 'Test Map');
    const roomCode = await getRoomCode(page1);
    
    // User 2: Join with room code
    const { page: page2 } = await createUserSession('user2');
    await page2.goto('/join');
    await page2.fill('[data-testid="room-code-input"]', roomCode);
    await page2.click('[data-testid="join-button"]');
    
    // User 1: Move cursor
    await page1.mouse.move(300, 300);
    
    // User 2: Should see cursor
    await page2.waitForSelector('[data-testid="user-cursor-user1"]');
    const cursor = await page2.$('[data-testid="user-cursor-user1"]');
    const position = await cursor.boundingBox();
    
    expect(position.x).toBeCloseTo(300, 10);
    expect(position.y).toBeCloseTo(300, 10);
  });
});
```

## Phase 8: Documentation & Deployment (Week 8)

### 8.1 API Documentation

#### 8.1.1 OpenAPI Specification
**File:** `docs/api/sharing-collaboration-api.yaml`

```yaml
openapi: 3.0.0
info:
  title: Moistus AI Sharing & Collaboration API
  version: 1.0.0
  description: API for sharing mind maps and real-time collaboration

paths:
  /api/share/create-room-code:
    post:
      summary: Create a room code for sharing
      tags: [Sharing]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateRoomCodeRequest'
      responses:
        200:
          description: Room code created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/RoomCodeResponse'
                
components:
  schemas:
    CreateRoomCodeRequest:
      type: object
      required: [map_id]
      properties:
        map_id:
          type: string
          format: uuid
        role:
          type: string
          enum: [editor, commenter, viewer]
          default: viewer
        max_users:
          type: integer
          minimum: 1
          maximum: 100
          default: 50
```

### 8.2 User Documentation

#### 8.2.1 Sharing Guide
**File:** `docs/user-guide/sharing-collaboration.md`

```markdown
# Sharing & Collaboration Guide

## Quick Start: Share with Room Code

1. Open your mind map
2. Click the "Share" button in the toolbar
3. Select "Room Code" tab
4. Click "Generate Code"
5. Share the 6-character code (e.g., ABC-123)

## Joining a Shared Map

### As a Guest
1. Go to moistus.ai/join
2. Enter the room code
3. Choose a display name
4. Start collaborating!

### As a Registered User
1. Enter the room code at moistus.ai/join
2. Sign in when prompted
3. The map will be added to your dashboard

## Real-time Features

- **Live Cursors**: See where others are working
- **Activity Feed**: Track all changes
- **Presence Indicators**: Know who's online
- **Conflict Resolution**: Smart handling of simultaneous edits
```

## Summary

This detailed task breakdown now includes:

1. **Fixed RLS policies** using `(SELECT auth.uid())` syntax
2. **Guest-to-user conversion handling** when signing in during map preview
3. **Complete Section 6.2** with rate limiting, session security, and audit logging
4. **Additional sections** for testing, documentation, and deployment

The implementation handles all edge cases including guest conversion, permission inheritance, and security considerations.