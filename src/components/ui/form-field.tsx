import { cn } from '@/utils/cn';
import { ReactNode } from 'react';
import { Label } from './label';

interface FormFieldProps {
	id: string;
	label: string;
	children: ReactNode;
	error?: string;
	className?: string;
	isBeingEdited?: boolean;
	editedBy?: string | null;
	userColor?: string;
}

export function FormField({
	id,
	label,
	children,
	error,
	className,
	isBeingEdited = false,
	editedBy = null,
	userColor = '#3b82f6',
}: FormFieldProps) {
	return (
		<div className={cn('space-y-2 relative', className)}>
			<Label htmlFor={id} className='flex flex-col gap-2'>
				<div className='flex items-center justify-between'>
					<span>{label}</span>
					{isBeingEdited && editedBy && (
						<div className='flex items-center gap-2 text-xs text-zinc-400'>
							<div
								className='w-2 h-2 rounded-full animate-pulse'
								style={{ backgroundColor: userColor }}
							/>
							<span>Editing by {editedBy}</span>
						</div>
					)}
				</div>

				<div
					className={cn(
						'transition-all duration-200',
						isBeingEdited && 'ring-2 ring-opacity-50',
						className
					)}
					style={
						isBeingEdited
							? ({
									'--tw-ring-color': userColor,
									boxShadow: `0 0 0 2px ${userColor}20, 0 0 8px ${userColor}40`,
								} as React.CSSProperties)
							: undefined
					}
				>
					{children}
				</div>
			</Label>

			{error && <p className='mt-1 text-sm text-rose-500'>{error}</p>}
		</div>
	);
}
