const mockHydrate = jest.fn();
jest.mock('@/store/mind-map-store', () => ({
	__esModule: true,
	default: (selector: (state: { hydrateSubscriptionState: jest.Mock }) => unknown) =>
		selector({ hydrateSubscriptionState: mockHydrate }),
}));

import type { SubscriptionHydrationState } from '@/helpers/subscription/subscription-hydration';
import { render } from '@testing-library/react';
import { SubscriptionStateHydrator } from './subscription-hydration-provider';

const FREE: SubscriptionHydrationState = {
	currentSubscription: null,
	hasResolvedSubscription: true,
};

beforeEach(() => mockHydrate.mockClear());

describe('SubscriptionStateHydrator', () => {
	it('copies a streamed snapshot into the store once, and again only when it changes', () => {
		const view = render(<SubscriptionStateHydrator subscriptionState={FREE} />);

		expect(view.container).toBeEmptyDOMElement();
		expect(mockHydrate).toHaveBeenCalledTimes(1);
		expect(mockHydrate).toHaveBeenCalledWith(FREE, JSON.stringify(FREE));

		// Same content in a new object (a re-render of the layout): nothing to do.
		view.rerender(<SubscriptionStateHydrator subscriptionState={{ ...FREE }} />);
		expect(mockHydrate).toHaveBeenCalledTimes(1);

		const unresolved = { ...FREE, hasResolvedSubscription: false };
		view.rerender(<SubscriptionStateHydrator subscriptionState={unresolved} />);
		expect(mockHydrate).toHaveBeenCalledTimes(2);
		expect(mockHydrate).toHaveBeenLastCalledWith(unresolved, JSON.stringify(unresolved));
	});
});
