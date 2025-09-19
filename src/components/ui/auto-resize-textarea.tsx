'use client';

import { Textarea, type TextareaProps } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { forwardRef, useEffect, useRef } from 'react';

type AutoResizeTextareaProps = TextareaProps;

const AutoResizeTextarea = forwardRef<
	HTMLTextAreaElement,
	AutoResizeTextareaProps
>((props, ref) => {
	const { value, className, ...rest } = props;
	const internalRef = useRef<HTMLTextAreaElement>(null);

	const combinedRef = (node: HTMLTextAreaElement) => {
		internalRef.current = node;

		if (typeof ref === 'function') {
			ref(node);
		} else if (ref) {
			ref.current = node;
		}
	};

	useEffect(() => {
		const textarea = internalRef.current;

		if (textarea) {
			textarea.style.height = 'auto';
			textarea.style.height = `${textarea.scrollHeight}px`;
		}
	}, [value]);

	return (
		<Textarea
			ref={combinedRef}
			value={value}
			className={cn('resize-none overflow-hidden', className)}
			{...rest}
		/>
	);
});

AutoResizeTextarea.displayName = 'AutoResizeTextarea';

export { AutoResizeTextarea };
