import { ClientProviders } from '@/components/providers/client-providers';
import type { Metadata } from 'next';
import { Geist, Geist_Mono, Lora } from 'next/font/google';
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

export const metadata: Metadata = {
	title: 'Mind Map AI App',
	description: 'AI-powered mind mapping and information organization',
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html
			lang='en'
			className='box-border flex h-full w-full'
			suppressHydrationWarning={true}
		>
			<body
				className={`${geistSans.variable} ${geistMono.variable} ${lora.variable} dark h-full w-full bg-zinc-950 antialiased`}
				suppressHydrationWarning={true}
			>
				<ClientProviders>
					<div className='flex h-full w-full flex-col rounded-xl bg-zinc-900 text-zinc-100'>
						{children}
					</div>
				</ClientProviders>

				<Toaster
					theme='dark'
					position='bottom-right'
					richColors
					closeButton
					toastOptions={{
						classNames: {
							toast: 'toast',
							title: 'title',
							description: 'description',
							actionButton: 'action-button',
							cancelButton: 'cancel-button',
							closeButton: 'close-button',
						},
					}}
				/>
			</body>
		</html>
	);
}
