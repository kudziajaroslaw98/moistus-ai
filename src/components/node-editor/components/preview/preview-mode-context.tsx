'use client';

import { createContext, ReactNode, useContext } from 'react';

/**
 * Preview Mode Context
 *
 * Signals to child components that they're rendering in preview mode.
 * Components can use useIsPreviewMode() to conditionally disable
 * interactive features like click handlers and hover states.
 */
const PreviewModeContext = createContext<boolean>(false);

export const PreviewModeProvider = ({ children }: { children: ReactNode }) => (
	<PreviewModeContext.Provider value={true}>
		{children}
	</PreviewModeContext.Provider>
);

export const useIsPreviewMode = () => useContext(PreviewModeContext);
