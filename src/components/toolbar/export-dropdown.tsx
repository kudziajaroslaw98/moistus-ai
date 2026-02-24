'use client';

/**
 * Export Dropdown Component
 * Provides export options for PNG, SVG, and PDF in the toolbar
 */

import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useFeatureGate } from '@/hooks/subscription/use-feature-gate';
import useAppStore from '@/store/mind-map-store';
import { cn } from '@/utils/cn';
import type { ExportFormat } from '@/utils/export-utils';
import type { PageOrientation, PageSize } from '@/utils/pdf-export-utils';
import {
	Download,
	FileImage,
	FileJson,
	FileText,
	FileType,
	Loader2,
	Settings2,
} from 'lucide-react';
import { useShallow } from 'zustand/shallow';

// Format options
const formatOptions: {
	id: ExportFormat;
	label: string;
	icon: React.ReactNode;
	description: string;
}[] = [
	{
		id: 'png',
		label: 'PNG Image',
		icon: <FileImage className='size-4' />,
		description: 'High-quality raster image',
	},
	{
		id: 'svg',
		label: 'SVG Vector',
		icon: <FileType className='size-4' />,
		description: 'Scalable vector graphics',
	},
	{
		id: 'pdf',
		label: 'PDF Document',
		icon: <FileText className='size-4' />,
		description: 'Printable document',
	},
	{
		id: 'json',
		label: 'JSON Data',
		icon: <FileJson className='size-4' />,
		description: 'Nodes & connections as JSON',
	},
];

// Page size options for PDF
const pageSizeOptions: { id: PageSize; label: string }[] = [
	{ id: 'a4', label: 'A4' },
	{ id: 'letter', label: 'Letter' },
];

// Orientation options for PDF
const orientationOptions: { id: PageOrientation; label: string }[] = [
	{ id: 'landscape', label: 'Landscape' },
	{ id: 'portrait', label: 'Portrait' },
];

interface ExportMenuContentProps {
	showHeader?: boolean;
}

