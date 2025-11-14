/**
 * Shared Toolbar Controls
 * 
 * Reusable controls for node toolbars, ensuring consistent behavior and styling.
 * Extracted from various node implementations for better code reuse.
 */

'use client';

import {
	AlignCenter,
	AlignLeft,
	AlignRight,
	Bold,
	Copy,
	Edit3,
	Italic,
	Maximize2,
	Minimize2,
	Settings,
	Trash2,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Button } from '../../ui/button';
import { Toggle } from '../../ui/toggle';
import { ToggleGroup, ToggleGroupItem } from '../../ui/toggle-group';
import { GlassmorphismTheme } from '../themes/glassmorphism-theme';

// Text formatting controls
export interface TextFormattingProps {
	isBold?: boolean;
	onBoldToggle?: (bold: boolean) => void;
	isItalic?: boolean;
	onItalicToggle?: (italic: boolean) => void;
	alignment?: 'left' | 'center' | 'right';
	onAlignmentChange?: (alignment: 'left' | 'center' | 'right') => void;
}

export const TextFormattingControls = ({
	isBold = false,
	onBoldToggle,
	isItalic = false,
	onItalicToggle,
	alignment = 'center',
	onAlignmentChange,
}: TextFormattingProps) => {
	const theme = GlassmorphismTheme;

	const controlStyle = {
		backgroundColor: 'transparent',
		border: `1px solid ${theme.borders.hover}`,
		color: theme.text.high,
	};

	const activeStyle = {
		backgroundColor: 'rgba(96, 165, 250, 0.2)',
		border: `1px solid ${theme.borders.accent}`,
		color: theme.text.high,
	};

	return (
		<>
			{/* Bold Toggle */}
			{onBoldToggle && (
				<Toggle
					className="h-8 w-8 p-0"
					onPressedChange={onBoldToggle}
					pressed={isBold}
					size="sm"
					style={isBold ? activeStyle : controlStyle}
					variant="outline"
				>
					<Bold className="w-4 h-4" />
				</Toggle>
			)}

			{/* Italic Toggle */}
			{onItalicToggle && (
				<Toggle
					className="h-8 w-8 p-0"
					onPressedChange={onItalicToggle}
					pressed={isItalic}
					size="sm"
					style={isItalic ? activeStyle : controlStyle}
					variant="outline"
				>
					<Italic className="w-4 h-4" />
				</Toggle>
			)}

			{/* Alignment Controls */}
			{onAlignmentChange && (
				<>
					<div 
						className="w-[1px] h-8 mx-1" 
						style={{ backgroundColor: theme.borders.default }} 
					/>
					
					<ToggleGroup
						className="gap-0"
						size="sm"
						type="single"
						value={alignment}
						variant="outline"
						onValueChange={(value) => {
							if (value) onAlignmentChange(value as 'left' | 'center' | 'right');
						}}
					>
						<ToggleGroupItem 
							className="h-8 w-8 p-0 rounded-r-none" 
							style={alignment === 'left' ? activeStyle : controlStyle}
							value="left"
						>
							<AlignLeft className="w-4 h-4" />
						</ToggleGroupItem>
						
						<ToggleGroupItem 
							className="h-8 w-8 p-0 rounded-none border-x-0" 
							value="center"
							style={{
								...alignment === 'center' ? activeStyle : controlStyle,
								borderLeft: 'none',
								borderRight: 'none',
							}}
						>
							<AlignCenter className="w-4 h-4" />
						</ToggleGroupItem>
						
						<ToggleGroupItem 
							className="h-8 w-8 p-0 rounded-l-none" 
							style={alignment === 'right' ? activeStyle : controlStyle}
							value="right"
						>
							<AlignRight className="w-4 h-4" />
						</ToggleGroupItem>
					</ToggleGroup>
				</>
			)}
		</>
	);
};

// Common node action controls
export interface NodeActionProps {
	onEdit?: () => void;
	onCopy?: () => void;
	onDelete?: () => void;
	onSettings?: () => void;
	showEdit?: boolean;
	showCopy?: boolean;
	showDelete?: boolean;
	showSettings?: boolean;
}

