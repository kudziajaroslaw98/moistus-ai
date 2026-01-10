'use client';

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { cn } from '@/utils/cn';
import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface ColorSwatch {
	name: string;
	variable: string;
	category: string;
}

// Define all color swatches from globals.css
const colorSwatches: ColorSwatch[] = [
	// Neutral Scale
	{ name: 'Neutral 50', variable: '--color-neutral-50', category: 'Neutral' },
	{
		name: 'Neutral 100',
		variable: '--color-neutral-100',
		category: 'Neutral',
	},
	{
		name: 'Neutral 200',
		variable: '--color-neutral-200',
		category: 'Neutral',
	},
	{
		name: 'Neutral 300',
		variable: '--color-neutral-300',
		category: 'Neutral',
	},
	{
		name: 'Neutral 400',
		variable: '--color-neutral-400',
		category: 'Neutral',
	},
	{
		name: 'Neutral 500',
		variable: '--color-neutral-500',
		category: 'Neutral',
	},
	{
		name: 'Neutral 600',
		variable: '--color-neutral-600',
		category: 'Neutral',
	},
	{
		name: 'Neutral 700',
		variable: '--color-neutral-700',
		category: 'Neutral',
	},
	{
		name: 'Neutral 800',
		variable: '--color-neutral-800',
		category: 'Neutral',
	},
	{
		name: 'Neutral 900',
		variable: '--color-neutral-900',
		category: 'Neutral',
	},

	// Primary Scale
	{ name: 'Primary 50', variable: '--color-primary-50', category: 'Primary' },
	{
		name: 'Primary 100',
		variable: '--color-primary-100',
		category: 'Primary',
	},
	{
		name: 'Primary 200',
		variable: '--color-primary-200',
		category: 'Primary',
	},
	{
		name: 'Primary 300',
		variable: '--color-primary-300',
		category: 'Primary',
	},
	{
		name: 'Primary 400',
		variable: '--color-primary-400',
		category: 'Primary',
	},
	{
		name: 'Primary 500',
		variable: '--color-primary-500',
		category: 'Primary',
	},
	{
		name: 'Primary 600',
		variable: '--color-primary-600',
		category: 'Primary',
	},
	{
		name: 'Primary 700',
		variable: '--color-primary-700',
		category: 'Primary',
	},
	{
		name: 'Primary 800',
		variable: '--color-primary-800',
		category: 'Primary',
	},
	{
		name: 'Primary 900',
		variable: '--color-primary-900',
		category: 'Primary',
	},

	// Success Scale
	{ name: 'Success 50', variable: '--color-success-50', category: 'Success' },
	{
		name: 'Success 100',
		variable: '--color-success-100',
		category: 'Success',
	},
	{
		name: 'Success 200',
		variable: '--color-success-200',
		category: 'Success',
	},
	{
		name: 'Success 300',
		variable: '--color-success-300',
		category: 'Success',
	},
	{
		name: 'Success 400',
		variable: '--color-success-400',
		category: 'Success',
	},
	{
		name: 'Success 500',
		variable: '--color-success-500',
		category: 'Success',
	},
	{
		name: 'Success 600',
		variable: '--color-success-600',
		category: 'Success',
	},
	{
		name: 'Success 700',
		variable: '--color-success-700',
		category: 'Success',
	},
	{
		name: 'Success 800',
		variable: '--color-success-800',
		category: 'Success',
	},
	{
		name: 'Success 900',
		variable: '--color-success-900',
		category: 'Success',
	},

	// Warning Scale
	{ name: 'Warning 50', variable: '--color-warning-50', category: 'Warning' },
	{
		name: 'Warning 100',
		variable: '--color-warning-100',
		category: 'Warning',
	},
	{
		name: 'Warning 200',
		variable: '--color-warning-200',
		category: 'Warning',
	},
	{
		name: 'Warning 300',
		variable: '--color-warning-300',
		category: 'Warning',
	},
	{
		name: 'Warning 400',
		variable: '--color-warning-400',
		category: 'Warning',
	},
	{
		name: 'Warning 500',
		variable: '--color-warning-500',
		category: 'Warning',
	},
	{
		name: 'Warning 600',
		variable: '--color-warning-600',
		category: 'Warning',
	},
	{
		name: 'Warning 700',
		variable: '--color-warning-700',
		category: 'Warning',
	},
	{
		name: 'Warning 800',
		variable: '--color-warning-800',
		category: 'Warning',
	},
	{
		name: 'Warning 900',
		variable: '--color-warning-900',
		category: 'Warning',
	},

	// Error Scale
	{ name: 'Error 50', variable: '--color-error-50', category: 'Error' },
	{ name: 'Error 100', variable: '--color-error-100', category: 'Error' },
	{ name: 'Error 200', variable: '--color-error-200', category: 'Error' },
	{ name: 'Error 300', variable: '--color-error-300', category: 'Error' },
	{ name: 'Error 400', variable: '--color-error-400', category: 'Error' },
	{ name: 'Error 500', variable: '--color-error-500', category: 'Error' },
	{ name: 'Error 600', variable: '--color-error-600', category: 'Error' },
	{ name: 'Error 700', variable: '--color-error-700', category: 'Error' },
	{ name: 'Error 800', variable: '--color-error-800', category: 'Error' },
	{ name: 'Error 900', variable: '--color-error-900', category: 'Error' },

	// Semantic Tokens
	{ name: 'BG Base', variable: '--color-base', category: 'Backgrounds' },
	{
		name: 'BG Surface',
		variable: '--color-surface',
		category: 'Backgrounds',
	},
	{
		name: 'BG Elevated',
		variable: '--color-elevated',
		category: 'Backgrounds',
	},
	{
		name: 'BG Overlay',
		variable: '--color-overlay',
		category: 'Backgrounds',
	},

	// Borders
	{
		name: 'Border Subtle',
		variable: '--color-border-subtle',
		category: 'Borders',
	},
	{
		name: 'Border Default',
		variable: '--color-border-default',
		category: 'Borders',
	},
	{
		name: 'Border Strong',
		variable: '--color-border-strong',
		category: 'Borders',
	},

	// Text
	{
		name: 'Text Primary',
		variable: '--color-text-primary',
		category: 'Text',
	},
	{
		name: 'Text Secondary',
		variable: '--color-text-secondary',
		category: 'Text',
	},
	{
		name: 'Text Tertiary',
		variable: '--color-text-tertiary',
		category: 'Text',
	},
	{
		name: 'Text Disabled',
		variable: '--color-text-disabled',
		category: 'Text',
	},

	// Interactive States
	{
		name: 'Interactive Primary',
		variable: '--color-interactive-primary',
		category: 'Interactive',
	},
	{
		name: 'Interactive Primary Hovered',
		variable: '--color-interactive-primary-hovered',
		category: 'Interactive',
	},
	{
		name: 'Interactive Primary Pressed',
		variable: '--color-interactive-primary-pressed',
		category: 'Interactive',
	},
	{
		name: 'Interactive Success',
		variable: '--color-interactive-success',
		category: 'Interactive',
	},
	{
		name: 'Interactive Success Hovered',
		variable: '--color-interactive-success-hovered',
		category: 'Interactive',
	},
	{
		name: 'Interactive Success Pressed',
		variable: '--color-interactive-success-pressed',
		category: 'Interactive',
	},
	{
		name: 'Interactive Warning',
		variable: '--color-interactive-warning',
		category: 'Interactive',
	},
	{
		name: 'Interactive Warning Hovered',
		variable: '--color-interactive-warning-hovered',
		category: 'Interactive',
	},
	{
		name: 'Interactive Warning Pressed',
		variable: '--color-interactive-warning-pressed',
		category: 'Interactive',
	},
	{
		name: 'Interactive Error',
		variable: '--color-interactive-error',
		category: 'Interactive',
	},
	{
		name: 'Interactive Error Hovered',
		variable: '--color-interactive-error-hovered',
		category: 'Interactive',
	},
	{
		name: 'Interactive Error Pressed',
		variable: '--color-interactive-error-pressed',
		category: 'Interactive',
	},

	// Shadcn/UI Compatibility
	{
		name: 'Background',
		variable: '--color-background',
		category: 'Shadcn',
	},
	{
		name: 'Foreground',
		variable: '--color-foreground',
		category: 'Shadcn',
	},
	{ name: 'Card', variable: '--color-card', category: 'Shadcn' },
	{
		name: 'Card Foreground',
		variable: '--color-card-foreground',
		category: 'Shadcn',
	},
	{ name: 'Popover', variable: '--color-popover', category: 'Shadcn' },
	{
		name: 'Popover Foreground',
		variable: '--color-popover-foreground',
		category: 'Shadcn',
	},
	{ name: 'Primary', variable: '--color-primary', category: 'Shadcn' },
	{
		name: 'Primary Foreground',
		variable: '--color-primary-foreground',
		category: 'Shadcn',
	},
	{ name: 'Secondary', variable: '--color-secondary', category: 'Shadcn' },
	{
		name: 'Secondary Foreground',
		variable: '--color-secondary-foreground',
		category: 'Shadcn',
	},
	{ name: 'Muted', variable: '--color-muted', category: 'Shadcn' },
	{
		name: 'Muted Foreground',
		variable: '--color-muted-foreground',
		category: 'Shadcn',
	},
	{ name: 'Accent', variable: '--color-accent', category: 'Shadcn' },
	{
		name: 'Accent Foreground',
		variable: '--color-accent-foreground',
		category: 'Shadcn',
	},
	{
		name: 'Destructive',
		variable: '--color-destructive',
		category: 'Shadcn',
	},
	{
		name: 'Destructive Foreground',
		variable: '--color-destructive-foreground',
		category: 'Shadcn',
	},
	{ name: 'Border', variable: '--color-border', category: 'Shadcn' },
	{ name: 'Input', variable: '--color-input', category: 'Shadcn' },
	{ name: 'Ring', variable: '--color-ring', category: 'Shadcn' },
];

