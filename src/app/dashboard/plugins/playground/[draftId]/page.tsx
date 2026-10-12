import { PlaygroundPage } from '@/components/plugins/playground/playground-page';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Plugin playground · Shiko' };

export default async function PluginPlaygroundPage({
	params,
}: {
	params: Promise<{ draftId: string }>;
}) {
	const { draftId } = await params;
	return <PlaygroundPage draftId={draftId} />;
}
