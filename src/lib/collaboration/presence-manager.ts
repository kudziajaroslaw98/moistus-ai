import { createClient } from '@/helpers/supabase/client';
import { 
  PresenceStatus, 
  UserPresenceData, 
  PresenceCallbacks,
  PresenceChannelConfig,
  PresenceChannelState,
  PresenceEvent,
  CreatePresenceRequest,
  UpdatePresenceRequest
} from '@/types/presence-types';

export class PresenceManager {
  private supabase = createClient();
  private channel: any = null;
  private config: PresenceChannelConfig;
  private state: PresenceChannelState;
  private callbacks: PresenceCallbacks;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private inactivityTimer: NodeJS.Timeout | null = null;
  private lastActivity: number = Date.now();

  constructor(config: PresenceChannelConfig, callbacks: PresenceCallbacks = {}) {
    this.config = config;
    this.callbacks = callbacks;
    this.state = {
      connected_users: new Map(),
      local_user: this.createInitialPresenceData(),
      is_connected: false,
      last_heartbeat: 0,
      connection_quality: 'disconnected'
    };

    this.setupActivityTracking();
  }

  private createInitialPresenceData(): UserPresenceData {
    return {
      user_id: this.config.user_id,
      map_id: this.config.map_id,
      status: 'offline',
      cursor: { x: 0, y: 0, timestamp: Date.now() },
      viewport: { x: 0, y: 0, zoom: 1, width: 0, height: 0 },
      last_activity: Date.now(),
      session_id: crypto.randomUUID(),
      user_color: this.generateUserColor(this.config.user_id),
      interaction_state: 'idle'
    };
  }

