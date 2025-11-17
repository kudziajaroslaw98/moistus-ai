import { cn } from '@/utils/cn';
import { Loader2, Wifi, WifiOff } from 'lucide-react';

interface ConnectionStatusProps {
	isConnected: boolean;
	isConnecting?: boolean;
	onRetry?: () => void;
	className?: string;
	showLabel?: boolean;
}

export function ConnectionStatus({
	isConnected,
	isConnecting = false,
	onRetry,
	className,
	showLabel = true,
}: ConnectionStatusProps) {
	const getStatusConfig = () => {
		if (isConnecting) {
			return {
				icon: Loader2,
				color: 'text-yellow-500',
				bgColor: 'bg-yellow-500/20',
				label: 'Connecting...',
				pulse: false,
				animate: 'animate-spin',
			};
		}

		if (isConnected) {
			return {
				icon: Wifi,
				color: 'text-green-500',
				bgColor: 'bg-green-500/20',
				label: 'Connected',
				pulse: true,
				animate: '',
			};
		}

		return {
			icon: WifiOff,
			color: 'text-red-500',
			bgColor: 'bg-red-500/20',
			label: 'Disconnected',
			pulse: false,
			animate: '',
		};
	};

	const config = getStatusConfig();
	const Icon = config.icon;

	return (
		<div className={cn('flex items-center gap-2', className)}>
			<div
				className={cn(
					'relative flex items-center justify-center w-6 h-6 rounded-full',
					config.bgColor
				)}
			>
				<Icon className={cn('w-3 h-3', config.color, config.animate)} />

				{config.pulse && (
					<div
						className={cn(
							'absolute inset-0 rounded-full animate-ping',
							config.bgColor
						)}
					/>
				)}
			</div>

			{showLabel && (
				<div className='flex items-center gap-2'>
					<span className={cn('text-xs font-medium', config.color)}>
						{config.label}
					</span>

					{!isConnected && !isConnecting && onRetry && (
						<button
							className='text-xs text-zinc-400 hover:text-zinc-300 underline transition-colors'
							onClick={onRetry}
						>
							Retry
						</button>
					)}
				</div>
			)}
		</div>
	);
}
