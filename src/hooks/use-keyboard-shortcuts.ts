import useAppStore from '@/store/mind-map-store';
import { useEffect } from 'react';

interface UseKeyboardShortcutsProps {
	onCopy: () => void;
	onPaste: () => void;
	selectedNodeId: string | null | undefined;
	selectedEdgeId: string | null | undefined;
	isBusy: boolean;
	onGroup?: () => void;
	onUngroup?: () => void;
	onToggleCollapse?: () => void;
	onLayout?: () => void;
}

export function useKeyboardShortcuts({
	onCopy,
	onPaste,
	selectedNodeId,
	selectedEdgeId,
	isBusy,
	onGroup,
	onUngroup,
	onToggleCollapse,
	onLayout,
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

			// Ctrl/Cmd + L: Apply auto layout
			if (isCtrlCmd && event.key.toLowerCase() === 'l') {
				event.preventDefault();

				if (onLayout) {
					onLayout();
				}

				return;
			}
		};

		window.addEventListener('keydown', handleKeyDown);

		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, [
		onCopy,
		onPaste,
		selectedNodeId,
		selectedEdgeId,
		isBusy,
		reactFlowInstance,
		onLayout,
		copySelectedNodes,
		pasteNodes,
		onGroup,
		onUngroup,
		onToggleCollapse,
	]);
}
