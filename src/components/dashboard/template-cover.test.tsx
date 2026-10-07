import { render } from '@testing-library/react';
import { FileText } from 'lucide-react';
import {
	TEMPLATE_COVER_ECHOES,
	TemplateCover,
	getEchoTransform,
} from './template-cover';

describe('getEchoTransform', () => {
	it('sinks the icon and trails echoes up and right', () => {
		expect(getEchoTransform(185, { dx: 0, dy: 0 })).toBe(
			'translate(185 24) scale(4.6)'
		);
		expect(getEchoTransform(185, { dx: 30, dy: -22 })).toBe(
			'translate(215 2) scale(4.6)'
		);
	});
});

describe('TemplateCover', () => {
	it('draws one icon per echo, back to front', () => {
		const { container } = render(
			<TemplateCover icon={FileText} seed='t1' title='Plan' />
		);
		const groups = container.querySelectorAll('g[transform]');
		expect(groups).toHaveLength(TEMPLATE_COVER_ECHOES.length);
		expect(groups[3].getAttribute('transform')).toBe(
			'translate(185 24) scale(4.6)'
		);
	});

	it('crops tighter and shifts the icon left when compact', () => {
		const { container } = render(
			<TemplateCover compact icon={FileText} seed='t1' title='Plan' />
		);
		expect(container.querySelector('svg')?.getAttribute('viewBox')).toBe(
			'100 4 170 112'
		);
		expect(container.querySelectorAll('g[transform]')[3].getAttribute('transform')).toBe(
			'translate(150 24) scale(4.6)'
		);
	});
});
