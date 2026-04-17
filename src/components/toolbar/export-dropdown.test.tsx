import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ExportMenuContent } from './export-dropdown';

let mockStoreState: Record<string, unknown>;
let mockFeatureGate: {
	hasAccess: boolean;
	isLoading: boolean;
	showUpgradePrompt: jest.Mock;
};

jest.mock('@/hooks/subscription/use-feature-gate', () => ({
	useFeatureGate: () => mockFeatureGate,
}));

jest.mock('@/store/mind-map-store', () => ({
	__esModule: true,
	default: (selector: (state: Record<string, unknown>) => unknown) =>
		selector(mockStoreState),
}));

jest.mock('@/utils/cn', () => ({
	cn: (...classes: Array<string | false | null | undefined>) =>
		classes.filter(Boolean).join(' '),
}));

jest.mock('@/components/ui/dropdown-menu', () => ({
	DropdownMenuGroup: ({ children }: { children: ReactNode }) => (
		<div>{children}</div>
	),
	DropdownMenuLabel: ({ children }: { children: ReactNode }) => (
		<div>{children}</div>
	),
	DropdownMenuSeparator: () => <div />,
	DropdownMenuRadioGroup: ({ children }: { children: ReactNode }) => (
		<div>{children}</div>
	),
	DropdownMenuRadioItem: ({
		children,
		onSelect,
		...props
	}: {
		children: ReactNode;
		onSelect?: (event: { preventDefault: () => void }) => void;
	}) => (
		<button
			type='button'
			onClick={() => onSelect?.({ preventDefault: jest.fn() })}
			{...props}
		>
			{children}
		</button>
	),
	DropdownMenuSub: ({ children }: { children: ReactNode }) => (
		<div>{children}</div>
	),
	DropdownMenuSubTrigger: ({ children, ...props }: { children: ReactNode }) => (
		<button type='button' {...props}>
			{children}
		</button>
	),
	DropdownMenuSubContent: ({ children }: { children: ReactNode }) => (
		<div>{children}</div>
	),
	DropdownMenuCheckboxItem: ({
		children,
		...props
	}: {
		children: ReactNode;
	}) => (
		<button type='button' {...props}>
			{children}
		</button>
	),
}));

function createStoreState(overrides: Record<string, unknown> = {}) {
	return {
		isExporting: false,
		exportFormat: 'png',
		exportBackground: true,
		pdfPageSize: 'a4',
		pdfOrientation: 'landscape',
		pdfIncludeTitle: true,
		pdfIncludeMetadata: true,
		setExportFormat: jest.fn(),
		setExportBackground: jest.fn(),
		setPdfPageSize: jest.fn(),
		setPdfOrientation: jest.fn(),
		setPdfIncludeTitle: jest.fn(),
		setPdfIncludeMetadata: jest.fn(),
		startExport: jest.fn(),
		...overrides,
	};
}

function getFormatButton(format: 'png' | 'svg' | 'pdf' | 'json') {
	const button = document.querySelector<HTMLButtonElement>(
		`button[value="${format}"]`
	);

	if (!button) {
		throw new Error(`Expected export format button for ${format}`);
	}

	return button;
}

describe('ExportMenuContent', () => {
	beforeEach(() => {
		mockStoreState = createStoreState();
		mockFeatureGate = {
			hasAccess: false,
			isLoading: false,
			showUpgradePrompt: jest.fn(),
		};
	});

	it('disables protected export formats while subscription state is loading', () => {
		mockFeatureGate = {
			...mockFeatureGate,
			isLoading: true,
		};

		render(<ExportMenuContent />);

		expect(getFormatButton('png')).not.toBeDisabled();
		expect(getFormatButton('svg')).not.toBeDisabled();
		expect(getFormatButton('pdf')).toBeDisabled();
		expect(getFormatButton('json')).toBeDisabled();
	});

	it('opens the upgrade prompt for protected formats after subscription resolves', () => {
		render(<ExportMenuContent />);

		fireEvent.click(screen.getByRole('button', { name: /PDF Document/i }));

		expect(mockFeatureGate.showUpgradePrompt).toHaveBeenCalledTimes(1);
	});
});
