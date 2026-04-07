import { useEffect, useState } from 'react';

type NavigatorWithUserAgentData = Navigator & {
	userAgentData?: {
		platform?: string;
	};
};

function detectIsMacPlatform(): boolean {
	if (typeof navigator === 'undefined') {
		return false;
	}

	const typedNavigator = navigator as NavigatorWithUserAgentData;
	const platform = typedNavigator.userAgentData?.platform ?? navigator.platform ?? '';

	return /mac/i.test(platform);
}

export function useIsMac(): boolean {
	const [isMac, setIsMac] = useState(false);

	useEffect(() => {
		setIsMac(detectIsMacPlatform());
	}, []);

	return isMac;
}