  private generateUserColor(userId: string): string {
    const colors = [
      '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
      '#06B6D4', '#F97316', '#84CC16', '#EC4899', '#6366F1',
      '#14B8A6', '#F472B6', '#A855F7', '#2DD4BF', '#FB923C'
    ];
    
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  private setupActivityTracking(): void {
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'click'];
    
    const updateActivity = () => {
      this.lastActivity = Date.now();
      this.updateStatus('active');
      this.resetInactivityTimer();
    };

    events.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });

    this.resetInactivityTimer();
  }

  private resetInactivityTimer(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }

    this.inactivityTimer = setTimeout(() => {
      this.updateStatus('idle');
      
      setTimeout(() => {
        this.updateStatus('away');
      }, 5 * 60 * 1000); // 5 minutes after idle
      
    }, 5 * 60 * 1000); // 5 minutes to idle
  }

  async connect(): Promise<void> {
    try {
      this.channel = this.supabase.channel(`presence-${this.config.map_id}`, {
        config: {
          presence: {
            key: this.config.user_id
          }
        }
      });

      this.channel
        .on('presence', { event: 'sync' }, this.handlePresenceSync.bind(this))
        .on('presence', { event: 'join' }, this.handlePresenceJoin.bind(this))
        .on('presence', { event: 'leave' }, this.handlePresenceLeave.bind(this))
        .subscribe(async (status: string) => {
          if (status === 'SUBSCRIBED') {
            this.state.is_connected = true;
            this.state.connection_quality = 'excellent';
            this.callbacks.onConnectionChange?.(true);
            
            await this.joinPresence();
            this.startHeartbeat();
          } else {
            throw new Error(`Failed to subscribe: ${status}`);
          }
        });

    } catch (error) {
      console.error('Failed to connect presence:', error);
      this.state.connection_quality = 'disconnected';
      this.callbacks.onConnectionChange?.(false);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.channel) {
      await this.updateStatus('offline');
      await this.channel.unsubscribe();
      this.channel = null;
    }

    this.stopHeartbeat();
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }

    this.state.is_connected = false;
    this.state.connection_quality = 'disconnected';
    this.state.connected_users.clear();
    this.callbacks.onConnectionChange?.(false);
  }

  private async joinPresence(): Promise<void> {
    if (!this.channel) return;

    const { data: user } = await this.supabase.auth.getUser();
    if (!user.user) return;

    const presenceData = {
      user_id: this.config.user_id,
      name: user.user.user_metadata?.display_name || user.user.email || '',
      email: user.user.email || '',
      avatar_url: user.user.user_metadata?.avatar_url,
      status: 'active',
      user_color: this.state.local_user.user_color,
      last_activity: new Date().toISOString(),
      session_id: this.state.local_user.session_id
    };

    await this.channel.track(presenceData);
    this.state.local_user.status = 'active';
  }

  private handlePresenceSync(): void {
    if (!this.channel) return;

    const presenceState = this.channel.presenceState();
    const newUsers = new Map<string, UserPresenceData>();

    Object.keys(presenceState).forEach(userId => {
      const presence = presenceState[userId];
      if (presence && presence.length > 0) {
        const userPresence = presence[0];
        newUsers.set(userId, this.transformPresenceData(userPresence));
      }
    });

    this.state.connected_users = newUsers;
    
    const event: PresenceEvent = {
      type: 'sync',
      users: Array.from(newUsers.values()),
      timestamp: Date.now()
    };
    
    this.callbacks.onPresenceUpdate?.(event);
  }

  private handlePresenceJoin({ key, newPresences }: any): void {
    if (newPresences && newPresences.length > 0) {
      const userPresence = this.transformPresenceData(newPresences[0]);
      this.state.connected_users.set(key, userPresence);
      
      const event: PresenceEvent = {
        type: 'join',
        user: userPresence,
        timestamp: Date.now()
      };
      
      this.callbacks.onUserJoin?.(event);
    }
  }

  private handlePresenceLeave({ key, leftPresences }: any): void {
    this.state.connected_users.delete(key);
    
    const event: PresenceEvent = {
      type: 'leave',
      user_id: key,
      timestamp: Date.now()
    };
    
    this.callbacks.onUserLeave?.(event);
  }

  private transformPresenceData(presence: any): UserPresenceData {
    return {
      user_id: presence.user_id || presence.key,
      map_id: this.config.map_id,
      status: presence.status || 'active',
      cursor: presence.cursor || { x: 0, y: 0, timestamp: Date.now() },
      viewport: presence.viewport || { x: 0, y: 0, zoom: 1, width: 0, height: 0 },
      last_activity: presence.last_activity ? new Date(presence.last_activity).getTime() : Date.now(),
      session_id: presence.session_id || '',
      user_color: presence.user_color || this.generateUserColor(presence.user_id),
      interaction_state: presence.interaction_state || 'idle'
    };
  }

  async updateStatus(status: PresenceStatus): Promise<void> {
    if (!this.channel || this.state.local_user.status === status) return;

    try {
      this.state.local_user.status = status;
      this.state.local_user.last_activity = Date.now();

      await this.channel.track({
        ...this.getTrackingData(),
        status,
        last_activity: new Date().toISOString()
      });

      this.callbacks.onStatusChange?.(this.config.user_id, status);
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  }

  async updateCursor(x: number, y: number): Promise<void> {
    if (!this.channel) return;

    this.state.local_user.cursor = { x, y, timestamp: Date.now() };
    this.state.local_user.last_activity = Date.now();

    try {
      await this.channel.track({
        ...this.getTrackingData(),
        cursor_x: x,
        cursor_y: y,
        last_activity: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to update cursor:', error);
    }
  }

  async updateViewport(x: number, y: number, zoom: number, width: number, height: number): Promise<void> {
    if (!this.channel) return;

    this.state.local_user.viewport = { x, y, zoom, width, height };
    this.state.local_user.last_activity = Date.now();

    try {
      await this.channel.track({
        ...this.getTrackingData(),
        viewport_x: x,
        viewport_y: y,
        zoom_level: zoom,
        last_activity: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to update viewport:', error);
    }
  }

  private getTrackingData(): any {
    const { data: user } = this.supabase.auth.getUser();
    return {
      user_id: this.config.user_id,
      name: user?.user?.user_metadata?.display_name || user?.user?.email || '',
      email: user?.user?.email || '',
      avatar_url: user?.user?.user_metadata?.avatar_url,
      user_color: this.state.local_user.user_color,
      session_id: this.state.local_user.session_id,
      cursor_x: this.state.local_user.cursor.x,
      cursor_y: this.state.local_user.cursor.y,
      viewport_x: this.state.local_user.viewport.x,
      viewport_y: this.state.local_user.viewport.y,
      zoom_level: this.state.local_user.viewport.zoom
    };
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval) return;

    this.heartbeatInterval = setInterval(async () => {
      if (!this.channel || !this.state.is_connected) return;

      try {
        await this.channel.track({
          ...this.getTrackingData(),
          last_activity: new Date().toISOString()
        });
        
        this.state.last_heartbeat = Date.now();
        this.updateConnectionQuality();
      } catch (error) {
        console.error('Heartbeat failed:', error);
        this.state.connection_quality = 'poor';
      }
    }, this.config.heartbeat_interval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private updateConnectionQuality(): void {
    const now = Date.now();
    const timeSinceHeartbeat = now - this.state.last_heartbeat;

    if (timeSinceHeartbeat < this.config.heartbeat_interval * 2) {
      this.state.connection_quality = 'excellent';
    } else if (timeSinceHeartbeat < this.config.heartbeat_interval * 4) {
      this.state.connection_quality = 'good';
    } else {
      this.state.connection_quality = 'poor';
    }
  }

  // Public getters
  getConnectedUsers(): UserPresenceData[] {
    return Array.from(this.state.connected_users.values());
  }

  getLocalUser(): UserPresenceData {
    return this.state.local_user;
  }

  isConnected(): boolean {
    return this.state.is_connected;
  }

  getConnectionQuality(): string {
    return this.state.connection_quality;
  }

  getUserById(userId: string): UserPresenceData | undefined {
    return this.state.connected_users.get(userId);
  }

  getUserCount(): number {
    return this.state.connected_users.size;
  }
}