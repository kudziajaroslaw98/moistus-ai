'use client';

import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
	LANGUAGE_ICONS,
	getLanguageIcon,
} from '@/components/nodes/content/code-syntax-theme';
import { GlassmorphismTheme } from '../themes/glassmorphism-theme';

export interface LanguagePickerProps {
	language: string;
	onLanguageChange: (lang: string) => void;
	disabled?: boolean;
}

const LANGUAGES = Object.keys(LANGUAGE_ICONS);

export const LanguagePicker = ({
	language,
	onLanguageChange,
	disabled = false,
}: LanguagePickerProps) => {
	const theme = GlassmorphismTheme;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				disabled={disabled}
				render={
					<Button
						className="h-8 px-2 gap-1.5"
						disabled={disabled}
						size="sm"
						variant="outline"
						style={{
							backgroundColor: 'transparent',
							border: `1px solid ${theme.borders.hover}`,
							color: theme.text.medium,
						}}
						title="Change language"
					>
						<span className="text-sm">{getLanguageIcon(language)}</span>
						<span className="text-xs capitalize">{language}</span>
					</Button>
				}
			/>
			<DropdownMenuContent align="center">
				<DropdownMenuRadioGroup
					value={language}
					onValueChange={onLanguageChange}
				>
					{LANGUAGES.map((lang) => (
						<DropdownMenuRadioItem key={lang} value={lang}>
							<span className="mr-2">{LANGUAGE_ICONS[lang]}</span>
							<span className="capitalize">{lang}</span>
						</DropdownMenuRadioItem>
					))}
				</DropdownMenuRadioGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
};