// Group swatches by category
const categorizedSwatches = colorSwatches.reduce(
	(acc, swatch) => {
		if (!acc[swatch.category]) {
			acc[swatch.category] = [];
		}
		acc[swatch.category].push(swatch);
		return acc;
	},
	{} as Record<string, ColorSwatch[]>
);

interface ColorSwatchCardProps {
	swatch: ColorSwatch;
}

function ColorSwatchCard({ swatch }: ColorSwatchCardProps) {
	const [copied, setCopied] = useState(false);

	const copyToClipboard = async (text: string) => {
		try {
			await navigator.clipboard.writeText(text);
			setCopied(true);
			toast.success(`Copied: ${text}`);
			setTimeout(() => setCopied(false), 2000);
		} catch (err) {
			toast.error('Failed to copy to clipboard');
		}
	};

	// Get computed color value
	const getColorValue = () => {
		if (typeof window === 'undefined') return 'oklch(0 0 0)';
		const value = getComputedStyle(document.documentElement)
			.getPropertyValue(swatch.variable)
			.trim();
		return value || 'oklch(0 0 0)';
	};

	const colorValue = getColorValue();

	return (
		<div className='group relative flex flex-col gap-3 rounded-lg border border-border-default bg-surface p-4 transition-all duration-200 hover:border-border-strong hover:shadow-lg'>
			{/* Color Preview Box */}
			<div
				className='h-24 w-full rounded-md border border-border-subtle shadow-inner transition-transform duration-200 group-hover:scale-105'
				style={{ backgroundColor: `var(${swatch.variable})` }}
			/>

			{/* Color Info */}
			<div className='flex flex-col gap-1'>
				<h3 className='text-sm font-semibold text-text-primary'>
					{swatch.name}
				</h3>

				<div className='flex flex-col gap-1 text-xs'>
					{/* Variable Name */}
					<button
						onClick={() => copyToClipboard(`var(${swatch.variable})`)}
						type='button'
						className={cn(
							'flex items-center justify-between rounded bg-elevated px-2 py-1 font-mono text-text-secondary transition-colors duration-200 hover:bg-overlay hover:text-text-primary',
							copied && 'bg-success-900/20 text-success-400'
						)}
					>
						<span className='truncate'>{swatch.variable}</span>

						{copied ? (
							<Check className='ml-2 h-3 w-3 shrink-0' />
						) : (
							<Copy className='ml-2 h-3 w-3 shrink-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100' />
						)}
					</button>

					{/* OKLCH Value */}
					<button
						className='flex items-center justify-between rounded bg-elevated px-2 py-1 font-mono text-text-tertiary transition-colors duration-200 hover:bg-overlay hover:text-text-secondary'
						onClick={() => copyToClipboard(colorValue)}
						type='button'
					>
						<span className='truncate'>{colorValue}</span>

						<Copy className='ml-2 h-3 w-3 shrink-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100' />
					</button>
				</div>
			</div>
		</div>
	);
}

