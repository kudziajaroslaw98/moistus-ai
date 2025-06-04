import { motion } from 'motion/react';
import { useState } from 'react';
import { ActiveUser, PresenceStatus } from '@/types/collaboration-types';
import { cn } from '@/lib/utils';

interface UserAvatarProps {
  user: ActiveUser;
  size?: 'sm' | 'md' | 'lg';
  showStatus?: boolean;
  showTooltip?: boolean;
  onClick?: (user: ActiveUser) => void;
  className?: string;
}

const sizeClasses = {
  sm: 'w-6 h-6 text-xs',
  md: 'w-8 h-8 text-sm',
  lg: 'w-10 h-10 text-base'
};

const statusColors: Record<PresenceStatus, string> = {
  active: 'bg-green-500',
  idle: 'bg-yellow-500',
  away: 'bg-orange-500',
  offline: 'bg-gray-400'
};

const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const getContrastTextColor = (backgroundColor: string): string => {
  // Simple contrast calculation
  const hex = backgroundColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
};

export function UserAvatar({
  user,
  size = 'md',
  showStatus = true,
  showTooltip = true,
  onClick,
  className
}: UserAvatarProps) {
  const [showTooltipState, setShowTooltipState] = useState(false);
  const [imageError, setImageError] = useState(false);

  const userColor = user.presence.user_color || '#3B82F6';
  const textColor = getContrastTextColor(userColor);
  const status = user.presence.status;

  const handleClick = () => {
    if (onClick) {
      onClick(user);
    }
  };

  const formatLastActivity = (lastActivity: string): string => {
    const now = new Date();
    const activity = new Date(lastActivity);
    const diffMs = now.getTime() - activity.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="relative">
      <motion.button
        className={cn(
          'relative rounded-full border-2 border-white shadow-sm transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
          sizeClasses[size],
          onClick && 'cursor-pointer',
          className
        )}
        style={{ borderColor: userColor }}
        onClick={handleClick}
        onMouseEnter={() => showTooltip && setShowTooltipState(true)}
        onMouseLeave={() => setShowTooltipState(false)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        {/* Avatar content */}
        <div
          className="w-full h-full rounded-full flex items-center justify-center overflow-hidden"
          style={{ backgroundColor: userColor }}
        >
          {user.avatar_url && !imageError ? (
            <img
              src={user.avatar_url}
              alt={user.name}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <span
              className="font-medium select-none"
              style={{ color: textColor }}
            >
              {getInitials(user.name)}
            </span>
          )}
        </div>

        {/* Status indicator */}
        {showStatus && (
          <div
            className={cn(
              'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white',
              statusColors[status]
            )}
          />
        )}
      </motion.button>

      {/* Tooltip */}
      {showTooltip && showTooltipState && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50"
        >
          <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
            <div className="font-medium">{user.name}</div>
            <div className="text-gray-300 capitalize">{status}</div>
            <div className="text-gray-400">
              {formatLastActivity(user.presence.last_activity)}
            </div>
            {/* Tooltip arrow */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2">
              <div className="border-4 border-transparent border-t-gray-900" />
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}