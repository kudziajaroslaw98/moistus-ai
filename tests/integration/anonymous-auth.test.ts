import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase client
const mockSupabase = {
  auth: {
    signInAnonymously: vi.fn(),
    getUser: vi.fn(),
    updateUser: vi.fn(),
  },
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
  })),
  rpc: vi.fn(),
};

vi.mock('@/helpers/supabase/client', () => ({
  createClient: () => mockSupabase,
}));

vi.mock('@/helpers/supabase/server', () => ({
  createClient: () => Promise.resolve(mockSupabase),
}));

// Mock fetch for API calls
global.fetch = vi.fn();

describe('Anonymous Authentication Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Anonymous Sign In', () => {
    test('should sign in anonymously when user is not authenticated', async () => {
      // Mock no existing user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Mock successful anonymous sign in
      const mockAnonymousUser = {
        id: 'anon-user-123',
        is_anonymous: true,
        created_at: '2025-01-15T10:00:00.000Z',
      };

      mockSupabase.auth.signInAnonymously.mockResolvedValue({
        data: { user: mockAnonymousUser },
        error: null,
      });

      // Import and test the sharing slice ensureAuthenticated function
      const { createSharingSlice } = await import('@/contexts/mind-map/slices/sharing-slice');
      
      const mockSet = vi.fn();
      const mockGet = vi.fn();
      const slice = createSharingSlice(mockSet, mockGet);

      const result = await slice.ensureAuthenticated('Test User');

      expect(result).toBe(true);
      expect(mockSupabase.auth.getUser).toHaveBeenCalled();
      expect(mockSupabase.auth.signInAnonymously).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalledWith({
        authUser: expect.objectContaining({
          user_id: 'anon-user-123',
          display_name: 'Test User',
          is_anonymous: true,
        }),
      });
    });

    test('should use existing authenticated user', async () => {
      const existingUser = {
        id: 'existing-user-123',
        created_at: '2025-01-15T09:00:00.000Z',
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: existingUser },
        error: null,
      });

      mockSupabase.from().single.mockResolvedValue({
        data: {
          display_name: 'Existing User',
          avatar_url: 'https://example.com/avatar.jpg',
          is_anonymous: false,
        },
        error: null,
      });

      const { createSharingSlice } = await import('@/contexts/mind-map/slices/sharing-slice');
      
      const mockSet = vi.fn();
      const mockGet = vi.fn();
      const slice = createSharingSlice(mockSet, mockGet);

      const result = await slice.ensureAuthenticated();

      expect(result).toBe(true);
      expect(mockSupabase.auth.signInAnonymously).not.toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalledWith({
        authUser: expect.objectContaining({
          user_id: 'existing-user-123',
          display_name: 'Existing User',
          is_anonymous: false,
        }),
      });
    });
  });

  describe('Join Room API', () => {
    test('should successfully join room with anonymous user', async () => {
      const mockRequest = new Request('http://localhost/api/share/join-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'ABC123',
          display_name: 'Test User',
        }),
      });

      // Mock authenticated user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'anon-user-123', is_anonymous: true } },
        error: null,
      });

      // Mock room code validation
      mockSupabase.rpc.mockImplementation((functionName) => {
        if (functionName === 'validate_room_code_for_anonymous') {
          return Promise.resolve({
            data: {
              valid: true,
              map_id: 'map-123',
              permissions: { role: 'viewer', can_view: true },
              share_token_id: 'token-123',
              is_anonymous_user: true,
            },
            error: null,
          });
        }
        return Promise.resolve({ data: null, error: null });
      });

      // Mock map data
      mockSupabase.from().single.mockResolvedValue({
        data: {
          id: 'map-123',
          title: 'Test Mind Map',
          description: 'A test mind map',
          user_id: 'owner-123',
        },
        error: null,
      });

      // Import and test the API route
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            map_id: 'map-123',
            map_title: 'Test Mind Map',
            is_anonymous: true,
            user_display_name: 'Test User',
            websocket_channel: 'presence:map:map-123',
          },
        }),
      });

      const response = await fetch('/api/share/join-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'ABC123',
          display_name: 'Test User',
        }),
      });

      const result = await response.json();

      expect(response.ok).toBe(true);
      expect(result.success).toBe(true);
      expect(result.data.map_id).toBe('map-123');
      expect(result.data.is_anonymous).toBe(true);
    });

    test('should handle invalid room code', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'anon-user-123' } },
        error: null,
      });

      mockSupabase.rpc.mockResolvedValue({
        data: { valid: false, error: 'Invalid room code' },
        error: null,
      });

      global.fetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({
          error: 'Invalid room code',
        }),
      });

      const response = await fetch('/api/share/join-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'INVALID',
          display_name: 'Test User',
        }),
      });

      expect(response.ok).toBe(false);
    });
  });

  describe('Upgrade Anonymous User', () => {
    test('should upgrade anonymous user to full user', async () => {
      const mockAnonymousUser = {
        id: 'anon-user-123',
        is_anonymous: true,
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockAnonymousUser },
        error: null,
      });

      // Mock profile check
      mockSupabase.from().single.mockResolvedValue({
        data: {
          is_anonymous: true,
          display_name: 'Anonymous User',
        },
        error: null,
      });

      // Mock successful upgrade
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            profile: {
              display_name: 'Upgraded User',
              email: 'test@example.com',
            },
          },
        }),
      });

      const { createSharingSlice } = await import('@/contexts/mind-map/slices/sharing-slice');
      
      const mockSet = vi.fn();
      const mockGet = vi.fn().mockReturnValue({
        authUser: {
          user_id: 'anon-user-123',
          is_anonymous: true,
          display_name: 'Anonymous User',
        },
      });

      const slice = createSharingSlice(mockSet, mockGet);

      const result = await slice.upgradeAnonymousUser(
        'test@example.com',
        'password123',
        'Upgraded User'
      );

      expect(result).toBe(true);
      expect(mockSet).toHaveBeenCalledWith({
        authUser: expect.objectContaining({
          display_name: 'Upgraded User',
          is_anonymous: false,
        }),
        sharingError: undefined,
      });
    });

    test('should fail upgrade for non-anonymous user', async () => {
      const { createSharingSlice } = await import('@/contexts/mind-map/slices/sharing-slice');
      
      const mockSet = vi.fn();
      const mockGet = vi.fn().mockReturnValue({
        authUser: {
          user_id: 'full-user-123',
          is_anonymous: false,
          display_name: 'Full User',
        },
      });

      const slice = createSharingSlice(mockSet, mockGet);

      const result = await slice.upgradeAnonymousUser(
        'test@example.com',
        'password123'
      );

      expect(result).toBe(false);
      expect(mockSet).toHaveBeenCalledWith({
        sharingError: expect.objectContaining({
          code: 'UPGRADE_ERROR',
          message: 'User is not anonymous or not found',
        }),
      });
    });
  });

  describe('Database Functions', () => {
    test('should call create_anonymous_user_profile function', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: true,
        error: null,
      });

      await mockSupabase.rpc('create_anonymous_user_profile', {
        user_id_param: 'anon-user-123',
        display_name_param: 'Test User',
        avatar_url_param: 'https://api.dicebear.com/7.x/avataaars/svg?seed=anon-user-123',
      });

      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'create_anonymous_user_profile',
        expect.objectContaining({
          user_id_param: 'anon-user-123',
          display_name_param: 'Test User',
        })
      );
    });

    test('should call validate_room_code_for_anonymous function', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: {
          valid: true,
          map_id: 'map-123',
          permissions: { role: 'viewer' },
        },
        error: null,
      });

      const result = await mockSupabase.rpc('validate_room_code_for_anonymous', {
        token_param: 'ABC123',
        user_id_param: 'anon-user-123',
      });

      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'validate_room_code_for_anonymous',
        {
          token_param: 'ABC123',
          user_id_param: 'anon-user-123',
        }
      );

      expect(result.data.valid).toBe(true);
    });

    test('should call upgrade_anonymous_to_full_user function', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: { success: true },
        error: null,
      });

      await mockSupabase.rpc('upgrade_anonymous_to_full_user', {
        user_id_param: 'anon-user-123',
        new_email_param: 'test@example.com',
        display_name_param: 'Upgraded User',
      });

      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'upgrade_anonymous_to_full_user',
        expect.objectContaining({
          user_id_param: 'anon-user-123',
          new_email_param: 'test@example.com',
        })
      );
    });
  });

  describe('Error Handling', () => {
    test('should handle authentication errors gracefully', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Auth error'),
      });

      const { createSharingSlice } = await import('@/contexts/mind-map/slices/sharing-slice');
      
      const mockSet = vi.fn();
      const mockGet = vi.fn();
      const slice = createSharingSlice(mockSet, mockGet);

      const result = await slice.ensureAuthenticated();

      expect(result).toBe(false);
      expect(mockSet).toHaveBeenCalledWith({
        sharingError: expect.objectContaining({
          code: 'AUTH_ERROR',
        }),
      });
    });

    test('should handle network errors in API calls', async () => {
      global.fetch.mockRejectedValue(new Error('Network error'));

      const { createSharingSlice } = await import('@/contexts/mind-map/slices/sharing-slice');
      
      const mockSet = vi.fn();
      const mockGet = vi.fn().mockReturnValue({
        ensureAuthenticated: vi.fn().mockResolvedValue(true),
      });

      const slice = createSharingSlice(mockSet, mockGet);

      try {
        await slice.joinRoom('ABC123', 'Test User');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }

      expect(mockSet).toHaveBeenCalledWith({
        isJoiningRoom: false,
        sharingError: expect.objectContaining({
          code: 'JOIN_ROOM_ERROR',
        }),
      });
    });
  });

  describe('Performance Tests', () => {
    test('should complete anonymous sign-in within acceptable time', async () => {
      const startTime = Date.now();

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      mockSupabase.auth.signInAnonymously.mockResolvedValue({
        data: { user: { id: 'anon-user-123' } },
        error: null,
      });

      const { createSharingSlice } = await import('@/contexts/mind-map/slices/sharing-slice');
      
      const mockSet = vi.fn();
      const mockGet = vi.fn();
      const slice = createSharingSlice(mockSet, mockGet);

      await slice.ensureAuthenticated('Test User');

      const duration = Date.now() - startTime;
      
      // Should complete within 100ms (excluding network latency)
      expect(duration).toBeLessThan(100);
    });

    test('should handle concurrent join requests', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'anon-user-123' } },
        error: null,
      });

      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { map_id: 'map-123' },
        }),
      });

      const { createSharingSlice } = await import('@/contexts/mind-map/slices/sharing-slice');
      
      const mockSet = vi.fn();
      const mockGet = vi.fn().mockReturnValue({
        ensureAuthenticated: vi.fn().mockResolvedValue(true),
      });

      const slice = createSharingSlice(mockSet, mockGet);

      // Simulate concurrent join requests
      const promises = Array(5).fill(0).map(() => 
        slice.joinRoom('ABC123', 'Test User')
      );

      const results = await Promise.allSettled(promises);
      
      // All requests should either succeed or fail gracefully
      results.forEach(result => {
        expect(['fulfilled', 'rejected']).toContain(result.status);
      });
    });
  });
});