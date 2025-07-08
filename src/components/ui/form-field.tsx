import { cn } from '@/utils/cn';
import { ReactNode } from 'react';
import { Label } from './label';

interface FormFieldProps {
	id: string;
	label: string;
	children: ReactNode;
	error?: string;
	className?: string;
	avatarStacks?: ReactNode;
}

export function FormField({
	id,
	label,
	children,
	error,
	className,
	avatarStacks,
}: FormFieldProps) {
	return (
		<div className={cn('space-y-2 relative', className)}>
			<Label htmlFor={id} className='flex flex-col gap-2'>
				<div className='flex items-center justify-between'>
					<span>{label}</span>

					{avatarStacks && <div>{avatarStacks}</div>}
				</div>

				<div className={cn('transition-all duration-200', className)}>
					{children}
				</div>
			</Label>

			{error && <p className='mt-1 text-sm text-rose-500'>{error}</p>}
		</div>
	);
}
