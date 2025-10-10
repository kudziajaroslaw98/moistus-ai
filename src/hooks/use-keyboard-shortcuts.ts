import useAppStore from '@/store/mind-map-store';
import { useEffect } from 'react';

interface UseKeyboardShortcutsProps {
	onUndo: () => void;
	onRedo: () => void;
	onAddChild: (parentId: string | null) => void;
	onCopy: () => void;
	onPaste: () => void;
	selectedNodeId: string | null | undefined;
	selectedEdgeId: string | null | undefined;
	canUndo: boolean;
	canRedo: boolean;
	isBusy: boolean;
	onGroup?: () => void;
	onUngroup?: () => void;
	onToggleCollapse?: () => void;
}

export function useKeyboardShortcuts({
	onUndo,
	onRedo,
	onAddChild,
	onCopy,
	onPaste,
	selectedNodeId,
	selectedEdgeId,
	canUndo,
	canRedo,
	isBusy,
	onGroup,
	onUngroup,
	onToggleCollapse,
}: UseKeyboardShortcutsProps): void {
	const reactFlowInstance = useAppStore((state) => state.reactFlowInstance);
	const copySelectedNodes = useAppStore((state) => state.copySelectedNodes);
	const pasteNodes = useAppStore((state) => state.pasteNodes);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			const target = event.target as HTMLElement;
			const isInputFocused =
				target.tagName === 'INPUT' ||
				target.tagName === 'TEXTAREA' ||
				target.isContentEditable ||
				target.closest('.ql-editor');

			if (
				isInputFocused &&
				(event.key === 'c' || event.key === 'v') &&
				(event.ctrlKey || event.metaKey)
			) {
				return;
			}

			if (isBusy) {
				return;
			}

			const isCtrlCmd = event.ctrlKey || event.metaKey;

			if (isCtrlCmd && event.key.toLowerCase() === 'z' && !event.shiftKey) {
				event.preventDefault();

				if (canUndo) {
					onUndo();
				}

				return;
			}

			if (
				(isCtrlCmd && event.shiftKey && event.key.toLowerCase() === 'z') ||
				(isCtrlCmd && event.key.toLowerCase() === 'y')
			) {
				event.preventDefault();

				if (canRedo) {
					onRedo();
				}

				return;
			}

			if (isCtrlCmd && event.key.toLowerCase() === 'c') {
				event.preventDefault();
				copySelectedNodes();
				return;
			}

			if (isCtrlCmd && event.key.toLowerCase() === 'v') {
				event.preventDefault();
				pasteNodes();
				return;
			}

			if (event.key === 'Tab' && selectedNodeId) {
				event.preventDefault();
				onAddChild(selectedNodeId);
				return;
			}

			if (isCtrlCmd && event.key.toLowerCase() === 'g' && !event.shiftKey) {
				event.preventDefault();

				if (onGroup) {
					onGroup();
				}

				return;
			}

			if (isCtrlCmd && event.shiftKey && event.key.toLowerCase() === 'g') {
				event.preventDefault();

				if (onUngroup) {
					onUngroup();
				}

				return;
			}

			if (
				isCtrlCmd &&
				(event.key === '-' || event.key === '+') &&
				selectedNodeId
			) {
				event.preventDefault();

				if (onToggleCollapse) {
					onToggleCollapse();
				}

				return;
			}
		};

		window.addEventListener('keydown', handleKeyDown);

		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, [
		onUndo,
		onRedo,
		onAddChild,
		onCopy,
		onPaste,
		selectedNodeId,
		selectedEdgeId,
		canUndo,
		canRedo,
		isBusy,
		reactFlowInstance,
	]);
}
