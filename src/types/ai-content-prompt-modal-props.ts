export interface AiContentPromptModalProps {
	isOpen: boolean;
	onClose: () => void;
	onGenerate: (prompt: string) => void;
	isLoading: boolean;
}
