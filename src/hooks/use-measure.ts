import { useEffect, useRef, useState } from 'react';

interface Dimensions {
	width: number;
	height: number;
}

export function useMeasure<T extends HTMLElement = HTMLDivElement>() {
	const ref = useRef<T>(null);
	const [bounds, setBounds] = useState<Dimensions>({ width: 0, height: 0 });

	useEffect(() => {
		if (!ref.current) return;

		const observer = new ResizeObserver(([entry]) => {
			if (entry) {
				setBounds({
					width: entry.contentRect.width,
					height: entry.contentRect.height,
				});
			}
		});

		observer.observe(ref.current);

		return () => {
			observer.disconnect();
		};
	}, []);

	return [ref, bounds] as const;
}
