'use client';

import useAppStore from '@/store/mind-map-store';
import { SpecificLayoutConfig } from '@/types/layout-types';
import { cn } from '@/utils/cn';
import {
	ArrowDown,
	ArrowLeft,
	ArrowRight,
	ArrowUp,
	Circle,
	Grid,
	LayoutDashboard,
	Network,
	Settings,
	TreePine,
	Zap,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { memo, useCallback, useMemo, useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

const layoutIcons: Record<string, React.ElementType> = {
	// Legacy algorithm names (still used in configs)
	'dagre-tb': ArrowDown,
	'dagre-lr': ArrowRight,
	'dagre-bt': ArrowUp,
	'dagre-rl': ArrowLeft,
	'force-directed': Zap,
	circular: Circle,
	radial: Network,
	grid: Grid,
	tree: TreePine,
	hierarchical: ArrowDown,
	// New ELK preset IDs
	'elk-layered-tb': ArrowDown,
	'elk-layered-lr': ArrowRight,
	'elk-layered-bt': ArrowUp,
	'elk-layered-rl': ArrowLeft,
	'elk-force': Zap,
	'elk-radial': Network,
	'elk-circular': Circle,
	'elk-box': Grid,
	'elk-mrtree': TreePine,
	'elk-stress': Zap,
	'elk-random': Settings,
};

const layoutCategories = {
	hierarchical: { name: 'Hierarchical', color: 'bg-blue-500' },
	force: { name: 'Force-Based', color: 'bg-green-500' },
	geometric: { name: 'Geometric', color: 'bg-purple-500' },
	custom: { name: 'Custom', color: 'bg-orange-500' },
};

interface LayoutConfigPanelProps {
	config: SpecificLayoutConfig;
	onConfigChange: (config: SpecificLayoutConfig) => void;
}

function LayoutConfigPanel({ config, onConfigChange }: LayoutConfigPanelProps) {
	const updateConfig = useCallback(
		(updates: Partial<SpecificLayoutConfig>) => {
			onConfigChange({ ...config, ...updates } as SpecificLayoutConfig);
		},
		[config, onConfigChange]
	);

	return (
		<div className='space-y-4 p-4 border-t border-zinc-700'>
			<h4 className='text-sm font-medium text-zinc-300'>Layout Settings</h4>

			{/* Common settings */}
			<div className='grid grid-cols-2 gap-3'>
				{config.nodeSpacing !== undefined && (
					<div className='space-y-1'>
						<label className='text-xs text-zinc-400'>Node Spacing</label>

						<input
							className='w-full'
							max='200'
							min='20'
							type='range'
							value={config.nodeSpacing}
							onChange={(e) =>
								updateConfig({ nodeSpacing: Number(e.target.value) })
							}
						/>

						<span className='text-xs text-zinc-500'>
							{config.nodeSpacing}px
						</span>
					</div>
				)}

				{config.rankSpacing !== undefined && (
					<div className='space-y-1'>
						<label className='text-xs text-zinc-400'>Rank Spacing</label>

						<input
							className='w-full'
							max='300'
							min='50'
							type='range'
							value={config.rankSpacing}
							onChange={(e) =>
								updateConfig({ rankSpacing: Number(e.target.value) })
							}
						/>

						<span className='text-xs text-zinc-500'>
							{config.rankSpacing}px
						</span>
					</div>
				)}
			</div>

			{/* Algorithm-specific settings */}
			{config.algorithm === 'force-directed' && (
				<div className='grid grid-cols-2 gap-3'>
					<div className='space-y-1'>
						<label className='text-xs text-zinc-400'>Iterations</label>

						<input
							className='w-full'
							max='500'
							min='50'
							type='range'
							value={(config as { iterations?: number }).iterations || 300}
							onChange={(e) =>
								updateConfig({
									iterations: Number(e.target.value),
								} as Partial<SpecificLayoutConfig>)
							}
						/>

						<span className='text-xs text-zinc-500'>
							{(config as { iterations?: number }).iterations || 300}
						</span>
					</div>

					<div className='space-y-1'>
						<label className='text-xs text-zinc-400'>Strength</label>

						<input
							className='w-full'
							max='-100'
							min='-500'
							type='range'
							value={(config as { strength?: number }).strength || -300}
							onChange={(e) =>
								updateConfig({
									strength: Number(e.target.value),
								} as Partial<SpecificLayoutConfig>)
							}
						/>

						<span className='text-xs text-zinc-500'>
							{(config as { strength?: number }).strength || -300}
						</span>
					</div>
				</div>
			)}

			{config.algorithm === 'circular' && (
				<div className='grid grid-cols-2 gap-3'>
					<div className='space-y-1'>
						<label className='text-xs text-zinc-400'>Radius</label>

						<input
							className='w-full'
							max='500'
							min='100'
							type='range'
							value={(config as { radius?: number }).radius || 200}
							onChange={(e) =>
								updateConfig({
									radius: Number(e.target.value),
								} as Partial<SpecificLayoutConfig>)
							}
						/>

						<span className='text-xs text-zinc-500'>
							{(config as { radius?: number }).radius || 200}px
						</span>
					</div>

					<div className='space-y-1'>
						<label className='text-xs text-zinc-400'>Start Angle</label>

						<input
							className='w-full'
							max='360'
							min='0'
							type='range'
							onChange={(e) =>
								updateConfig({
									startAngle: Number(e.target.value) * (Math.PI / 180),
								} as Partial<SpecificLayoutConfig>)
							}
							value={
								((config as { startAngle?: number }).startAngle || 0) *
								(180 / Math.PI)
							}
						/>

						<span className='text-xs text-zinc-500'>
							{Math.round(
								((config as { startAngle?: number }).startAngle || 0) *
									(180 / Math.PI)
							)}
							°
						</span>
					</div>
				</div>
			)}

			{config.algorithm === 'grid' && (
				<div className='grid grid-cols-2 gap-3'>
					<div className='space-y-1'>
						<label className='text-xs text-zinc-400'>Columns</label>

						<input
							className='w-full'
							max='10'
							min='2'
							type='range'
							value={(config as { columns?: number }).columns || 4}
							onChange={(e) =>
								updateConfig({
									columns: Number(e.target.value),
								} as Partial<SpecificLayoutConfig>)
							}
						/>

						<span className='text-xs text-zinc-500'>
							{(config as { columns?: number }).columns || 4}
						</span>
					</div>

					<div className='space-y-1'>
						<label className='text-xs text-zinc-400'>Cell Width</label>

						<input
							className='w-full'
							max='500'
							min='200'
							type='range'
							value={(config as { cellWidth?: number }).cellWidth || 350}
							onChange={(e) =>
								updateConfig({
									cellWidth: Number(e.target.value),
								} as Partial<SpecificLayoutConfig>)
							}
						/>

						<span className='text-xs text-zinc-500'>
							{(config as { cellWidth?: number }).cellWidth || 350}px
						</span>
					</div>
				</div>
			)}

			<div className='flex gap-2'>
				<Button
					className='flex-1 bg-teal-600 hover:bg-teal-700 text-white'
					onClick={() => onConfigChange(config)}
					size='sm'
				>
					Apply Layout
				</Button>
			</div>
		</div>
	);
}

const LayoutSelectorComponent = () => {
	const [isOpen, setIsOpen] = useState(false);
	const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
	const [showSettings, setShowSettings] = useState(false);
	const [currentConfig, setCurrentConfig] =
		useState<SpecificLayoutConfig | null>(null);

	const { applyAdvancedLayout, getLayoutPresets, currentLayoutConfig } =
		useAppStore(
			useShallow((state) => ({
				applyAdvancedLayout: state.applyAdvancedLayout,
				getLayoutPresets: state.getLayoutPresets,
				currentLayoutConfig: state.currentLayoutConfig,
			}))
		);

	const presets = getLayoutPresets();
	const categorizedPresets = useMemo(() => {
		return presets.reduce(
			(acc, preset) => {
				if (!acc[preset.category]) acc[preset.category] = [];
				acc[preset.category].push(preset);
				return acc;
			},
			{} as Record<string, typeof presets>
		);
	}, [presets]);

	const handlePresetSelect = useCallback(
		(preset: (typeof presets)[0]) => {
			setSelectedPreset(preset.id);
			setCurrentConfig(preset.config);

			if (!showSettings && !preset.disabled) {
				applyAdvancedLayout(preset.config);
				setIsOpen(false);
			}
		},
		[applyAdvancedLayout, setIsOpen, showSettings]
	);

	const handleConfigChange = useCallback(
		(config: SpecificLayoutConfig) => {
			setCurrentConfig(config);
			applyAdvancedLayout(config);
			setIsOpen(false);
			setShowSettings(false);
		},
		[applyAdvancedLayout, setIsOpen, setShowSettings]
	);

	// const currentPreset = presets.find(p => p.id === selectedPreset);

	return (
		<Popover onOpenChange={setIsOpen} open={isOpen}>
			<PopoverTrigger asChild>
				<Button
					size='icon-md'
					variant='secondary'
					className={cn(
						'gap-2 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800',
						currentLayoutConfig && 'text-teal-400'
					)}
				>
					<LayoutDashboard className='size-4' />

					{currentLayoutConfig && (
						<div className='size-2 rounded-full bg-teal-400' />
					)}
				</Button>
			</PopoverTrigger>

			<PopoverContent
				align='start'
				className='w-80 p-0 bg-zinc-950 border-zinc-800'
			>
				<div className='p-4 border-b border-zinc-800'>
					<div className='flex items-center justify-between'>
						<h3 className='font-medium text-zinc-200'>Layout Algorithms</h3>

						<Button
							className={cn('size-8 p-0', showSettings && 'bg-zinc-800')}
							onClick={() => setShowSettings(!showSettings)}
							size='sm'
							variant='ghost'
						>
							<Settings className='size-4' />
						</Button>
					</div>

					<p className='text-xs text-zinc-500 mt-1'>
						Choose how to arrange your nodes
					</p>
				</div>

				<div className='max-h-80 overflow-y-auto'>
					{Object.entries(categorizedPresets).map(
						([category, categoryPresets]) => (
							<div className='p-2' key={category}>
								<div className='flex items-center gap-2 mb-2 px-2'>
									<div
										className={cn(
											'size-3 rounded',
											layoutCategories[
												category as keyof typeof layoutCategories
											]?.color
										)}
									/>

									<span className='text-xs font-medium text-zinc-400 uppercase tracking-wide'>
										{layoutCategories[category as keyof typeof layoutCategories]
											?.name || category}
									</span>
								</div>

								<div className='space-y-1'>
									{categoryPresets.map((preset) => {
										const Icon = layoutIcons[preset.id] || Network;
										const isSelected = selectedPreset === preset.id;
										const isCurrent =
											currentLayoutConfig?.algorithm ===
											preset.config.algorithm;

										return (
											<motion.button
												disabled={preset.disabled}
												key={preset.id}
												onClick={() => handlePresetSelect(preset)}
												whileHover={{ scale: 1.02 }}
												whileTap={{ scale: 0.98 }}
												className={cn(
													'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all',
													'hover:bg-zinc-800 border border-transparent disabled:opacity-50',
													isSelected && 'bg-zinc-800 border-teal-500/50',
													isCurrent && !isSelected && 'bg-zinc-800/50'
												)}
											>
												<div
													className={cn(
														'size-8 rounded-md flex items-center justify-center',
														isSelected ? 'bg-teal-600' : 'bg-zinc-700'
													)}
												>
													<Icon className='size-4 text-white' />
												</div>

												<div className='flex-1 min-w-0'>
													<div className='font-medium text-zinc-200 text-sm'>
														{preset.name}
													</div>

													<div className='text-xs text-zinc-500 truncate'>
														{preset.description}
													</div>
												</div>

												{isCurrent && (
													<div className='size-2 rounded-full bg-teal-400' />
												)}
											</motion.button>
										);
									})}
								</div>
							</div>
						)
					)}
				</div>

				<AnimatePresence>
					{showSettings && currentConfig && (
						<motion.div
							animate={{ height: 'auto', opacity: 1 }}
							exit={{ height: 0, opacity: 0 }}
							initial={{ height: 0, opacity: 0 }}
							transition={{ duration: 0.2 }}
						>
							<LayoutConfigPanel
								config={currentConfig}
								onConfigChange={handleConfigChange}
							/>
						</motion.div>
					)}
				</AnimatePresence>
			</PopoverContent>
		</Popover>
	);
};

export const LayoutSelector = memo(LayoutSelectorComponent);
LayoutSelector.displayName = 'LayoutSelector';
