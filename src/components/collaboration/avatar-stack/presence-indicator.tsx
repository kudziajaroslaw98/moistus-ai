import { motion } from 'motion/react';
import { PresenceStatus } from '@/types/collaboration-types';
import { cn } from '@/lib/utils';

interface PresenceIndicatorProps {
  status: PresenceStatus;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
  animate?: boolean;
}

const sizeClasses = {
  xs: 'w-2 h-2',
  sm: 'w-3 h-3', 
  md: 'w-4 h-4',
  lg: 'w-5 h-5'
};

const statusConfig = {
  active: {
    color: 'bg-green-500',
    label: 'Active',
    animate: true
  },
  idle: {
    color: 'bg-yellow-500',
    label: 'Idle',
    animate: false
  },
  away: {
    color: 'bg-orange-500',
    label: 'Away',
    animate: false
  },
  offline: {
    color: 'bg-gray-400',
    label: 'Offline',
    animate: false
  }
};

export function PresenceIndicator({
  status,
  size = 'sm',
  showLabel = false,
  className,
  animate = true
}: PresenceIndicatorProps) {
  const config = statusConfig[status];
  const shouldAnimate = animate && config.animate;

  const indicator = (
    <div
      className={cn(
        'rounded-full border-2 border-white shadow-sm',
        sizeClasses[size],
        config.color,
        className
      )}
    />
  );

  const animatedIndicator = shouldAnimate ? (
    <motion.div
      className={cn(
        'rounded-full border-2 border-white shadow-sm',
        sizeClasses[size],
        config.color,
        className
      )}
      animate={{
        scale: [1, 1.2, 1],
        opacity: [1, 0.8, 1]
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut'
      }}
    />
  ) : indicator;

  if (showLabel) {
    return (
      <div className="flex items-center gap-2">
        {animatedIndicator}
        <span className="text-sm text-gray-600 capitalize">
          {config.label}
        </span>
      </div>
    );
  }

  return animatedIndicator;
}