export const NodeActionControls = ({
	onEdit,
	onCopy,
	onDelete,
	onSettings,
	showEdit = false,
	showCopy = false,
	showDelete = false,
	showSettings = true,
}: NodeActionProps) => {
	const theme = GlassmorphismTheme;

	const buttonStyle = {
		backgroundColor: 'transparent',
		border: `1px solid ${theme.borders.hover}`,
		color: theme.text.medium,
	};

	return (
		<>
			{showEdit && onEdit && (
				<Button
					className="h-8 w-8 p-0"
					onClick={onEdit}
					size="sm"
					style={buttonStyle}
					title="Edit content"
					variant="outline"
				>
					<Edit3 className="w-4 h-4" />
				</Button>
			)}

			{showCopy && onCopy && (
				<Button
					className="h-8 w-8 p-0"
					onClick={onCopy}
					size="sm"
					style={buttonStyle}
					title="Copy node"
					variant="outline"
				>
					<Copy className="w-4 h-4" />
				</Button>
			)}

			{showDelete && onDelete && (
				<Button
					className="h-8 w-8 p-0"
					onClick={onDelete}
					size="sm"
					title="Delete node"
					variant="outline"
					style={{
						...buttonStyle,
						color: 'rgba(239, 68, 68, 0.87)',
						borderColor: 'rgba(239, 68, 68, 0.3)',
					}}
				>
					<Trash2 className="w-4 h-4" />
				</Button>
			)}

			{showSettings && onSettings && (
				<Button
					className="h-8 w-8 p-0"
					onClick={onSettings}
					size="sm"
					style={buttonStyle}
					title="Node settings"
					variant="outline"
				>
					<Settings className="w-4 h-4" />
				</Button>
			)}
		</>
	);
};

// Expand/collapse control for content
export interface ExpandControlProps {
	isExpanded: boolean;
	onToggle: (expanded: boolean) => void;
	canExpand: boolean;
}

export const ExpandControl = ({
	isExpanded,
	onToggle,
	canExpand,
}: ExpandControlProps) => {
	const theme = GlassmorphismTheme;

	if (!canExpand) return null;

	return (
		<Button
			className="h-8 w-8 p-0"
			onClick={() => onToggle(!isExpanded)}
			size="sm"
			title={isExpanded ? 'Collapse' : 'Expand'}
			variant="outline"
			style={{
				backgroundColor: 'transparent',
				border: `1px solid ${theme.borders.hover}`,
				color: theme.text.medium,
			}}
		>
			{isExpanded ? (
				<Minimize2 className="w-4 h-4" />
			) : (
				<Maximize2 className="w-4 h-4" />
			)}
		</Button>
	);
};

// Animated copy feedback
export interface CopyFeedbackProps {
	copied: boolean;
}

export const CopyFeedback = ({ copied }: CopyFeedbackProps) => {
	const theme = GlassmorphismTheme;

	return (
		<AnimatePresence mode="wait">
			{copied ? (
				<motion.div
					animate={{ scale: 1, rotate: 0 }}
					exit={{ scale: 0, rotate: 180 }}
					initial={{ scale: 0, rotate: -180 }}
					key="check"
					transition={{ type: 'spring', stiffness: 400 }}
					style={{
						width: '16px',
						height: '16px',
						borderRadius: '50%',
						backgroundColor: 'rgba(52, 211, 153, 0.2)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
					}}
				>
					<div
						style={{
							width: '8px',
							height: '5px',
							border: `2px solid rgba(52, 211, 153, 0.87)`,
							borderTop: 'none',
							borderRight: 'none',
							transform: 'rotate(-45deg)',
						}}
					/>
				</motion.div>
			) : (
				<motion.div
					animate={{ scale: 1, rotate: 0 }}
					exit={{ scale: 0, rotate: -180 }}
					initial={{ scale: 0, rotate: 180 }}
					key="copy"
					transition={{ type: 'spring', stiffness: 400 }}
				>
					<Copy className="w-4 h-4" style={{ color: theme.text.medium }} />
				</motion.div>
			)}
		</AnimatePresence>
	);
};

// Separator for toolbar sections
export const ToolbarSeparator = () => {
	const theme = GlassmorphismTheme;
	
	return (
		<div 
			className="w-[1px] h-8 mx-1" 
			style={{ backgroundColor: theme.borders.default }} 
		/>
	);
};

const ToolbarControls = {
	TextFormattingControls,
	NodeActionControls,
	ExpandControl,
	CopyFeedback,
	ToolbarSeparator,
};

export default ToolbarControls;
