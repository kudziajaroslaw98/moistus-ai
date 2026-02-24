import { ClientProviders } from '@/components/providers/client-providers';
import type { Metadata } from 'next';
import { Geist, Geist_Mono, Lora } from 'next/font/google';
import { CSSProperties, ReactNode } from 'react';
import { Toaster } from 'sonner';
import './globals.css';

const geistSans = Geist({
	variable: '--font-geist-sans',
	subsets: ['latin'],
});

const geistMono = Geist_Mono({
	variable: '--font-geist-mono',
	subsets: ['latin'],
});

const lora = Lora({
	variable: '--font-lora',
	subsets: ['latin'],
});

const toasterStyle = {
	'--width': 'min(18rem, calc(100vw - 1.5rem))',
} as CSSProperties;

export const metadata: Metadata = {
	metadataBase: new URL('https://shiko.app'),
	title: 'Shiko',
	description: 'AI-powered mind mapping and information organization',
};

export default function RootLayout({
	children,
}: Readonly<{
	children: ReactNode;
}>) {
	return (
		<html
			className='box-border flex h-auto min-h-full w-full'
			lang='en'
			suppressHydrationWarning={true}
		>
			<body
				className={`${geistSans.variable} ${geistMono.variable} ${lora.variable} dark h-auto min-h-full w-full bg-zinc-950`}
				suppressHydrationWarning={true}
			>
				<script type='application/ld+json'>
					{JSON.stringify({
						'@context': 'https://schema.org',
						'@graph': [
							{
								'@type': 'WebSite',
								name: 'Shiko',
								url: 'https://shiko.app',
								description:
									'AI-powered mind mapping and information organization',
							},
							{
								'@type': 'Organization',
								name: 'Shiko',
								url: 'https://shiko.app',
								logo: 'https://shiko.app/favicon.ico',
							},
						],
					})}
				</script>
				<ClientProviders>
					<div className='flex h-full w-full flex-col rounded-xl bg-zinc-900 text-zinc-100'>
						{children}
					</div>
				</ClientProviders>

				<Toaster
					closeButton
					richColors
					position='bottom-right'
					theme='dark'
					className='app-toaster'
					style={toasterStyle}
					offset={{
						bottom: 'var(--toast-offset-bottom)',
						right: 'var(--toast-offset-inline)',
					}}
					mobileOffset={{
						bottom: 'var(--toast-offset-bottom-mobile)',
						left: 'var(--toast-offset-inline)',
						right: 'var(--toast-offset-inline)',
					}}
					toastOptions={{
						classNames: {
								toast:
									'!rounded-lg !px-3 !py-2.5 !gap-2 !text-xs',
								title: '!text-xs !leading-4 !font-medium',
								description: '!text-[11px] !leading-4',
								actionButton:
									'!h-6 !px-2 !text-[11px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900',
								cancelButton:
									'!h-6 !px-2 !text-[11px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900',
								closeButton:
									'!size-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900',
							},
						}}
					/>
			</body>
		</html>
	);
}
