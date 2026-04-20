import { render, screen } from '@testing-library/react';
import { Button, buttonVariants } from './button';

describe('buttonVariants', () => {
	it('maps canonical variant + state combinations', () => {
		expect(
			buttonVariants({
				variant: 'normal',
				state: 'destructive',
			})
		).toContain('bg-rose-600');
		expect(
			buttonVariants({
				variant: 'outline',
				state: 'destructive',
			})
		).toContain('border-error-500');
		expect(
			buttonVariants({
				variant: 'ghost',
				state: 'success',
			})
		).toContain('text-emerald-400');
	});

	it.each([
		['default', 'h-8 px-3 py-1.5 text-xs rounded-sm'],
		['sm', 'h-6 px-2 py-1 text-xs rounded'],
		['md', 'h-10 px-4 py-2 text-sm rounded'],
		['lg', 'h-12 px-6 py-3 text-sm rounded-md'],
		['icon', '!h-8 !w-8 p-0 rounded-sm'],
		['icon-sm', '!h-6 !w-6 p-0 rounded'],
		['icon-xs', '!h-4 !w-4 p-0 rounded'],
		['icon-md', '!h-10 !w-10 p-0 rounded'],
		['icon-lg', '!h-12 w-12 p-0 rounded-md'],
		['control-sm', 'h-6 px-1.5 text-xs rounded'],
		['control-md', 'h-8 px-2 text-sm rounded'],
	] as const)('keeps `%s` size styling', (size, expectedClass) => {
		expect(buttonVariants({ size })).toContain(expectedClass);
	});
});

describe('Button', () => {
	it('uses disabled visual state automatically when disabled prop is true', () => {
		render(<Button disabled>Delete</Button>);

		const button = screen.getByRole('button', { name: 'Delete' });
		expect(button).toBeDisabled();
		expect(button.className).toContain('bg-primary-600/60');
		expect(button.className).toContain('pointer-events-none');
	});
});
