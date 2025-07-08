export interface ToastStep {
	id: string;
	name: string;
	status: 'pending' | 'active' | 'completed' | 'error';
}

export interface StreamingToastState {
	toastId: string | number | null; // The ID from the sonner library
	isOpen: boolean;
	header: string;
	message: string;
	step: number;
	totalSteps: number;
	error: string | null;
	steps: ToastStep[];
}
