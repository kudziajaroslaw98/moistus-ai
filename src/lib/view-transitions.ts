const isViewTransitionEnabled = (): boolean =>
	process.env.NEXT_PUBLIC_ENABLE_VIEW_TRANSITIONS === 'true';

export const runWithViewTransition = (update: () => void | Promise<void>) => {
	if (!isViewTransitionEnabled()) {
		void update();
		return;
	}

	if (typeof document.startViewTransition !== 'function') {
		void update();
		return;
	}

	document.startViewTransition(() => update());
};