export function ExportMenuContent({
	showHeader = true,
}: ExportMenuContentProps) {
	const {
		isExporting,
		exportFormat,
		exportBackground,
		pdfPageSize,
		pdfOrientation,
		pdfIncludeTitle,
		pdfIncludeMetadata,
		setExportFormat,
		setExportBackground,
		setPdfPageSize,
		setPdfOrientation,
		setPdfIncludeTitle,
		setPdfIncludeMetadata,
		startExport,
	} = useAppStore(
		useShallow((state) => ({
			isExporting: state.isExporting,
			exportFormat: state.exportFormat,
			exportBackground: state.exportBackground,
			pdfPageSize: state.pdfPageSize,
			pdfOrientation: state.pdfOrientation,
			pdfIncludeTitle: state.pdfIncludeTitle,
			pdfIncludeMetadata: state.pdfIncludeMetadata,
			setExportFormat: state.setExportFormat,
			setExportBackground: state.setExportBackground,
			setPdfPageSize: state.setPdfPageSize,
			setPdfOrientation: state.setPdfOrientation,
			setPdfIncludeTitle: state.setPdfIncludeTitle,
			setPdfIncludeMetadata: state.setPdfIncludeMetadata,
			startExport: state.startExport,
		}))
	);

	const { hasAccess: hasAdvancedExport, showUpgradePrompt } =
		useFeatureGate('advanced-export');

	const handleExport = () => {
		startExport();
	};

	const currentFormat = formatOptions.find((f) => f.id === exportFormat);

	return (
		<>
			<DropdownMenuGroup>
				{showHeader && (
					<>
						<DropdownMenuLabel className='flex items-center gap-2'>
							<Download className='size-4 text-text-secondary' />
							Export
						</DropdownMenuLabel>
						<DropdownMenuSeparator />
					</>
				)}

				{/* Format Selection */}
				<DropdownMenuRadioGroup
					value={exportFormat}
					onValueChange={(val) => setExportFormat(val as ExportFormat)}
				>
					{formatOptions.map((format) => {
						const isLocked =
							(format.id === 'json' || format.id === 'pdf') &&
							!hasAdvancedExport;
						return (
							<DropdownMenuRadioItem
								key={format.id}
								value={format.id}
								disabled={isExporting}
								className='flex flex-col items-start gap-0.5 py-2'
								onSelect={
									isLocked
										? (e) => {
												e.preventDefault();
												showUpgradePrompt();
											}
										: undefined
								}
							>
								<span className='flex items-center gap-2 font-medium'>
									{format.icon}
									{format.label}
									{isLocked && (
										<span className='text-xs text-primary-400 font-normal'>
											Pro
										</span>
									)}
								</span>
								<span className='text-xs text-text-secondary pl-6'>
									{format.description}
								</span>
							</DropdownMenuRadioItem>
						);
					})}
				</DropdownMenuRadioGroup>
			</DropdownMenuGroup>

			{/* Hide settings submenu for JSON — no canvas options apply */}
			{exportFormat !== 'json' && (
				<>
					<DropdownMenuSeparator />

					{/* Settings Submenu */}
					<DropdownMenuSub>
						<DropdownMenuSubTrigger disabled={isExporting}>
							<Settings2 className='size-4 mr-2' />
							Export Settings
						</DropdownMenuSubTrigger>
						<DropdownMenuSubContent className='w-56'>
							{/* Common Settings */}
							<DropdownMenuGroup>
								<DropdownMenuLabel className='text-xs text-text-secondary'>
									General
								</DropdownMenuLabel>
								<DropdownMenuCheckboxItem
									checked={exportBackground}
									onCheckedChange={setExportBackground}
									disabled={isExporting}
								>
									Include background
								</DropdownMenuCheckboxItem>
							</DropdownMenuGroup>

							{/* PDF-specific settings */}
							{exportFormat === 'pdf' && (
								<>
									<DropdownMenuSeparator />
									<DropdownMenuGroup>
										<DropdownMenuLabel className='text-xs text-text-secondary'>
											Page Size
										</DropdownMenuLabel>
										<DropdownMenuRadioGroup
											value={pdfPageSize}
											onValueChange={(val) => setPdfPageSize(val as PageSize)}
										>
											{pageSizeOptions.map((size) => (
												<DropdownMenuRadioItem
													key={size.id}
													value={size.id}
													disabled={isExporting}
												>
													{size.label}
												</DropdownMenuRadioItem>
											))}
										</DropdownMenuRadioGroup>
									</DropdownMenuGroup>

									<DropdownMenuSeparator />
									<DropdownMenuGroup>
										<DropdownMenuLabel className='text-xs text-text-secondary'>
											Orientation
										</DropdownMenuLabel>
										<DropdownMenuRadioGroup
											value={pdfOrientation}
											onValueChange={(val) =>
												setPdfOrientation(val as PageOrientation)
											}
										>
											{orientationOptions.map((orientation) => (
												<DropdownMenuRadioItem
													key={orientation.id}
													value={orientation.id}
													disabled={isExporting}
												>
													{orientation.label}
												</DropdownMenuRadioItem>
											))}
										</DropdownMenuRadioGroup>
									</DropdownMenuGroup>

									<DropdownMenuSeparator />
									<DropdownMenuGroup>
										<DropdownMenuLabel className='text-xs text-text-secondary'>
											Content
										</DropdownMenuLabel>
										<DropdownMenuCheckboxItem
											checked={pdfIncludeTitle}
											onCheckedChange={setPdfIncludeTitle}
											disabled={isExporting}
										>
											Include title
										</DropdownMenuCheckboxItem>
										<DropdownMenuCheckboxItem
											checked={pdfIncludeMetadata}
											onCheckedChange={setPdfIncludeMetadata}
											disabled={isExporting}
										>
											Include date/author
										</DropdownMenuCheckboxItem>
									</DropdownMenuGroup>
								</>
							)}
						</DropdownMenuSubContent>
					</DropdownMenuSub>
				</>
			)}

			<DropdownMenuSeparator />

			{/* Export Action */}
			<div className='p-1'>
				<Button
					onClick={handleExport}
					disabled={isExporting}
					className='w-full justify-center gap-2'
					size='sm'
				>
					{isExporting ? (
						<>
							<Loader2 className='size-4 animate-spin' />
							Exporting...
						</>
					) : (
						<>
							{currentFormat?.icon}
							Export as {currentFormat?.label}
						</>
					)}
				</Button>
			</div>
		</>
	);
}

export function ExportDropdown() {
	const { isExporting } = useAppStore(
		useShallow((state) => ({
			isExporting: state.isExporting,
		}))
	);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					className={cn('active:scale-95', isExporting && 'animate-pulse')}
					size='icon'
					title='Export Mind Map'
					variant='secondary'
					disabled={isExporting}
				>
					{isExporting ? (
						<Loader2 className='size-4 animate-spin' />
					) : (
						<Download className='size-4' />
					)}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align='start' className='w-64'>
				<ExportMenuContent />
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
