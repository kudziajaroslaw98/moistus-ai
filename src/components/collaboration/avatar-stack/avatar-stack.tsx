import { motion, AnimatePresence } from 'motion/react';
import { UserAvatar } from './user-avatar';
import { ActiveUser } from '@/types/collaboration-types';
import useAppStore from '@/contexts/mind-map/mind-map-store';
import { cn } from '@/lib/utils';

interface AvatarStackProps {
  maxVisible?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onUserClick?: (user: ActiveUser) => void;
}

export function AvatarStack({
  maxVisible = 8,
  size = 'md',
  className,
  onUserClick
}: AvatarStackProps) {
  const { 
    activeUsers, 
    activeCollaborationUser, 
    showPresenceIndicators,
    isConnected 
  } = useAppStore();

  // Filter out current user from the display
  const otherUsers = activeUsers.filter(user => 
    user.user_id !== activeCollaborationUser?.user_id
  );

  const visibleUsers = otherUsers.slice(0, maxVisible);
  const hiddenCount = Math.max(0, otherUsers.length - maxVisible);

  const handleUserClick = (user: ActiveUser) => {
    if (onUserClick) {
      onUserClick(user);
    }
    // TODO: Center view on user's cursor position
    // This will be implemented when we add cursor tracking
  };

  const handleMoreClick = () => {
    // TODO: Show expanded user list modal
    console.log('Show more users:', hiddenCount);
  };

  if (!isConnected || !showPresenceIndicators || otherUsers.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        'flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-full px-3 py-2 shadow-lg border border-gray-200',
        className
      )}
    >
      {/* Connection status indicator */}
      <div className="flex items-center gap-2 mr-2">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <span className="text-xs text-gray-600 font-medium">
          {otherUsers.length === 1 ? '1 person' : `${otherUsers.length} people`}
        </span>
      </div>

      {/* Avatar list */}
      <div className="flex items-center -space-x-1">
        <AnimatePresence mode="popLayout">
          {visibleUsers.map((user, index) => (
            <motion.div
              key={user.user_id}
              initial={{ opacity: 0, scale: 0.8, x: 20 }}
              animate={{ 
                opacity: 1, 
                scale: 1, 
                x: 0,
                zIndex: visibleUsers.length - index
              }}
              exit={{ opacity: 0, scale: 0.8, x: -20 }}
              transition={{ 
                type: 'spring', 
                stiffness: 500, 
                damping: 30,
                delay: index * 0.05
              }}
              style={{ zIndex: visibleUsers.length - index }}
              className="relative"
            >
              <UserAvatar
                user={user}
                size={size}
                onClick={handleUserClick}
                showTooltip={true}
                className="transition-transform hover:translate-y-0.5"
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {/* More users indicator */}
        {hiddenCount > 0 && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleMoreClick}
            className={cn(
              'relative rounded-full bg-gray-100 border-2 border-white shadow-sm hover:bg-gray-200 transition-colors flex items-center justify-center text-gray-600 font-medium',
              size === 'sm' && 'w-6 h-6 text-xs',
              size === 'md' && 'w-8 h-8 text-sm', 
              size === 'lg' && 'w-10 h-10 text-base'
            )}
          >
            +{hiddenCount}
          </motion.button>
        )}
      </div>

      {/* Current user indicator */}
      {activeCollaborationUser && (
        <div className="flex items-center gap-2 ml-3 pl-3 border-l border-gray-200">
          <UserAvatar
            user={activeCollaborationUser}
            size={size}
            showTooltip={false}
            className="ring-2 ring-blue-500 ring-offset-1"
          />
          <span className="text-xs text-gray-600 font-medium">You</span>
        </div>
      )}
    </motion.div>
  );
}