interface ColorCategoryProps {
	title: string;
	description: string;
	swatches: ColorSwatch[];
}

function ColorCategory({ title, description, swatches }: ColorCategoryProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>{title}</CardTitle>

				<CardDescription>{description}</CardDescription>
			</CardHeader>

			<CardContent>
				<div className='grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'>
					{swatches.map((swatch) => (
						<ColorSwatchCard key={swatch.variable} swatch={swatch} />
					))}
				</div>
			</CardContent>
		</Card>
	);
}

export default function ColorsPage() {
	return (
		<div className='min-h-screen bg-background p-6 md:p-10'>
			<div className='mx-auto max-w-7xl space-y-8'>
				{/* Header */}
				<div className='space-y-4'>
					<div>
						<h1 className='text-4xl font-bold text-text-primary'>
							Color System
						</h1>

						<p className='mt-2 text-lg text-text-secondary'>
							Visual reference for all color variables defined in globals.css
						</p>
					</div>

					<div className='rounded-lg border border-border-default bg-elevated p-4'>
						<p className='text-sm text-text-secondary'>
							<span className='font-semibold text-text-primary'>
								💡 Pro tip:
							</span>{' '}
							Click on any variable name or color value to copy it to your
							clipboard.
						</p>
					</div>
				</div>

				{/* Primitive Color Scales */}
				<div className='space-y-6'>
					<div>
						<h2 className='mb-4 text-2xl font-bold text-text-primary'>
							Primitive Color Scales
						</h2>

						<p className='text-sm text-text-secondary'>
							Foundation colors using OKLCH color space. These are the building
							blocks for semantic tokens.
						</p>
					</div>

					{categorizedSwatches.Neutral && (
						<ColorCategory
							description='Pure gray (0 chroma) for universal compatibility'
							swatches={categorizedSwatches.Neutral}
							title='Neutral Scale'
						/>
					)}

					{categorizedSwatches.Primary && (
						<ColorCategory
							description='Blue (hue 250°) - Brand primary color'
							swatches={categorizedSwatches.Primary}
							title='Primary Scale'
						/>
					)}

					{categorizedSwatches.Success && (
						<ColorCategory
							description='Green (hue 145°) - Success and positive actions'
							swatches={categorizedSwatches.Success}
							title='Success Scale'
						/>
					)}

					{categorizedSwatches.Warning && (
						<ColorCategory
							description='Amber (hue 85°) - Warnings and caution'
							swatches={categorizedSwatches.Warning}
							title='Warning Scale'
						/>
					)}

					{categorizedSwatches.Error && (
						<ColorCategory
							description='Red (hue 25°) - Errors and destructive actions'
							swatches={categorizedSwatches.Error}
							title='Error Scale'
						/>
					)}
				</div>

				{/* Semantic Tokens */}
				<div className='space-y-6'>
					<div>
						<h2 className='mb-4 text-2xl font-bold text-text-primary'>
							Semantic Tokens
						</h2>

						<p className='text-sm text-text-secondary'>
							Contextual colors mapped to specific use cases in the UI.
						</p>
					</div>

					{categorizedSwatches.Backgrounds && (
						<ColorCategory
							description='Elevation system (lighter = closer to user)'
							swatches={categorizedSwatches.Backgrounds}
							title='Backgrounds'
						/>
					)}

					{categorizedSwatches.Borders && (
						<ColorCategory
							description='Border colors for different emphasis levels'
							swatches={categorizedSwatches.Borders}
							title='Borders'
						/>
					)}

					{categorizedSwatches.Text && (
						<ColorCategory
							description='Text hierarchy from primary to disabled'
							swatches={categorizedSwatches.Text}
							title='Text'
						/>
					)}

					{categorizedSwatches.Interactive && (
						<ColorCategory
							description='Interactive states (default, hover, pressed)'
							swatches={categorizedSwatches.Interactive}
							title='Interactive States'
						/>
					)}
				</div>

				{/* Shadcn/UI Compatibility */}
				<div className='space-y-6'>
					<div>
						<h2 className='mb-4 text-2xl font-bold text-text-primary'>
							Shadcn/UI Compatibility
						</h2>

						<p className='text-sm text-text-secondary'>
							Tokens mapped to shadcn/ui naming convention for component
							compatibility.
						</p>
					</div>

					{categorizedSwatches.Shadcn && (
						<ColorCategory
							description='Standard shadcn/ui color tokens'
							swatches={categorizedSwatches.Shadcn}
							title='Shadcn Tokens'
						/>
					)}
				</div>
			</div>
		</div>
	);
}
