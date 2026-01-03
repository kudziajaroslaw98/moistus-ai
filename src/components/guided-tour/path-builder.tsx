'use client';

/**
 * Path Builder Component
 *
 * UI for creating custom tour paths by clicking nodes.
 * Shows numbered badges on nodes in the pending path.
 */

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import useAppStore from '@/store/mind-map-store';
import { cn } from '@/utils/cn';
import { X, Check, Trash2, Play, GripVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { memo, useState, useCallback } from 'react';
import { useShallow } from 'zustand/shallow';

interface PathBuilderProps {
	className?: string;
}

export const PathBuilder = memo(function PathBuilder({
	className,
}: PathBuilderProps) {
	const [pathName, setPathName] = useState('');

	const {
		isPathEditMode,
		pendingPath,
		savedPaths,
		nodes,
		exitPathEditMode,
		clearPendingPath,
		removeNodeFromPath,
		savePath,
		deletePath,
		startTour,
		enterPathEditMode,
	} = useAppStore(
		useShallow((state) => ({
			isPathEditMode: state.isPathEditMode,
			pendingPath: state.pendingPath,
			savedPaths: state.savedPaths,
			nodes: state.nodes,
			exitPathEditMode: state.exitPathEditMode,
			clearPendingPath: state.clearPendingPath,
			removeNodeFromPath: state.removeNodeFromPath,
			savePath: state.savePath,
			deletePath: state.deletePath,
			startTour: state.startTour,
			enterPathEditMode: state.enterPathEditMode,
		}))
	);

	// Get node title by ID
	const getNodeTitle = useCallback(
		(nodeId: string): string => {
			const node = nodes.find((n) => n.id === nodeId);
			if (!node) return 'Unknown';
			if (node.data?.metadata?.title) return String(node.data.metadata.title);
			if (node.data?.content) {
				const firstLine = node.data.content.split('\n')[0];
				return firstLine.length > 30 ? firstLine.slice(0, 30) + '...' : firstLine;
			}
			return 'Untitled';
		},
		[nodes]
	);

	// Handle save
	const handleSave = useCallback(() => {
		if (pendingPath.length === 0) return;
		savePath(pathName || 'Custom Path');
		setPathName('');
	}, [pendingPath, pathName, savePath]);

	// Handle cancel
	const handleCancel = useCallback(() => {
		clearPendingPath();
		exitPathEditMode();
		setPathName('');
	}, [clearPendingPath, exitPathEditMode]);

	// Handle start tour with saved path
	const handleStartTour = useCallback(
		(pathId: string) => {
			startTour({ savedPathId: pathId });
		},
		[startTour]
	);

	if (!isPathEditMode && savedPaths.length === 0) {
		return null;
	}

	return (
		<AnimatePresence>
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				exit={{ opacity: 0, y: 20 }}
				transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
				className={cn(
					'absolute bottom-20 left-4 z-50',
					'w-72 max-h-96',
					'bg-zinc-900/90 backdrop-blur-md',
					'border border-white/10 rounded-lg',
					'shadow-xl',
					className
				)}
			>
				{/* Header */}
				<div className="px-4 py-3 border-b border-white/10">
					<h3 className="text-white font-medium text-sm">
						{isPathEditMode ? 'Create Tour Path' : 'Tour Paths'}
					</h3>
					{isPathEditMode && (
						<p className="text-white/60 text-xs mt-1">
							Click nodes in order to build your path
						</p>
					)}
				</div>

				{/* Content */}
				<div className="p-3 max-h-64 overflow-y-auto">
					{isPathEditMode ? (
						<>
							{/* Pending path list */}
							{pendingPath.length > 0 ? (
								<div className="space-y-1.5 mb-3">
									{pendingPath.map((nodeId, index) => (
										<motion.div
											key={nodeId}
											initial={{ opacity: 0, x: -10 }}
											animate={{ opacity: 1, x: 0 }}
											className={cn(
												'flex items-center gap-2',
												'px-2 py-1.5 rounded',
												'bg-white/5 hover:bg-white/10',
												'group'
											)}
										>
											<GripVertical className="size-3 text-white/30" />
											<span className="text-white/80 text-xs font-mono w-5">
												{index + 1}.
											</span>
											<span className="text-white text-sm flex-1 truncate">
												{getNodeTitle(nodeId)}
											</span>
											<button
												onClick={() => removeNodeFromPath(nodeId)}
												className="opacity-0 group-hover:opacity-100 text-white/60 hover:text-red-400 transition-opacity"
											>
												<X className="size-3" />
											</button>
										</motion.div>
									))}
								</div>
							) : (
								<p className="text-white/40 text-sm text-center py-4">
									No nodes selected yet
								</p>
							)}

							{/* Path name input */}
							{pendingPath.length > 0 && (
								<Input
									value={pathName}
									onChange={(e) => setPathName(e.target.value)}
									placeholder="Path name (optional)"
									className="mb-3 bg-white/5 border-white/10 text-white text-sm"
								/>
							)}
						</>
					) : (
						/* Saved paths list */
						<div className="space-y-1.5">
							{savedPaths.map((path) => (
								<div
									key={path.id}
									className={cn(
										'flex items-center gap-2',
										'px-2 py-2 rounded',
										'bg-white/5 hover:bg-white/10',
										'group'
									)}
								>
									<span className="text-white text-sm flex-1 truncate">
										{path.name}
									</span>
									<span className="text-white/40 text-xs">
										{path.nodeIds.length} stops
									</span>
									<button
										onClick={() => handleStartTour(path.id)}
										className="p-1 text-white/60 hover:text-green-400 transition-colors"
										title="Start tour"
									>
										<Play className="size-3" />
									</button>
									<button
										onClick={() => deletePath(path.id)}
										className="p-1 opacity-0 group-hover:opacity-100 text-white/60 hover:text-red-400 transition-all"
										title="Delete path"
									>
										<Trash2 className="size-3" />
									</button>
								</div>
							))}
						</div>
					)}
				</div>

				{/* Footer actions */}
				<div className="px-3 py-2 border-t border-white/10 flex items-center gap-2">
					{isPathEditMode ? (
						<>
							<Button
								size="sm"
								variant="ghost"
								onClick={handleCancel}
								className="text-white/60 hover:text-white hover:bg-white/10 flex-1"
							>
								Cancel
							</Button>
							<Button
								size="sm"
								onClick={handleSave}
								disabled={pendingPath.length === 0}
								className="bg-white/10 hover:bg-white/20 text-white flex-1"
							>
								<Check className="size-3 mr-1" />
								Save Path
							</Button>
						</>
					) : (
						<Button
							size="sm"
							onClick={enterPathEditMode}
							className="bg-white/10 hover:bg-white/20 text-white w-full"
						>
							+ Create New Path
						</Button>
					)}
				</div>
			</motion.div>
		</AnimatePresence>
	);
});
