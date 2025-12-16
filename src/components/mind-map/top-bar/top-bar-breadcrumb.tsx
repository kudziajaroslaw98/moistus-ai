'use client';

import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Slash } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface TopBarBreadcrumbProps {
	title?: string;
	isMobile: boolean;
}

export function TopBarBreadcrumb({ title, isMobile }: TopBarBreadcrumbProps) {
	return (
		<Breadcrumb>
			<BreadcrumbList>
				<BreadcrumbItem>
					<BreadcrumbLink asChild>
						<Link href='/dashboard'>
							<Image
								alt='Moistus Logo'
								height={isMobile ? 40 : 60}
								src='/images/moistus.svg'
								width={isMobile ? 40 : 60}
							/>
						</Link>
					</BreadcrumbLink>
				</BreadcrumbItem>

				<BreadcrumbSeparator>
					<Slash className={isMobile ? 'size-3' : 'size-4'} />
				</BreadcrumbSeparator>

				<BreadcrumbItem>
					<BreadcrumbPage
						className={`capitalize ${isMobile ? 'text-sm max-w-[120px] truncate' : ''}`}
					>
						{title || 'Loading...'}
					</BreadcrumbPage>
				</BreadcrumbItem>
			</BreadcrumbList>
		</Breadcrumb>
	);
}
