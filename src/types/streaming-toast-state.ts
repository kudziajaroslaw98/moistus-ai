export interface StreamingToastState {
	toastId: string | number | null; // The ID from the sonner library
	isOpen: boolean;
	header: string;
	message: string;
	step: number;
	totalSteps: number;
	error: string | null;
}
